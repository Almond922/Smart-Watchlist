import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting SignalWatch database seed...");

  // Clean existing demo data
  await prisma.changeDetection.deleteMany({});
  await prisma.watchlistItem.deleteMany({});
  await prisma.watchlist.deleteMany({});
  await prisma.marketEvent.deleteMany({});
  await prisma.marketSnapshot.deleteMany({});
  await prisma.user.deleteMany({});

  const now = new Date();
  const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  // 1. Create Default Demo User
  const user = await prisma.user.create({
    data: {
      id: "demo-user-1",
      email: "demo@signalwatch.io",
      name: "Alex Vance",
    },
  });

  // 2. Create Default Watchlist
  const watchlist = await prisma.watchlist.create({
    data: {
      id: "demo-watchlist-1",
      userId: user.id,
      name: "Core Market Radar",
    },
  });

  // 3. Watchlist Items with intentional 'last-seen' snapshots to exhibit meaningful changes
  const items = [
    {
      symbol: "AAPL",
      companyName: "Apple Inc.",
      sortOrder: 0,
      lastCheckedAt: fourHoursAgo,
      lastSeenPrice: 227.45, // Current: 238.42 (+4.82% surge!)
      lastSeenVolume: 35800000, // Current: 82.4M (2.3x volume!)
    },
    {
      symbol: "NVDA",
      companyName: "NVIDIA Corporation",
      sortOrder: 1,
      lastCheckedAt: fourHoursAgo,
      lastSeenPrice: 132.80, // Current: 124.95 (-5.91% selloff!)
      lastSeenVolume: 44200000, // Current: 98.5M (2.23x volume!)
    },
    {
      symbol: "TSLA",
      companyName: "Tesla, Inc.",
      sortOrder: 2,
      lastCheckedAt: fourHoursAgo,
      lastSeenPrice: 248.50, // Current: 254.80 (+2.54% move, tests 52w high $260.00!)
      lastSeenVolume: 42300000, // Current: 68.1M (1.61x elevated volume!)
    },
    {
      symbol: "MSFT",
      companyName: "Microsoft Corporation",
      sortOrder: 3,
      lastCheckedAt: fourHoursAgo,
      lastSeenPrice: 448.10, // Current: 449.60 (+0.33% quiet)
      lastSeenVolume: 19500000, // Current: 18.2M (0.93x normal)
    },
    {
      symbol: "AMZN",
      companyName: "Amazon.com, Inc.",
      sortOrder: 4,
      lastCheckedAt: fourHoursAgo,
      lastSeenPrice: 184.20, // Current: 186.95 (+1.49% normal)
      lastSeenVolume: 36500000,
    },
    {
      symbol: "GOOGL",
      companyName: "Alphabet Inc.",
      sortOrder: 5,
      lastCheckedAt: fourHoursAgo,
      lastSeenPrice: 178.50, // Current: 177.10 (-0.78% quiet)
      lastSeenVolume: 24500000,
    },
  ];

  for (const item of items) {
    await prisma.watchlistItem.create({
      data: {
        watchlistId: watchlist.id,
        symbol: item.symbol,
        companyName: item.companyName,
        sortOrder: item.sortOrder,
        lastCheckedAt: item.lastCheckedAt,
        lastSeenPrice: item.lastSeenPrice,
        lastSeenVolume: item.lastSeenVolume,
      },
    });
  }

  // 4. Seed Market Events
  const events = [
    {
      symbol: "AAPL",
      eventType: "earnings",
      title: "Apple Reports Record Services Revenue and Strong Q3 Guidance",
      description: "Services segment jumped 14% year-over-year while gross margins expanded to 46.2%, outpacing consensus estimates.",
      timestamp: twoDaysAgo,
      source: "Bloomberg",
    },
    {
      symbol: "AAPL",
      eventType: "analyst",
      title: "Morgan Stanley Raises AAPL Price Target to $260 on AI Ecosystem Strength",
      description: "Analyst highlights rapid adoption of Apple Intelligence features and upgraded replacement cycle timeline.",
      timestamp: oneHourAgo,
      source: "Morgan Stanley Research",
    },
    {
      symbol: "NVDA",
      eventType: "news",
      title: "Export Control Review Raised in Commerce Department Committee",
      description: "Regulatory sub-committee convenes to evaluate latest advanced packaging chip thresholds for cross-border transit.",
      timestamp: oneHourAgo,
      source: "Reuters",
    },
    {
      symbol: "TSLA",
      eventType: "news",
      title: "Full Self-Driving V13 Fleet Deployment Initiated in North America",
      description: "Tesla rolls out next-generation end-to-end neural network model with reported 3x reduction in driver interventions.",
      timestamp: oneHourAgo,
      source: "Electrek",
    },
  ];

  for (const ev of events) {
    await prisma.marketEvent.create({
      data: ev,
    });
  }

  console.log("✅ Seed completed successfully!");
  console.log(`👤 Demo user created: ${user.email} (${user.id})`);
  console.log(`📋 Watchlist created with ${items.length} stocks: AAPL, NVDA, TSLA, MSFT, AMZN, GOOGL`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

