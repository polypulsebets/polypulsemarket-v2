import { onchainTable } from "@ponder/core";

export const Market = onchainTable("market", (t) => ({
  id: t.hex().primaryKey(),
  question: t.text().notNull(),
  category: t.text().notNull(),
  deadline: t.bigint().notNull(),
  totalVolume: t.bigint().notNull(),
  totalYes: t.bigint().notNull(),
  totalNo: t.bigint().notNull(),
  createdTimestamp: t.bigint().notNull(),
  
  // Status Flags
  resolved: t.boolean(),
  cancelled: t.boolean(),
  winningOutcome: t.integer(),

  // ORACLE DATA
  proposer: t.text(),       // Address of the person who proposed
  proposedOutcome: t.integer(), // 1 (YES) or 2 (NO)
  proposalTime: t.bigint(), // When the 24h timer started
  isDisputed: t.boolean(),  // If someone challenged it
}));

export const Trade = onchainTable("trade", (t) => ({
  id: t.text().primaryKey(),
  market: t.hex().notNull(),
  user: t.hex().notNull(),
  isYes: t.boolean().notNull(),
  amount: t.bigint().notNull(),
  timestamp: t.bigint().notNull(),
  txHash: t.hex().notNull(),
}));

export const UserPosition = onchainTable("user_position", (t) => ({
  id: t.text().primaryKey(),
  user: t.hex().notNull(),
  market: t.hex().notNull(),
  side: t.text().notNull(),
  invested: t.bigint().notNull(),
  lastActive: t.bigint().notNull(),
}));

// --- NEW: Price History Table ---
export const PricePoint = onchainTable("price_point", (t) => ({
  id: t.text().primaryKey(),       // "marketAddr-timestamp-index"
  market: t.hex().notNull(),
  timestamp: t.bigint().notNull(),
  yesPrice: t.bigint().notNull(),  // Stored as 1e18 (WAD)
}));

