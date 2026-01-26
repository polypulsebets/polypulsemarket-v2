// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";

contract MockOptimisticOracle is Ownable {
    IERC20 public currency;

    struct Assertion {
        bool exists;
        bool resolved;
        bool outcome;       // true = YES, false = NO
        address asserter;
        uint256 bond;
        uint256 expirationTime;
        bool disputed;
        address disputer;
        string[] assertionLinks; 
        string[] disputeLinks;   
        address callbackRecipient;
    }

    mapping(bytes32 => Assertion) public assertions;

    event AssertionMade(bytes32 indexed assertionId, address indexed asserter, bool outcome, uint256 expirationTime);
    event AssertionDisputed(bytes32 indexed assertionId, address indexed disputer);
    event AssertionSettled(bytes32 indexed assertionId, bool correct);

    constructor(address _currency) Ownable(msg.sender) {
        currency = IERC20(_currency);
    }

    function getMinimumBond(address) external pure returns (uint256) {
        return 50 ether; // 50 Tokens
    }

    // --- 1. ASSERT (Start Timer) ---
    function assertTruth(
        bool outcome,
        address asserter,
        address callbackRecipient,
        uint256 liveness,
        uint256 bond,
        string[] memory links
    ) external returns (bytes32 assertionId) {
        currency.transferFrom(msg.sender, address(this), bond);

        // Unique ID based on data + time
        assertionId = keccak256(abi.encode(outcome, block.timestamp, asserter));

        assertions[assertionId] = Assertion({
            exists: true,
            resolved: false,
            outcome: outcome,
            asserter: asserter,
            bond: bond,
            expirationTime: block.timestamp + liveness,
            disputed: false,
            disputer: address(0),
            assertionLinks: links,
            disputeLinks: new string[](0), 
            callbackRecipient: callbackRecipient
        });

        emit AssertionMade(assertionId, asserter, outcome, block.timestamp + liveness);
        return assertionId;
    }

    // --- 2. DISPUTE (Stop Timer) ---
    function disputeAssertion(bytes32 assertionId, address disputer, string[] memory links) external {
        Assertion storage a = assertions[assertionId];
        require(a.exists, "Unknown assertion");
        require(!a.resolved, "Already resolved");
        require(!a.disputed, "Already disputed");
        require(block.timestamp < a.expirationTime, "Liveness passed");

        // Pull Bond from Disputer
        currency.transferFrom(msg.sender, address(this), a.bond);

        a.disputed = true;
        a.disputer = disputer;
        a.disputeLinks = links;

        emit AssertionDisputed(assertionId, disputer);
    }

    // --- 3. SETTLE (Happy Path - No Dispute) ---
    function settleAssertion(bytes32 assertionId) external {
        Assertion storage a = assertions[assertionId];
        require(!a.resolved, "Resolved");
        require(!a.disputed, "Disputed");
        require(block.timestamp >= a.expirationTime, "Wait for timer");

        a.resolved = true;
        
        // Return Bond to Asserter
        currency.transfer(a.asserter, a.bond);

        // Callback: Valid = True
        (bool success, ) = a.callbackRecipient.call(
            abi.encodeWithSignature("assertionResolvedCallback(bytes32,bool)", assertionId, true)
        );
        require(success, "Callback failed");

        emit AssertionSettled(assertionId, true);
    }

    // --- 4. ADMIN RESOLVE (The Judge) ---
    // ruling = TRUE (Asserter Won), ruling = FALSE (Disputer Won)
    function resolveDispute(bytes32 assertionId, bool ruling) external onlyOwner {
        Assertion storage a = assertions[assertionId];
        require(a.disputed, "Not disputed");
        require(!a.resolved, "Resolved");

        a.resolved = true;
        uint256 payout = a.bond * 2;

        if (ruling) {
            currency.transfer(a.asserter, payout); // Asserter wins pot
        } else {
            currency.transfer(a.disputer, payout); // Disputer wins pot
        }

        // Callback AMM
        (bool success, ) = a.callbackRecipient.call(
            abi.encodeWithSignature("assertionResolvedCallback(bytes32,bool)", assertionId, ruling)
        );
        require(success, "Callback failed");

        emit AssertionSettled(assertionId, ruling);
    }

    function getAssertion(bytes32 id) external view returns (Assertion memory) {
        return assertions[id];
    }
}