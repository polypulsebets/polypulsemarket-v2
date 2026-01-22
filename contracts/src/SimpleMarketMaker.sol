// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

interface IConditionalTokens {
    function splitPosition(
        address collateralToken,
        bytes32 parentCollectionId,
        bytes32 conditionId,
        uint256[] calldata partition,
        uint256 amount
    ) external;

    function mergePositions(
        address collateralToken,
        bytes32 parentCollectionId,
        bytes32 conditionId,
        uint256[] calldata partition,
        uint256 amount
    ) external;
    
    function payoutNumerators(bytes32 conditionId, uint256 index) external view returns (uint256);
}

contract SimpleMarketMaker {
    IConditionalTokens public ctf;
    IERC20 public collateralToken;
    bytes32 public conditionId;
    
    uint256 public constant FEE = 0; // 0% fee for this demo

    constructor(
        address _ctf,
        address _collateralToken,
        bytes32 _conditionId
    ) {
        ctf = IConditionalTokens(_ctf);
        collateralToken = IERC20(_collateralToken);
        conditionId = _conditionId;
    }

    // Buy "YES" (Index 0) or "NO" (Index 1)
    function buy(uint256 investmentAmount, uint256 outcomeIndex, uint256 minTokens) external {
        // 1. Transfer user's money to here
        collateralToken.transferFrom(msg.sender, address(this), investmentAmount);

        // 2. Approve CTF to spend it
        collateralToken.approve(address(ctf), investmentAmount);

        // 3. Split Collateral into YES + NO tokens
        uint256[] memory partition = new uint256[](2);
        partition[0] = 1;
        partition[1] = 2; // Partition indices for binary outcome
        
        ctf.splitPosition(address(collateralToken), bytes32(0), conditionId, partition, investmentAmount);

        // For this Simple MVP, buying "YES" just means you hold the YES token.
        // In a real AMM, we would swap YES for NO to balance price.
        // This confirms the interaction works.
    }
}
