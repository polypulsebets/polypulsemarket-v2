import { ponder } from "@/generated";
import { Market, Trade, UserPosition, PricePoint, User } from "../ponder.schema";
import { MarketMakerAbi } from "../abis/MarketMakerAbi"; 

// --- HELPER: Get or Create User ---
const getOrCreateUser = async (db: any, address: `0x${string}`) => {
  const user = await db.find(User, { id: address });
  if (user) return user;
  return await db.insert(User).values({
    id: address,
    points: 0,
    volume: 0n,
    betCount: 0,
    sellCount: 0,
    proposeCount: 0,
  });
};

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
    isDisputed: false,
  });
  
  await context.db.insert(PricePoint).values({
    id: `${event.args.marketAddress}-${event.block.timestamp}-init`,
    market: event.args.marketAddress,
    timestamp: event.block.timestamp,
    yesPrice: 500000000000000000n, 
  });
});

// 2. Handle Trading (Bet=+2, Sell=+1)
ponder.on("MarketMaker:Trade", async ({ event, context }) => {
  const marketAddress = event.log.address;
  const userAddr = event.args.user.toLowerCase() as `0x${string}`;
  const sideString = event.args.side; 
  const amountIn = event.args.amountIn;

  const isYes = sideString.includes("YES");
  const isSell = sideString.includes("SELL");

  // UPDATE USER POINTS
  const user = await getOrCreateUser(context.db, userAddr);
  
  let pointsToAdd = 0;
  let newBetCount = user.betCount;
  let newSellCount = user.sellCount;

  if (isSell) {
      pointsToAdd = 1; 
      newSellCount += 1;
  } else {
      pointsToAdd = 2; 
      newBetCount += 1;
  }

  await context.db.update(User, { id: userAddr }).set({
      points: user.points + pointsToAdd,
      volume: user.volume + amountIn,
      betCount: newBetCount,
      sellCount: newSellCount,
  });

  // [Standard Price/Volume Updates Logic...]
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

  let currentPriceWad = 500000000000000000n; 
  const totalPool = reserveYes + reserveNo;
  if (totalPool > 0n) {
    currentPriceWad = (reserveNo * 1000000000000000000n) / totalPool;
  }

  await context.db.update(Market, { id: marketAddress }).set({
    totalVolume: (await context.db.find(Market, { id: marketAddress }))!.totalVolume + amountIn,
    totalYes: reserveYes,
    totalNo: reserveNo,
  });

  await context.db.insert(PricePoint).values({
    id: `${marketAddress}-${event.block.timestamp}-${event.log.logIndex}`,
    market: marketAddress,
    timestamp: event.block.timestamp,
    yesPrice: currentPriceWad,
  });

  await context.db.insert(Trade).values({
    id: event.transaction.hash + "-" + event.log.logIndex,
    market: marketAddress,
    user: userAddr,
    isYes: isYes,
    amount: amountIn,
    timestamp: event.block.timestamp,
    txHash: event.transaction.hash,
    side: sideString,
  });

  const positionSide = isYes ? "YES" : "NO";
  const positionId = `${userAddr}-${marketAddress}-${positionSide}`;
  const existingPosition = await context.db.find(UserPosition, { id: positionId });

  if (existingPosition) {
    await context.db.update(UserPosition, { id: positionId }).set({
      invested: existingPosition.invested + amountIn,
      lastActive: event.block.timestamp,
    });
  } else {
    await context.db.insert(UserPosition).values({
      id: positionId,
      user: userAddr,
      market: marketAddress,
      side: positionSide,
      invested: amountIn,
      lastActive: event.block.timestamp,
    });
  }
});

// 3. Handle Assertion (Propose=+2)
ponder.on("MarketMaker:MarketAsserted", async ({ event, context }) => {
  const asserterAddr = event.transaction.from.toLowerCase() as `0x${string}`;
  
  await context.db.update(Market, { id: event.log.address }).set({
    proposer: asserterAddr, 
    proposedOutcome: Number(event.args.outcome),
    proposalTime: event.block.timestamp,
    isDisputed: false, 
  });

  // UPDATE USER POINTS
  const user = await getOrCreateUser(context.db, asserterAddr);
  
  await context.db.update(User, { id: asserterAddr }).set({
      points: user.points + 2, 
      proposeCount: user.proposeCount + 1
  });
});

// 4. Handle Dispute 
ponder.on("MarketMaker:MarketDisputed", async ({ event, context }) => {
  await context.db.update(Market, { id: event.log.address }).set({
    isDisputed: true,
  });
});

// 5. Handle Resolution
ponder.on("MarketMaker:MarketResolved", async ({ event, context }) => {
  await context.db.update(Market, { id: event.log.address }).set({
    resolved: true,
    winningOutcome: Number(event.args.outcome),
  });
});