// --- ADDRESSES ---
export const MOCK_USDT_ADDRESS = process.env.NEXT_PUBLIC_MOCK_USDT_ADDRESS || "";
export const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_FACTORY_ADDRESS || "";
export const MOCK_ORACLE_ADDRESS = process.env.NEXT_PUBLIC_MOCK_ORACLE_ADDRESS || "";

// --- ABIS ---

export const FACTORY_ABI = [
  {
    "type": "function",
    "name": "createMarket",
    "inputs": [
      { "name": "question", "type": "string" },
      { "name": "questionId", "type": "bytes32" },
      { "name": "duration", "type": "uint256" },
      { "name": "initialLiquidity", "type": "uint256" }
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
  },
  {
    "type": "function",
    "name": "admins",
    "inputs": [{ "name": "", "type": "address" }],
    "outputs": [{ "name": "", "type": "bool" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "owner",
    "inputs": [],
    "outputs": [{ "name": "", "type": "address" }],
    "stateMutability": "view"
  }
] as const;

export const MARKET_MAKER_ABI = [
  // --- TRADING & CORE ---
  { "type": "function", "name": "buyYes", "inputs": [{ "name": "amount", "type": "uint256" }], "outputs": [{ "name": "", "type": "uint256" }], "stateMutability": "nonpayable" },
  { "type": "function", "name": "buyNo", "inputs": [{ "name": "amount", "type": "uint256" }], "outputs": [{ "name": "", "type": "uint256" }], "stateMutability": "nonpayable" },
  { "type": "function", "name": "sellYes", "inputs": [{ "name": "amount", "type": "uint256" }], "outputs": [], "stateMutability": "nonpayable" },
  { "type": "function", "name": "sellNo", "inputs": [{ "name": "amount", "type": "uint256" }], "outputs": [], "stateMutability": "nonpayable" },
  { "type": "function", "name": "addLiquidity", "inputs": [{ "name": "amount", "type": "uint256" }], "outputs": [], "stateMutability": "nonpayable" },
  { "type": "function", "name": "claim", "inputs": [], "outputs": [], "stateMutability": "nonpayable" },

  // --- ORACLE ACTIONS ---
  { "type": "function", "name": "assertMarket", "inputs": [{ "name": "outcomeIsYes", "type": "bool" }, { "name": "links", "type": "string[]" }], "outputs": [], "stateMutability": "nonpayable" },
  { "type": "function", "name": "disputeMarket", "inputs": [{ "name": "links", "type": "string[]" }], "outputs": [], "stateMutability": "nonpayable" },
  { "type": "function", "name": "settle", "inputs": [], "outputs": [], "stateMutability": "nonpayable" },

  // --- VIEW FUNCTIONS ---
  { "type": "function", "name": "yesBalances", "inputs": [{ "name": "", "type": "address" }], "outputs": [{ "name": "", "type": "uint256" }], "stateMutability": "view" },
  { "type": "function", "name": "noBalances", "inputs": [{ "name": "", "type": "address" }], "outputs": [{ "name": "", "type": "uint256" }], "stateMutability": "view" },
  { "type": "function", "name": "reserveYes", "inputs": [], "outputs": [{ "name": "", "type": "uint256" }], "stateMutability": "view" },
  { "type": "function", "name": "reserveNo", "inputs": [], "outputs": [{ "name": "", "type": "uint256" }], "stateMutability": "view" },
  { "type": "function", "name": "deadline", "inputs": [], "outputs": [{ "name": "", "type": "uint256" }], "stateMutability": "view" },
  { "type": "function", "name": "resolved", "inputs": [], "outputs": [{ "name": "", "type": "bool" }], "stateMutability": "view" },
  { "type": "function", "name": "cancelled", "inputs": [], "outputs": [{ "name": "", "type": "bool" }], "stateMutability": "view" },
  { "type": "function", "name": "winningOutcome", "inputs": [], "outputs": [{ "name": "", "type": "uint256" }], "stateMutability": "view" },
  { "type": "function", "name": "feesCollected", "inputs": [], "outputs": [{ "name": "", "type": "uint256" }], "stateMutability": "view" },
  { "type": "function", "name": "owner", "inputs": [], "outputs": [{ "name": "", "type": "address" }], "stateMutability": "view" },

  // --- ORACLE STATE ---
  { "type": "function", "name": "assertionId", "inputs": [], "outputs": [{ "name": "", "type": "bytes32" }], "stateMutability": "view" },
  { "type": "function", "name": "assertedOutcome", "inputs": [], "outputs": [{ "name": "", "type": "uint256" }], "stateMutability": "view" },
  { "type": "function", "name": "isDisputed", "inputs": [], "outputs": [{ "name": "", "type": "bool" }], "stateMutability": "view" },

  // --- ADMIN ---
  { "type": "function", "name": "withdrawFees", "inputs": [], "outputs": [], "stateMutability": "nonpayable" },
  { "type": "function", "name": "emergencyCancel", "inputs": [], "outputs": [], "stateMutability": "nonpayable" },

  // --- EVENTS ---
  { "type": "event", "name": "Trade", "inputs": [ { "indexed": true, "name": "user", "type": "address" }, { "indexed": false, "name": "side", "type": "string" }, { "indexed": false, "name": "amountIn", "type": "uint256" }, { "indexed": false, "name": "amountOut", "type": "uint256" } ] },
  { "type": "event", "name": "MarketAsserted", "inputs": [ { "indexed": false, "name": "assertionId", "type": "bytes32" }, { "indexed": false, "name": "outcome", "type": "uint256" }, { "indexed": false, "name": "links", "type": "string[]" } ] },
  { "type": "event", "name": "MarketDisputed", "inputs": [ { "indexed": false, "name": "assertionId", "type": "bytes32" }, { "indexed": false, "name": "user", "type": "address" }, { "indexed": false, "name": "links", "type": "string[]" } ] },
  { "type": "event", "name": "MarketResolved", "inputs": [ { "indexed": false, "name": "outcome", "type": "uint256" } ] }
] as const;

export const MOCK_ORACLE_ABI = [
  { "type": "function", "name": "resolveDispute", "inputs": [{ "name": "assertionId", "type": "bytes32" }, { "name": "ruling", "type": "bool" }], "outputs": [], "stateMutability": "nonpayable" },
  { 
    "type": "function", "name": "getAssertion", "inputs": [{ "name": "id", "type": "bytes32" }], 
    "outputs": [{ "components": [
        { "name": "exists", "type": "bool" },
        { "name": "resolved", "type": "bool" },
        { "name": "outcome", "type": "bool" },
        { "name": "asserter", "type": "address" },
        { "name": "bond", "type": "uint256" },
        { "name": "expirationTime", "type": "uint256" },
        { "name": "disputed", "type": "bool" },
        { "name": "disputer", "type": "address" },
        { "name": "assertionLinks", "type": "string[]" },
        { "name": "disputeLinks", "type": "string[]" }
    ], "name": "", "type": "tuple" }], 
    "stateMutability": "view" 
  }
] as const;

export const ERC20_ABI = [
  { "type": "function", "name": "approve", "inputs": [{ "name": "spender", "type": "address" }, { "name": "amount", "type": "uint256" }], "outputs": [{ "name": "", "type": "bool" }], "stateMutability": "nonpayable" },
  { "type": "function", "name": "balanceOf", "inputs": [{ "name": "account", "type": "address" }], "outputs": [{ "name": "", "type": "uint256" }], "stateMutability": "view" },
  { "type": "function", "name": "mint", "inputs": [{ "name": "to", "type": "address" }, { "name": "amount", "type": "uint256" }], "outputs": [], "stateMutability": "nonpayable" },
  { "type": "function", "name": "allowance", "inputs": [{ "name": "owner", "type": "address" }, { "name": "spender", "type": "address" }], "outputs": [{ "name": "", "type": "uint256" }], "stateMutability": "view" }
] as const;

// Helper to check admin status 
export const ADMIN_WALLETS = [
    process.env.NEXT_PUBLIC_ADMIN_WALLET_1,
    process.env.NEXT_PUBLIC_ADMIN_WALLET_2,  
]
.filter((addr): addr is string => !!addr) 
.map(addr => addr.toLowerCase());