import { ponder } from "@/generated";
import { Market, Trade, UserPosition, PricePoint } from "../ponder.schema";

ponder.on("PolypulseFactory:MarketCreated", async ({ event, context }) => {
  await context.db.insert(Market).values({
    id: event.args.marketAddress,
    question: event.args.question,
    category: "General",
    deadline: event.args.deadline,
    totalVolume: 0n,
    totalYes: 0n,
    totalNo: 0n,
    createdTimestamp: event.block.timestamp,
    // Initialize
    resolved: false,
    cancelled: false,
    winningOutcome: 0,
  });
  
  // Create initial price point (0.50 start)
  await context.db.insert(PricePoint).values({
    id: `${event.args.marketAddress}-${event.block.timestamp}-init`,
    market: event.args.marketAddress,
    timestamp: event.block.timestamp,
    yesPrice: 500000000000000000n, 
  });
});

ponder.on("MarketMaker:Trade", async ({ event, context }) => {
  const marketAddress = event.log.address;
  const amount = event.args.amount;
  const isYes = event.args.isYes;
  const user = event.args.user;

  const market = await context.db.find(Market, { id: marketAddress });
  if (!market) return;

  const newYes = isYes ? market.totalYes + amount : market.totalYes;
  const newNo = !isYes ? market.totalNo + amount : market.totalNo;
  const newVol = market.totalVolume + amount;

  await context.db.update(Market, { id: marketAddress }).set({
    totalVolume: newVol,
    totalYes: newYes,
    totalNo: newNo,
  });

  let currentPriceWad = 500000000000000000n; // Default 0.5
  const totalPool = newYes + newNo;
  
  if (totalPool > 0n) {
    currentPriceWad = (newYes * 1000000000000000000n) / totalPool;
  }

  await context.db.insert(PricePoint).values({
    id: `${marketAddress}-${event.block.timestamp}-${event.log.logIndex}`,
    market: marketAddress,
    timestamp: event.block.timestamp,
    yesPrice: currentPriceWad,
  });

  await context.db.insert(Trade).values({
    id: event.transaction.hash + "-" + event.log.logIndex,
    market: marketAddress,
    user: user,
    isYes: isYes,
    amount: amount,
    timestamp: event.block.timestamp,
    txHash: event.transaction.hash,
  });

  const side = isYes ? "YES" : "NO";
  const positionId = `${user}-${marketAddress}-${side}`;
  const existingPosition = await context.db.find(UserPosition, { id: positionId });

  if (existingPosition) {
    await context.db.update(UserPosition, { id: positionId }).set({
      invested: existingPosition.invested + amount,
      lastActive: event.block.timestamp,
    });
  } else {
    await context.db.insert(UserPosition).values({
      id: positionId,
      user: user,
      market: marketAddress,
      side: side,
      invested: amount,
      lastActive: event.block.timestamp,
    });
  }
});

ponder.on("MarketMaker:MarketResolved", async ({ event, context }) => {
  await context.db.update(Market, { id: event.log.address }).set({
    resolved: true,
    winningOutcome: Number(event.args.outcome),
  });
});

ponder.on("MarketMaker:MarketCancelled", async ({ event, context }) => {
  await context.db.update(Market, { id: event.log.address }).set({
    resolved: true,
    cancelled: true,
    winningOutcome: 0,
  });
});

ponder.on("MarketMaker:OutcomeProposed", async ({ event, context }) => {
  await context.db.update(Market, { id: event.log.address }).set({
    proposer: event.args.user,
    proposedOutcome: Number(event.args.outcome),
    proposalTime: event.args.timestamp,
    isDisputed: false, // Reset dispute status
  });
});

// NEW: Handle Dispute
ponder.on("MarketMaker:OutcomeDisputed", async ({ event, context }) => {
  await context.db.update(Market, { id: event.log.address }).set({
    isDisputed: true,
  });
});