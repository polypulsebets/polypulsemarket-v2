// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MockUMA.sol";

// Define interface to read the Market contract
interface IMarket {
    function assertionId() external view returns (bytes32);
    function oracle() external view returns (address);
}

contract Settle is Script {
    function run() external {
        // 1. Get the Market Address from your command line
        address marketAddress = vm.envAddress("MARKET");
        
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // 2. Read the Assertion ID from the Market
        IMarket market = IMarket(marketAddress);
        bytes32 assertionId = market.assertionId();
        address oracleAddress = market.oracle();

        console.log("Settling Assertion ID:");
        console.logBytes32(assertionId);

        // 3. Force the Oracle to Settle
        MockUMA(oracleAddress).settleAssertion(assertionId);

        console.log("Market Settled Successfully!");
        
        vm.stopBroadcast();
    }
}