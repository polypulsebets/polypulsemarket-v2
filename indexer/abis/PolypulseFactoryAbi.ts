export const PolypulseFactoryAbi = [
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "marketAddress", "type": "address" },
      { "indexed": false, "internalType": "string", "name": "question", "type": "string" },
      { "indexed": false, "internalType": "uint256", "name": "deadline", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }
    ],
    "name": "MarketCreated",
    "type": "event"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "question", "type": "string" },
      { "internalType": "bytes32", "name": "questionId", "type": "bytes32" },
      { "internalType": "uint256", "name": "duration", "type": "uint256" },
      { "internalType": "uint256", "name": "initialLiquidity", "type": "uint256" }
    ],
    "name": "createMarket",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;