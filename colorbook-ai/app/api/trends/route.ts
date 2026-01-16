import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateSyntheticTrends, mergeAndRankTrends } from "@/lib/trends/fetchTrends";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const region = searchParams.get("region") || "US";
  const periodDays = parseInt(searchParams.get("periodDays") || "30");

  try {
    // Try to get from database first
    const latestSignals = await prisma.trendSignal.findMany({
      where: {
        region,
        periodDays,
      },
      orderBy: [
        { collectedAt: "desc" },
        { score: "desc" },
      ],
      take: 100,
    });

    // Get the latest collection timestamp
    const latestTimestamp = latestSignals.length > 0 
      ? latestSignals[0].collectedAt 
      : null;

    // If we have recent data (within 24 hours), use it
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    if (latestTimestamp && latestTimestamp > oneDayAgo) {
      // Deduplicate by keyword, keeping highest score
      const keywordMap = new Map<string, typeof latestSignals[0]>();
      for (const signal of latestSignals) {
        const existing = keywordMap.get(signal.keyword);
        if (!existing || signal.score > existing.score) {
          keywordMap.set(signal.keyword, signal);
        }
      }

      const items = Array.from(keywordMap.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, 30)
        .map((s) => ({
          keyword: s.keyword,
          score: Math.round(s.score),
          source: s.source,
        }));

      return NextResponse.json({
        updatedAt: latestTimestamp.toISOString(),
        region,
        periodDays,
        items,
        fromCache: true,
      });
    }

    // Fallback to synthetic trends if no database data
    console.log("No recent trend data, using synthetic trends");
    const syntheticItems = generateSyntheticTrends(periodDays);
    const merged = mergeAndRankTrends(syntheticItems);

    return NextResponse.json({
      updatedAt: new Date().toISOString(),
      region,
      periodDays,
      items: merged.slice(0, 30).map((s) => ({
        keyword: s.keyword,
        score: Math.round(s.score),
        source: s.source,
      })),
      fromCache: false,
      synthetic: true,
    });
  } catch (error) {
    console.error("Trends API error:", error);
    
    // Even on error, return synthetic trends so UI doesn't break
    const syntheticItems = generateSyntheticTrends(periodDays);
    
    return NextResponse.json({
      updatedAt: new Date().toISOString(),
      region,
      periodDays,
      items: syntheticItems.slice(0, 30).map((s) => ({
        keyword: s.keyword,
        score: Math.round(s.score),
        source: s.source,
      })),
      fromCache: false,
      synthetic: true,
      error: error instanceof Error ? error.message : "Database error",
    });
  }
}

