// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {PolypulseAMM} from "./PolypulseAMM.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

contract PolypulseFactory {
    address public owner;
    address public tokenAddress;
    address public oracleAddress; 
    mapping(address => bool) public admins;

    event MarketCreated(address indexed marketAddress, string question, uint256 deadline, uint256 timestamp);
    event AdminStatusChanged(address indexed user, bool status);

    modifier onlyOwner() { require(msg.sender == owner, "Not Owner"); _; }
    modifier onlyAdmin() { require(admins[msg.sender], "Not Authorized"); _; }

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

    function createMarket(string memory question, bytes32, uint256 duration, uint256 initialLiquidity) external onlyAdmin {
        PolypulseAMM newMarket = new PolypulseAMM(tokenAddress, oracleAddress, question, duration);
        
        if (initialLiquidity > 0) {
            IERC20(tokenAddress).transferFrom(msg.sender, address(newMarket), initialLiquidity);
            newMarket.initializeLiquidity(initialLiquidity);
        }

        newMarket.transferOwnership(msg.sender);
        emit MarketCreated(address(newMarket), question, block.timestamp + duration, block.timestamp);
    }
}