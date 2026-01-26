// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";

interface IMockOracle {
    function assertTruth(bool outcome, address asserter, address callback, uint256 liveness, uint256 bond, string[] memory links) external returns (bytes32);
    function disputeAssertion(bytes32 id, address disputer, string[] memory links) external;
    function settleAssertion(bytes32 id) external;
    function getMinimumBond(address) external view returns (uint256);
}

contract PolypulseAMM is Ownable {
    IERC20 public token;
    IMockOracle public oracle;

    // --- AMM STATE ---
    uint256 public reserveYes;
    uint256 public reserveNo;
    mapping(address => uint256) public yesBalances;
    mapping(address => uint256) public noBalances;

    // --- MARKET INFO ---
    string public question;
    uint256 public deadline;
    bool public resolved;
    bool public cancelled;
    uint256 public winningOutcome; // 1 = YES, 2 = NO
    uint256 public feesCollected;

    // --- ORACLE STATE ---
    bytes32 public assertionId;
    uint256 public assertedOutcome; 
    bool public isDisputed;

    event Trade(address indexed user, string side, uint256 amountIn, uint256 amountOut);
    event MarketAsserted(bytes32 assertionId, uint256 outcome, string[] links);
    event MarketDisputed(bytes32 assertionId, address user, string[] links);
    event MarketResolved(uint256 outcome);
    event LiquidityAdded(address indexed provider, uint256 amount);
    event MarketCancelled(uint256 timestamp);
    event FeesWithdrawn(address indexed admin, uint256 amount);

    constructor(address _token, address _oracle, string memory _question, uint256 _duration) Ownable(msg.sender) {
        token = IERC20(_token);
        oracle = IMockOracle(_oracle);
        question = _question;
        deadline = block.timestamp + _duration;
    }

    // --- 1. ORACLE ASSERTION ---
    function assertMarket(bool outcomeIsYes, string[] memory links) external {
        require(block.timestamp >= deadline, "Not closed");
        require(assertionId == bytes32(0), "Active assertion");
        require(!resolved, "Resolved");

        uint256 bond = oracle.getMinimumBond(address(token));
        token.transferFrom(msg.sender, address(this), bond);
        token.approve(address(oracle), bond);

        assertionId = oracle.assertTruth(
            outcomeIsYes, 
            msg.sender, 
            address(this), 
            2 hours, // Timer
            bond, 
            links
        );
        assertedOutcome = outcomeIsYes ? 1 : 2;
        emit MarketAsserted(assertionId, assertedOutcome, links);
    }

    // --- 2. DISPUTE ---
    function disputeMarket(string[] memory links) external {
        require(assertionId != bytes32(0), "No assertion");
        require(!isDisputed, "Already disputed");
        require(!resolved, "Resolved");
        require(links.length > 0, "Evidence mandatory"); 

        uint256 bond = oracle.getMinimumBond(address(token));
        token.transferFrom(msg.sender, address(this), bond);
        token.approve(address(oracle), bond);

        oracle.disputeAssertion(assertionId, msg.sender, links);
        isDisputed = true; 
        
        emit MarketDisputed(assertionId, msg.sender, links);
    }

    // --- 3. SETTLE ---
    function settle() external {
        require(assertionId != bytes32(0), "No assertion");
        oracle.settleAssertion(assertionId);
    }

    // --- 4. CALLBACK ---
    function assertionResolvedCallback(bytes32 _id, bool validated) external {
        require(msg.sender == address(oracle), "Only Oracle");
        require(assertionId == _id, "Wrong ID");

        resolved = true;
        
        if (validated) {
            winningOutcome = assertedOutcome;
        } else {
            // If assertion rejected, the OPPOSITE outcome wins
            winningOutcome = (assertedOutcome == 1) ? 2 : 1; 
        }
        
        emit MarketResolved(winningOutcome);
    }

    // --- TRADING & CORE (Standard AMM) ---
    function addLiquidity(uint256 amount) external {
        require(!resolved, "Resolved");
        token.transferFrom(msg.sender, address(this), amount);
        reserveYes += amount;
        reserveNo += amount;
        emit LiquidityAdded(msg.sender, amount);
    }

    function buyYes(uint256 amount) external returns (uint256) { return _trade(true, amount); }
    function buyNo(uint256 amount) external returns (uint256) { return _trade(false, amount); }

    function _trade(bool isYes, uint256 usdtAmount) internal returns (uint256) {
        require(!resolved, "Resolved");
        require(block.timestamp < deadline, "Expired");
        
        uint256 fee = usdtAmount / 100;
        uint256 amountIn = usdtAmount - fee;
        feesCollected += fee;

        token.transferFrom(msg.sender, address(this), usdtAmount);
        
        uint256 sharesOut;
        if (isYes) {
            sharesOut = (amountIn * reserveYes) / (reserveNo + amountIn);
            require(sharesOut < reserveYes, "Low Liquidity");
            reserveNo += amountIn;
            reserveYes -= sharesOut; 
            yesBalances[msg.sender] += sharesOut;
            emit Trade(msg.sender, "BUY YES", usdtAmount, sharesOut);
        } else {
            sharesOut = (amountIn * reserveNo) / (reserveYes + amountIn);
            require(sharesOut < reserveNo, "Low Liquidity");
            reserveYes += amountIn;
            reserveNo -= sharesOut; 
            noBalances[msg.sender] += sharesOut;
            emit Trade(msg.sender, "BUY NO", usdtAmount, sharesOut);
        }
        return sharesOut;
    }

    function sellYes(uint256 amount) external { _sell(true, amount); }
    function sellNo(uint256 amount) external { _sell(false, amount); }

    function _sell(bool isYes, uint256 shareAmount) internal {
        require(!resolved, "Resolved");
        
        uint256 usdtOut;
        if (isYes) {
            require(yesBalances[msg.sender] >= shareAmount, "Bal");
            yesBalances[msg.sender] -= shareAmount;
            usdtOut = (shareAmount * reserveNo) / (reserveYes + shareAmount);
            reserveYes += shareAmount;
            reserveNo -= usdtOut;
        } else {
            require(noBalances[msg.sender] >= shareAmount, "Bal");
            noBalances[msg.sender] -= shareAmount;
            usdtOut = (shareAmount * reserveYes) / (reserveNo + shareAmount);
            reserveNo += shareAmount;
            reserveYes -= usdtOut;
        }
        
        uint256 fee = usdtOut / 100;
        uint256 payUser = usdtOut - fee;
        feesCollected += fee;
        token.transfer(msg.sender, payUser);
        emit Trade(msg.sender, isYes ? "SELL YES" : "SELL NO", shareAmount, payUser);
    }

    function claim() external {
        require(resolved, "Not resolved");
        uint256 payout = 0;
        if (cancelled) {
             payout += yesBalances[msg.sender];
             payout += noBalances[msg.sender];
             yesBalances[msg.sender] = 0;
             noBalances[msg.sender] = 0;
        } else if (winningOutcome == 1) {
            payout = yesBalances[msg.sender];
            yesBalances[msg.sender] = 0;
            noBalances[msg.sender] = 0;
        } else if (winningOutcome == 2) {
            payout = noBalances[msg.sender];
            noBalances[msg.sender] = 0;
            yesBalances[msg.sender] = 0;
        }
        if (payout > 0) token.transfer(msg.sender, payout);
    }

    function emergencyCancel() external onlyOwner {
        require(!resolved, "Resolved");
        resolved = true;
        cancelled = true;
        emit MarketCancelled(block.timestamp);
    }

    function withdrawFees() external onlyOwner {
        uint256 amount = feesCollected;
        feesCollected = 0;
        token.transfer(owner(), amount);
        emit FeesWithdrawn(owner(), amount);
    }

    function initializeLiquidity(uint256 amount) external {
        require(reserveYes == 0 && reserveNo == 0, "Init");
        require(token.balanceOf(address(this)) >= amount, "Funds");
        reserveYes = amount;
        reserveNo = amount;
        emit LiquidityAdded(msg.sender, amount);
    }

    // Explicitly track TVL 
    function getLiquidity() external view returns (uint256) {
        return token.balanceOf(address(this));
    }
}