import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fetchAllTrendSignals } from "@/lib/trends/fetchTrends";

const CRON_SECRET = process.env.CRON_SECRET;

// Regions to refresh
const REGIONS = ["US"];
// Periods to refresh
const PERIODS = [7, 30, 90];

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = request.headers.get("x-cron-secret");
  
  // Allow Vercel cron (uses Authorization: Bearer <CRON_SECRET>)
  // Or custom header x-cron-secret
  const providedSecret = cronSecret || authHeader?.replace("Bearer ", "");
  
  if (CRON_SECRET && providedSecret !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results: { region: string; periodDays: number; count: number }[] = [];

    for (const region of REGIONS) {
      for (const periodDays of PERIODS) {
        console.log(`Refreshing trends for ${region}, ${periodDays}d...`);
        
        const signals = await fetchAllTrendSignals(region, periodDays);
        
        if (signals.length > 0) {
          // Delete old signals for this region/period (keep last 30 days max)
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - 30);

          await prisma.trendSignal.deleteMany({
            where: {
              region,
              periodDays,
              collectedAt: { lt: cutoffDate },
            },
          });

          // Insert new signals
          await prisma.trendSignal.createMany({
            data: signals.map((s) => ({
              keyword: s.keyword,
              source: s.source,
              region,
              periodDays,
              score: s.score,
              raw: s.raw as object || null,
              collectedAt: new Date(),
            })),
          });

          results.push({ region, periodDays, count: signals.length });
        }
      }
    }

    return NextResponse.json({
      success: true,
      refreshedAt: new Date().toISOString(),
      results,
    });
  } catch (error) {
    console.error("Cron refresh error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to refresh trends" },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}

