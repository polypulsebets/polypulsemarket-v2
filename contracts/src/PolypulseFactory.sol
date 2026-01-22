// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import {MockUMA} from "./MockUMA.sol";

contract MarketMaker {
    ERC20 public token;
    MockUMA public oracle;
    address public admin; 
    
    string public question;
    uint256 public deadline;

    uint256 public totalYes;
    uint256 public totalNo;
    uint256 public feesCollected; 

    mapping(address => uint256) public yesBalances;
    mapping(address => uint256) public noBalances;

    bool public resolved;
    bool public cancelled;
    uint256 public winningOutcome; 

    // --- OPTIMISTIC ORACLE STATE ---
    address public proposer;
    uint256 public proposedOutcome;
    uint256 public proposalTime; // When the timer started
    uint256 public constant BOND_AMOUNT = 50 ether; // 50 Mock USDT to speak
    uint256 public constant CHALLENGE_WINDOW = 1 days; // 24 Hours

    address public disputer;
    bool public isDisputed;

    event Trade(address indexed user, bool isYes, uint256 amount, uint256 timestamp);
    event MarketResolved(uint256 outcome);
    event FeesWithdrawn(address owner, uint256 amount);
    event MarketCancelled(uint256 timestamp);
    
    // NEW EVENTS
    event OutcomeProposed(address indexed user, uint256 outcome, uint256 timestamp);
    event OutcomeDisputed(address indexed user, uint256 timestamp);
    event DisputeResolved(address indexed winner, uint256 amountWon);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not Admin");
        _;
    }

    constructor(address _token, address _oracle, address _admin, string memory _question, uint256 _duration) {
        token = ERC20(_token);
        oracle = MockUMA(_oracle);
        admin = _admin;
        question = _question;
        deadline = block.timestamp + _duration;
    }

    // --- TRADING FUNCTIONS (Standard) ---
    function buyYes(uint256 amount) external {
        _trade(msg.sender, true, amount);
    }
    function buyNo(uint256 amount) external {
        _trade(msg.sender, false, amount);
    }
    function _trade(address user, bool isYes, uint256 amount) internal {
        require(block.timestamp < deadline, "Betting closed");
        require(!resolved, "Resolved");
        token.transferFrom(user, address(this), amount);
        uint256 fee = amount / 50; 
        uint256 netAmount = amount - fee;
        feesCollected += fee; 
        if(isYes) { yesBalances[user] += netAmount; totalYes += netAmount; }
        else { noBalances[user] += netAmount; totalNo += netAmount; }
        emit Trade(user, isYes, netAmount, block.timestamp);
    }

    // --- OPTIMISTIC ORACLE FUNCTIONS ---

    // 1. PROPOSE: Anyone can say who won (Stakes Money)
    function proposeOutcome(uint256 _outcome) external {
        require(block.timestamp > deadline, "Market not ended");
        require(!resolved, "Already resolved");
        require(proposer == address(0), "Already proposed"); // V1: First come, first served
        require(_outcome == 1 || _outcome == 2, "Invalid outcome");

        // Take Bond
        token.transferFrom(msg.sender, address(this), BOND_AMOUNT);

        proposer = msg.sender;
        proposedOutcome = _outcome;
        proposalTime = block.timestamp;

        emit OutcomeProposed(msg.sender, _outcome, block.timestamp);
    }

    // 2. DISPUTE: Anyone can say "Liar!" (Stakes Money)
    function disputeOutcome() external {
        require(proposer != address(0), "Nothing to dispute");
        require(!resolved, "Already resolved");
        require(!isDisputed, "Already disputed");
        require(block.timestamp < proposalTime + CHALLENGE_WINDOW, "Time expired");

        // Take Bond
        token.transferFrom(msg.sender, address(this), BOND_AMOUNT);

        disputer = msg.sender;
        isDisputed = true;
        emit OutcomeDisputed(msg.sender, block.timestamp);
    }

    // 3. FINALIZE: If 24h passed & no dispute -> Proposer was right
    function finalize() external {
        require(proposer != address(0), "No proposal");
        require(!isDisputed, "Active dispute");
        require(!resolved, "Resolved");
        require(block.timestamp > proposalTime + CHALLENGE_WINDOW, "In challenge window");

        resolved = true;
        winningOutcome = proposedOutcome;
        
        // Return Bond to Proposer
        token.transfer(proposer, BOND_AMOUNT);
        
        emit MarketResolved(winningOutcome);
    }

    // --- ADMIN / COURT FUNCTIONS ---

    // Judge a Dispute (Admin Only)
    function resolveDispute(uint256 _correctOutcome) external onlyAdmin {
        require(isDisputed, "No dispute");
        require(!resolved, "Resolved");

        resolved = true;
        winningOutcome = _correctOutcome;

        // Pay the Winner (Proposer or Disputer)
        // Winner gets their bond back + loser's bond (Profit!)
        uint256 pot = BOND_AMOUNT * 2;
        
        if (_correctOutcome == proposedOutcome) {
            // Proposer was right
            token.transfer(proposer, pot);
            emit DisputeResolved(proposer, pot);
        } else {
            // Disputer was right
            token.transfer(disputer, pot);
            emit DisputeResolved(disputer, pot);
        }

        emit MarketResolved(_correctOutcome);
    }

    // Emergency Overrides (Backup)
    function withdrawFees() external onlyAdmin {
        require(feesCollected > 0, "No fees");
        token.transfer(admin, feesCollected);
        emit FeesWithdrawn(admin, feesCollected);
        feesCollected = 0;
    }

    function emergencyCancel() external onlyAdmin {
        require(!resolved, "Already resolved");
        resolved = true;
        cancelled = true; 
        
        // Refund any pending bonds if cancelled mid-process
        if (proposer != address(0)) token.transfer(proposer, BOND_AMOUNT);
        if (disputer != address(0)) token.transfer(disputer, BOND_AMOUNT);

        emit MarketCancelled(block.timestamp); 
    }

    function claim() external {
        require(resolved, "Not resolved");
        uint256 reward = 0;

        if (cancelled) {
            reward += yesBalances[msg.sender];
            reward += noBalances[msg.sender];
            yesBalances[msg.sender] = 0;
            noBalances[msg.sender] = 0;
        } 
        else if (winningOutcome == 1) { 
            uint256 share = yesBalances[msg.sender];
            if (share > 0) reward = share + (share * totalNo / totalYes);
            yesBalances[msg.sender] = 0;
        } 
        else if (winningOutcome == 2) { 
            uint256 share = noBalances[msg.sender];
            if (share > 0) reward = share + (share * totalYes / totalNo);
            noBalances[msg.sender] = 0;
        }

        if (reward > 0) token.transfer(msg.sender, reward);
    }
}

contract PolypulseFactory {
    address public owner;
    address public tokenAddress;
    address public oracleAddress;
    mapping(address => bool) public admins;

    event MarketCreated(address indexed marketAddress, string question, uint256 deadline, uint256 timestamp);
    event AdminStatusChanged(address indexed user, bool status);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not Owner");
        _;
    }

    modifier onlyAdmin() {
        require(admins[msg.sender], "Not Authorized Admin");
        _;
    }

    constructor(address _token, address _oracle) {
        owner = msg.sender;
        tokenAddress = _token;
        oracleAddress = _oracle;
        admins[msg.sender] = true; 
    }

    function setAdmin(address user, bool status) external onlyOwner {
        admins[user] = status;
        emit AdminStatusChanged(user, status);
    }

    function createMarket(string memory question, bytes32, uint256 duration) external onlyAdmin {
        MarketMaker newMarket = new MarketMaker(tokenAddress, oracleAddress, msg.sender, question, duration);
        emit MarketCreated(address(newMarket), question, block.timestamp + duration, block.timestamp);
    }
}