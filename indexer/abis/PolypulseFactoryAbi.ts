export const PolypulseFactoryAbi = [
  {
    "type": "function",
    "name": "createMarket",
    "inputs": [
      { "name": "question", "type": "string" },
      { "name": "questionId", "type": "bytes32" },
      { "name": "duration", "type": "uint256" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "MarketCreated",
    "inputs": [
      { "indexed": true, "name": "marketAddress", "type": "address" },
      { "indexed": false, "name": "question", "type": "string" },
      { "indexed": false, "name": "deadline", "type": "uint256" },
      { "indexed": false, "name": "timestamp", "type": "uint256" }
    ]
  }
] as const;