// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

contract NativeMarket {
    IERC20 public collateralToken;
    address public oracle;
    string public question;
    bool public resolved;
    uint256 public winningOutcome; // 1 = YES, 2 = NO

    // Total Pool amounts
    uint256 public totalYes;
    uint256 public totalNo;

    // User Bets
    mapping(address => uint256) public yesBets;
    mapping(address => uint256) public noBets;

    constructor(address _collateralToken, address _oracle, string memory _question) {
        collateralToken = IERC20(_collateralToken);
        oracle = _oracle;
        question = _question;
    }

    // --- BETTING ---
    function buyYes(uint256 amount) external {
        require(!resolved, "Market already resolved");
        // Transfer funds from user to this contract
        collateralToken.transferFrom(msg.sender, address(this), amount);
        // Record the bet
        yesBets[msg.sender] += amount;
        totalYes += amount;
    }

    function buyNo(uint256 amount) external {
        require(!resolved, "Market already resolved");
        collateralToken.transferFrom(msg.sender, address(this), amount);
        noBets[msg.sender] += amount;
        totalNo += amount;
    }

    // --- RESOLUTION (Oracle Only) ---
    function resolve(uint256 _outcome) external {
        require(msg.sender == oracle, "Only Oracle");
        require(!resolved, "Already resolved");
        resolved = true;
        winningOutcome = _outcome;
    }

    // --- CLAIM WINNINGS ---
    function claim() external {
        require(resolved, "Not resolved yet");
        uint256 payout = 0;

        if (winningOutcome == 1) { // YES Won
            uint256 userShare = yesBets[msg.sender];
            require(userShare > 0, "No winning bets");
            yesBets[msg.sender] = 0; // Zero out to prevent double claim
            // Prize = Your Stake + (Your % of the Losing Pool)
            payout = userShare + (userShare * totalNo) / totalYes;
        } else { // NO Won
            uint256 userShare = noBets[msg.sender];
            require(userShare > 0, "No winning bets");
            noBets[msg.sender] = 0;
            payout = userShare + (userShare * totalYes) / totalNo;
        }

        collateralToken.transfer(msg.sender, payout);
    }
}
