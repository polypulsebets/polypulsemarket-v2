// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/PolypulseFactory.sol";
import "../src/MockUSDT.sol";
import "../src/MockUMA.sol";

contract DeployV8 is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        MockUSDT token = new MockUSDT();
        MockUMA oracle = new MockUMA(address(token));
        PolypulseFactory factory = new PolypulseFactory(address(token), address(oracle));

        console.log("MockUSDT:", address(token));
        console.log("MockUMA:", address(oracle));
        console.log("PolypulseFactory:", address(factory));

        vm.stopBroadcast();
    }
}