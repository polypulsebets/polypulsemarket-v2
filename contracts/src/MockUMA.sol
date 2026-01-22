// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";

interface UMAClient {
    function assertionResolvedCallback(bytes32 assertionId, bool assertedTruthfully) external;
}

contract MockUMA {
    ERC20 public token;
    
    struct Assertion {
        address asserter;
        address callbackRecipient;
        uint256 expirationTime;
        bool settled;
        bool disputed;
        bool result; 
        uint256 bond;
    }

    mapping(bytes32 => Assertion) public assertions;
    uint256 public constant DISPUTE_WINDOW = 120; // 2 Minutes for testing (Real is 2 hours)

    event AssertionMade(bytes32 indexed assertionId, address asserter, uint256 expiration);
    event AssertionDisputed(bytes32 indexed assertionId, address disputer);
    event AssertionSettled(bytes32 indexed assertionId, bool result);

    constructor(address _token) {
        token = ERC20(_token);
    }

    function assertTruth(string memory, address, address callbackRecipient, address, uint256, address, uint32, uint256 bond) external returns (bytes32) {
        token.transferFrom(msg.sender, address(this), bond);
        bytes32 assertionId = keccak256(abi.encodePacked(block.timestamp, msg.sender));
        assertions[assertionId] = Assertion({
            asserter: tx.origin,
            callbackRecipient: callbackRecipient,
            expirationTime: block.timestamp + DISPUTE_WINDOW,
            settled: false,
            disputed: false,
            result: true,
            bond: bond
        });
        emit AssertionMade(assertionId, tx.origin, block.timestamp + DISPUTE_WINDOW);
        return assertionId;
    }

    function disputeAssertion(bytes32 assertionId) external {
        Assertion storage a = assertions[assertionId];
        require(block.timestamp < a.expirationTime, "Too late");
        require(!a.disputed, "Already disputed");
        token.transferFrom(msg.sender, address(this), a.bond);
        a.disputed = true;
        emit AssertionDisputed(assertionId, msg.sender);
    }

    function settleAssertion(bytes32 assertionId) external {
        Assertion storage a = assertions[assertionId];
        require(!a.settled, "Already settled");
        
        if (a.disputed) {
            a.result = false; // Disputer wins
            token.transfer(msg.sender, a.bond * 2);
        } else {
            require(block.timestamp > a.expirationTime, "Wait for timer");
            a.result = true; // Proposer wins
            token.transfer(a.asserter, a.bond);
        }
        a.settled = true;
        UMAClient(a.callbackRecipient).assertionResolvedCallback(assertionId, a.result);
        emit AssertionSettled(assertionId, a.result);
    }
}