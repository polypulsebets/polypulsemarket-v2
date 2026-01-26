import { ponder } from "@/generated";
import { Market, Trade, UserPosition, PricePoint } from "../ponder.schema";
import { MarketMakerAbi } from "../abis/MarketMakerAbi"; 

// 1. Handle Market Creation
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
    resolved: false,
    cancelled: false,
    winningOutcome: 0,
    isDisputed: false, // Initialize as false
  });
  
  // Initialize Price at 0.50
  await context.db.insert(PricePoint).values({
    id: `${event.args.marketAddress}-${event.block.timestamp}-init`,
    market: event.args.marketAddress,
    timestamp: event.block.timestamp,
    yesPrice: 500000000000000000n, 
  });
});

// 2. Handle Trading (Buy/Sell)
ponder.on("MarketMaker:Trade", async ({ event, context }) => {
  const marketAddress = event.log.address;
  const user = event.args.user;
  const sideString = event.args.side; 
  const amountIn = event.args.amountIn;

  // Determine Side
  const isYes = sideString.includes("YES");
  
  // Fetch Real-Time Reserves for Price Calculation
  const reserveYes = await context.client.readContract({
    abi: MarketMakerAbi,
    address: marketAddress,
    functionName: "reserveYes",
  });

  const reserveNo = await context.client.readContract({
    abi: MarketMakerAbi,
    address: marketAddress,
    functionName: "reserveNo",
  });

  // Calculate Price (Logic: Price of YES = No / (Yes + No))
  let currentPriceWad = 500000000000000000n; // Default 0.5
  const totalPool = reserveYes + reserveNo;
  if (totalPool > 0n) {
    currentPriceWad = (reserveNo * 1000000000000000000n) / totalPool;
  }

  // Update Market Totals
  await context.db.update(Market, { id: marketAddress }).set({
    totalVolume: (await context.db.find(Market, { id: marketAddress }))!.totalVolume + amountIn,
    totalYes: reserveYes,
    totalNo: reserveNo,
  });

  // Record Price Point
  await context.db.insert(PricePoint).values({
    id: `${marketAddress}-${event.block.timestamp}-${event.log.logIndex}`,
    market: marketAddress,
    timestamp: event.block.timestamp,
    yesPrice: currentPriceWad,
  });

  // Record Trade Transaction
  await context.db.insert(Trade).values({
    id: event.transaction.hash + "-" + event.log.logIndex,
    market: marketAddress,
    user: user,
    isYes: isYes,
    amount: amountIn,
    timestamp: event.block.timestamp,
    txHash: event.transaction.hash,
  });

  // Update User Position
  const positionSide = isYes ? "YES" : "NO";
  const positionId = `${user}-${marketAddress}-${positionSide}`;
  const existingPosition = await context.db.find(UserPosition, { id: positionId });

  if (existingPosition) {
    await context.db.update(UserPosition, { id: positionId }).set({
      invested: existingPosition.invested + amountIn,
      lastActive: event.block.timestamp,
    });
  } else {
    await context.db.insert(UserPosition).values({
      id: positionId,
      user: user,
      market: marketAddress,
      side: positionSide,
      invested: amountIn,
      lastActive: event.block.timestamp,
    });
  }
});

// 3. Handle Liquidity Adds
ponder.on("MarketMaker:LiquidityAdded", async ({ event, context }) => {
    // Optional: You could force a price update here if you wanted, 
    // but usually waiting for the next trade is fine for the graph.
});

// 4. Handle Resolution
ponder.on("MarketMaker:MarketResolved", async ({ event, context }) => {
  await context.db.update(Market, { id: event.log.address }).set({
    resolved: true,
    winningOutcome: Number(event.args.outcome),
  });
});

// 5. Handle Assertion 
ponder.on("MarketMaker:MarketAsserted", async ({ event, context }) => {
  await context.db.update(Market, { id: event.log.address }).set({
    // We use the transaction sender as the proposer/asserter
    proposer: event.transaction.from, 
    proposedOutcome: Number(event.args.outcome),
    proposalTime: event.block.timestamp,
    // When asserted, dispute status resets to false 
    isDisputed: false, 
  });
});

// 6. Handle Dispute 
ponder.on("MarketMaker:MarketDisputed", async ({ event, context }) => {
  await context.db.update(Market, { id: event.log.address }).set({
    isDisputed: true,
  });
});