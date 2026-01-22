// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";

contract PolypulseOracle is Ownable {
    // Maps a "Question ID" to whether it has been resolved
    mapping(bytes32 => bool) public resolved;
    // Maps a "Question ID" to the winning outcome (e.g., [1,0] for YES, [0,1] for NO)
    mapping(bytes32 => uint256[]) public payouts;

    event QuestionResolved(bytes32 indexed questionId, uint256[] payouts);

    constructor() Ownable(msg.sender) {}

    // You call this function to declare the winner
    // payouts = [1, 0] means Outcome A won.
    // payouts = [0, 1] means Outcome B won.
    function resolve(bytes32 questionId, uint256[] calldata _payouts) external onlyOwner {
        require(!resolved[questionId], "Already resolved");
        payouts[questionId] = _payouts;
        resolved[questionId] = true;
        emit QuestionResolved(questionId, _payouts);
    }
}
