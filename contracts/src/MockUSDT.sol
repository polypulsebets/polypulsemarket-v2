// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";

contract MockUSDT is ERC20 {
    constructor() ERC20("Mock USDT", "mUSDT") {
        _mint(msg.sender, 1_000_000 * 10**18); // Mint 1 Million tokens to deployer
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}