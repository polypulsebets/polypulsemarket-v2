// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {PolypulseFactory} from "../src/PolypulseFactory.sol";
import {MockOptimisticOracle} from "../src/MockOptimisticOracle.sol";
import {MockUSDT} from "../src/MockUSDT.sol"; // Assuming you have this file

contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy Token (Keep your existing logic for this)
        MockUSDT token = new MockUSDT(); 
        console.log("Token deployed at:", address(token));

        // 2. Deploy Oracle (NEW STEP) - Pass Token Address
        MockOptimisticOracle oracle = new MockOptimisticOracle(address(token));
        console.log("Oracle deployed at:", address(oracle));

        // 3. Deploy Factory (UPDATED) - Pass Token AND Oracle
        PolypulseFactory factory = new PolypulseFactory(address(token), address(oracle));
        console.log("Factory deployed at:", address(factory));

        vm.stopBroadcast();
    }
}