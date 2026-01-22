export const MarketMakerAbi = [
  // --- TRADING ---
  { "type": "function", "name": "buyYes", "inputs": [{ "name": "amount", "type": "uint256" }], "outputs": [], "stateMutability": "nonpayable" },
  { "type": "function", "name": "buyNo", "inputs": [{ "name": "amount", "type": "uint256" }], "outputs": [], "stateMutability": "nonpayable" },
  { "type": "function", "name": "claim", "inputs": [], "outputs": [], "stateMutability": "nonpayable" },
  
  // --- VIEW FUNCTIONS ---
  { "type": "function", "name": "totalYes", "inputs": [], "outputs": [{ "name": "", "type": "uint256" }], "stateMutability": "view" },
  { "type": "function", "name": "totalNo", "inputs": [], "outputs": [{ "name": "", "type": "uint256" }], "stateMutability": "view" },
  { "type": "function", "name": "deadline", "inputs": [], "outputs": [{ "name": "", "type": "uint256" }], "stateMutability": "view" },
  { "type": "function", "name": "yesBalances", "inputs": [{ "name": "", "type": "address" }], "outputs": [{ "name": "", "type": "uint256" }], "stateMutability": "view" },
  { "type": "function", "name": "noBalances", "inputs": [{ "name": "", "type": "address" }], "outputs": [{ "name": "", "type": "uint256" }], "stateMutability": "view" },
  { "type": "function", "name": "resolved", "inputs": [], "outputs": [{ "name": "", "type": "bool" }], "stateMutability": "view" },
  { "type": "function", "name": "cancelled", "inputs": [], "outputs": [{ "name": "", "type": "bool" }], "stateMutability": "view" },
  { "type": "function", "name": "winningOutcome", "inputs": [], "outputs": [{ "name": "", "type": "uint256" }], "stateMutability": "view" },

  // --- ORACLE STATE ---
  { "type": "function", "name": "proposer", "inputs": [], "outputs": [{ "name": "", "type": "address" }], "stateMutability": "view" },
  { "type": "function", "name": "proposedOutcome", "inputs": [], "outputs": [{ "name": "", "type": "uint256" }], "stateMutability": "view" },
  { "type": "function", "name": "proposalTime", "inputs": [], "outputs": [{ "name": "", "type": "uint256" }], "stateMutability": "view" },
  { "type": "function", "name": "isDisputed", "inputs": [], "outputs": [{ "name": "", "type": "bool" }], "stateMutability": "view" },

  // --- ORACLE ACTIONS ---
  { "type": "function", "name": "proposeOutcome", "inputs": [{ "name": "_outcome", "type": "uint256" }], "outputs": [], "stateMutability": "nonpayable" },
  { "type": "function", "name": "disputeOutcome", "inputs": [], "outputs": [], "stateMutability": "nonpayable" },
  { "type": "function", "name": "finalize", "inputs": [], "outputs": [], "stateMutability": "nonpayable" },

  // --- ADMIN ---
  { "type": "function", "name": "resolveDispute", "inputs": [{ "name": "_correctOutcome", "type": "uint256" }], "outputs": [], "stateMutability": "nonpayable" },
  { "type": "function", "name": "withdrawFees", "inputs": [], "outputs": [], "stateMutability": "nonpayable" },
  { "type": "function", "name": "resolve", "inputs": [{ "name": "outcome", "type": "uint256" }], "outputs": [], "stateMutability": "nonpayable" },
  { "type": "function", "name": "emergencyCancel", "inputs": [], "outputs": [], "stateMutability": "nonpayable" },
  { "type": "function", "name": "feesCollected", "inputs": [], "outputs": [{ "name": "", "type": "uint256" }], "stateMutability": "view" },

  // --- EVENTS ---
  { "type": "event", "name": "Trade", "inputs": [ { "indexed": true, "name": "user", "type": "address" }, { "indexed": false, "name": "isYes", "type": "bool" }, { "indexed": false, "name": "amount", "type": "uint256" }, { "indexed": false, "name": "timestamp", "type": "uint256" } ] },
  { "type": "event", "name": "MarketResolved", "inputs": [ { "indexed": false, "name": "outcome", "type": "uint256" } ] },
  { "type": "event", "name": "MarketCancelled", "inputs": [ { "indexed": false, "name": "timestamp", "type": "uint256" } ] },
  { "type": "event", "name": "OutcomeProposed", "inputs": [ { "indexed": true, "name": "user", "type": "address" }, { "indexed": false, "name": "outcome", "type": "uint256" }, { "indexed": false, "name": "timestamp", "type": "uint256" } ] },
  { "type": "event", "name": "OutcomeDisputed", "inputs": [ { "indexed": true, "name": "user", "type": "address" }, { "indexed": false, "name": "timestamp", "type": "uint256" } ] }
] as const;