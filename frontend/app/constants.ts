// --- ADDRESSES ---
export const MOCK_USDT_ADDRESS = process.env.NEXT_PUBLIC_MOCK_USDT_ADDRESS || "";
export const ORACLE_ADDRESS = process.env.NEXT_PUBLIC_ORACLE_ADDRESS || "";
export const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_FACTORY_ADDRESS || "";

// --- ABIS ---
export const FACTORY_ABI = [
  // 1. Create Market Function
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
  // 2. Market Created Event
  {
    "type": "event",
    "name": "MarketCreated",
    "inputs": [
      { "indexed": true, "name": "marketAddress", "type": "address" },
      { "indexed": false, "name": "question", "type": "string" },
      { "indexed": false, "name": "deadline", "type": "uint256" },
      { "indexed": false, "name": "timestamp", "type": "uint256" }
    ]
  },
  // 3. Admins Check
  {
    "type": "function",
    "name": "admins",
    "inputs": [{ "name": "", "type": "address" }],
    "outputs": [{ "name": "", "type": "bool" }],
    "stateMutability": "view"
  },
  // 4. Owner Check 
  {
    "type": "function",
    "name": "owner",
    "inputs": [],
    "outputs": [{ "name": "", "type": "address" }],
    "stateMutability": "view"
  }
] as const;

export const ERC20_ABI = [
  {
    "type": "function",
    "name": "approve",
    "inputs": [{ "name": "spender", "type": "address" }, { "name": "amount", "type": "uint256" }],
    "outputs": [{ "name": "", "type": "bool" }],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "balanceOf",
    "inputs": [{ "name": "account", "type": "address" }],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "mint",
    "inputs": [{ "name": "to", "type": "address" }, { "name": "amount", "type": "uint256" }],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "allowance",
    "inputs": [{ "name": "owner", "type": "address" }, { "name": "spender", "type": "address" }],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  }
] as const;

export const MARKET_MAKER_ABI = [
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

export const ADMIN_WALLETS = [
    process.env.NEXT_PUBLIC_ADMIN_WALLET_1,
    process.env.NEXT_PUBLIC_ADMIN_WALLET_2,  
]
.filter((addr): addr is string => !!addr) 
.map(addr => addr.toLowerCase());