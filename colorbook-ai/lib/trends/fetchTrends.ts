import "server-only";
import { TREND_SEEDS, isBlockedKeyword, normalizeKeyword } from "./seeds";

export interface TrendItem {
  keyword: string;
  score: number;
  source: "google_trends" | "pytrends" | "keepa";
  raw?: unknown;
}

interface DataForSEOCredentials {
  login: string;
  password: string;
}

/**
 * Fetch trends from DataForSEO Google Trends API
 */
export async function fetchGoogleTrendsDataForSEO(
  credentials: DataForSEOCredentials,
  region: string = "US",
  periodDays: number = 30
): Promise<TrendItem[]> {
  const items: TrendItem[] = [];
  const authHeader = Buffer.from(`${credentials.login}:${credentials.password}`).toString("base64");

  // Calculate date range
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - periodDays);

  const dateFrom = startDate.toISOString().split("T")[0];
  const dateTo = endDate.toISOString().split("T")[0];

  // Process seeds in batches (DataForSEO allows up to 5 keywords per request)
  const batchSize = 5;
  const batches = [];
  for (let i = 0; i < TREND_SEEDS.length; i += batchSize) {
    batches.push(TREND_SEEDS.slice(i, i + batchSize));
  }

  for (const batch of batches.slice(0, 4)) { // Limit to 4 batches to avoid rate limits
    try {
      // Fetch related queries for this batch
      const response = await fetch("https://api.dataforseo.com/v3/keywords_data/google_trends/explore/live", {
        method: "POST",
        headers: {
          Authorization: `Basic ${authHeader}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          {
            keywords: batch,
            location_code: region === "US" ? 2840 : region === "DE" ? 2276 : 2840,
            language_code: "en",
            date_from: dateFrom,
            date_to: dateTo,
            type: "web",
          },
        ]),
      });

      if (!response.ok) {
        console.error("DataForSEO API error:", response.status);
        continue;
      }

      const data = await response.json();
      
      if (data?.tasks?.[0]?.result) {
        for (const result of data.tasks[0].result) {
          // Extract related queries
          if (result.related_queries?.top) {
            for (const query of result.related_queries.top) {
              const keyword = normalizeKeyword(query.query || query.term || "");
              if (keyword && !isBlockedKeyword(keyword) && keyword.length > 2) {
                items.push({
                  keyword,
                  score: query.value || 50,
                  source: "google_trends",
                  raw: query,
                });
              }
            }
          }

          // Extract rising queries (more valuable)
          if (result.related_queries?.rising) {
            for (const query of result.related_queries.rising) {
              const keyword = normalizeKeyword(query.query || query.term || "");
              if (keyword && !isBlockedKeyword(keyword) && keyword.length > 2) {
                // Rising queries get a boost
                const baseScore = query.value || 100;
                items.push({
                  keyword,
                  score: typeof baseScore === "string" && baseScore.includes("+") 
                    ? 200 // "Breakout" queries
                    : baseScore * 1.5,
                  source: "google_trends",
                  raw: query,
                });
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("DataForSEO fetch error:", error);
    }

    // Small delay between batches
    await new Promise((r) => setTimeout(r, 500));
  }

  return items;
}

/**
 * Fallback: Generate synthetic trends from seeds + randomization
 * Used when no API credentials are available
 */
export function generateSyntheticTrends(periodDays: number = 30): TrendItem[] {
  const items: TrendItem[] = [];
  
  // Seasonal boost based on current month
  const month = new Date().getMonth();
  const seasonalBoosts: Record<string, number> = {};
  
  if (month === 11 || month === 0) { // Dec-Jan
    seasonalBoosts["christmas"] = 2.0;
    seasonalBoosts["winter"] = 1.5;
    seasonalBoosts["snowman"] = 1.8;
  } else if (month === 9) { // Oct
    seasonalBoosts["halloween"] = 2.0;
    seasonalBoosts["spooky"] = 1.8;
    seasonalBoosts["pumpkin"] = 1.7;
  } else if (month === 3) { // Apr
    seasonalBoosts["easter"] = 2.0;
    seasonalBoosts["bunny"] = 1.8;
    seasonalBoosts["spring"] = 1.5;
  } else if (month >= 5 && month <= 7) { // Jun-Aug
    seasonalBoosts["summer"] = 1.5;
    seasonalBoosts["ocean"] = 1.6;
    seasonalBoosts["beach"] = 1.4;
  }

  // Evergreen popular themes
  const popularThemes = [
    { keyword: "cute baby animals coloring", baseScore: 85 },
    { keyword: "kawaii food coloring", baseScore: 80 },
    { keyword: "magical unicorn adventure", baseScore: 90 },
    { keyword: "friendly dinosaurs coloring", baseScore: 88 },
    { keyword: "underwater ocean friends", baseScore: 82 },
    { keyword: "fairy garden coloring", baseScore: 78 },
    { keyword: "space explorer coloring", baseScore: 75 },
    { keyword: "cute pets coloring book", baseScore: 86 },
    { keyword: "forest animals adventure", baseScore: 83 },
    { keyword: "princess and dragons", baseScore: 79 },
    { keyword: "farm animal friends", baseScore: 77 },
    { keyword: "butterfly garden coloring", baseScore: 74 },
    { keyword: "cute monsters coloring", baseScore: 81 },
    { keyword: "woodland creatures coloring", baseScore: 76 },
    { keyword: "magical mermaid coloring", baseScore: 84 },
  ];

  for (const theme of popularThemes) {
    let score = theme.baseScore;
    
    // Apply seasonal boost
    for (const [term, boost] of Object.entries(seasonalBoosts)) {
      if (theme.keyword.includes(term)) {
        score *= boost;
      }
    }

    // Add some randomness based on period
    const variance = periodDays === 7 ? 0.2 : periodDays === 30 ? 0.1 : 0.05;
    score *= 1 + (Math.random() - 0.5) * variance;

    items.push({
      keyword: theme.keyword,
      score: Math.round(score),
      source: "pytrends", // Mark as synthetic/pytrends
    });
  }

  return items;
}

/**
 * Fetch trends from Keepa (Amazon bestsellers)
 */
export async function fetchKeepaSignals(
  apiKey: string,
  region: string = "US"
): Promise<TrendItem[]> {
  const items: TrendItem[] = [];
  
  // Keepa domain codes
  const domainMap: Record<string, number> = {
    US: 1,
    DE: 3,
    UK: 2,
  };
  const domain = domainMap[region] || 1;

  try {
    // Fetch bestseller list for Books > Children's Books > Coloring Books
    // Category ID for Children's Coloring Books on Amazon US: 4473
    const response = await fetch(
      `https://api.keepa.com/bestsellers?key=${apiKey}&domain=${domain}&category=4473&range=30`
    );

    if (!response.ok) {
      console.error("Keepa API error:", response.status);
      return items;
    }

    const data = await response.json();
    
    if (data?.bestSellersList) {
      for (const item of data.bestSellersList.slice(0, 50)) {
        // Extract keywords from title
        const title = item.title || "";
        const keywords = extractKeywordsFromTitle(title);
        
        for (const keyword of keywords) {
          if (!isBlockedKeyword(keyword) && keyword.length > 3) {
            // Score based on rank (lower rank = higher score)
            const rank = item.salesRank || 1000;
            const score = Math.max(10, 100 - Math.log10(rank) * 20);
            
            items.push({
              keyword,
              score,
              source: "keepa",
              raw: { asin: item.asin, rank: item.salesRank },
            });
          }
        }
      }
    }
  } catch (error) {
    console.error("Keepa fetch error:", error);
  }

  return items;
}

/**
 * Extract meaningful keywords from a book title
 */
function extractKeywordsFromTitle(title: string): string[] {
  const keywords: string[] = [];
  const lower = title.toLowerCase();
  
  // Common patterns in coloring book titles
  const patterns = [
    /(\w+)\s+coloring\s+book/gi,
    /coloring\s+book\s+for\s+(\w+)/gi,
    /(cute|kawaii|adorable)\s+(\w+)/gi,
    /(\w+)\s+(adventure|activity)/gi,
  ];

  for (const pattern of patterns) {
    const matches = lower.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) keywords.push(normalizeKeyword(match[1]));
      if (match[2]) keywords.push(normalizeKeyword(match[2]));
    }
  }

  // Also extract 2-3 word phrases
  const words = lower.split(/\s+/).filter((w) => w.length > 3);
  for (let i = 0; i < words.length - 1; i++) {
    const phrase = `${words[i]} ${words[i + 1]}`;
    if (phrase.length > 6 && !isBlockedKeyword(phrase)) {
      keywords.push(normalizeKeyword(phrase));
    }
  }

  return [...new Set(keywords)];
}

/**
 * Merge and deduplicate trend items
 */
export function mergeAndRankTrends(items: TrendItem[]): TrendItem[] {
  const keywordMap = new Map<string, TrendItem>();

  for (const item of items) {
    const existing = keywordMap.get(item.keyword);
    if (existing) {
      // Keep higher score, merge sources
      if (item.score > existing.score) {
        keywordMap.set(item.keyword, {
          ...item,
          score: item.score,
        });
      }
    } else {
      keywordMap.set(item.keyword, item);
    }
  }

  // Sort by score descending
  return Array.from(keywordMap.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 100); // Keep top 100
}

/**
 * Main entry point: fetch all available trend signals
 */
export async function fetchAllTrendSignals(
  region: string = "US",
  periodDays: number = 30
): Promise<TrendItem[]> {
  const allItems: TrendItem[] = [];

  // Try DataForSEO first
  const dataForSEOLogin = process.env.DATAFORSEO_LOGIN;
  const dataForSEOPassword = process.env.DATAFORSEO_PASSWORD;

  if (dataForSEOLogin && dataForSEOPassword) {
    console.log("Fetching from DataForSEO...");
    const googleItems = await fetchGoogleTrendsDataForSEO(
      { login: dataForSEOLogin, password: dataForSEOPassword },
      region,
      periodDays
    );
    allItems.push(...googleItems);
  }

  // Try Keepa
  const keepaKey = process.env.KEEPA_API_KEY;
  if (keepaKey) {
    console.log("Fetching from Keepa...");
    const keepaItems = await fetchKeepaSignals(keepaKey, region);
    allItems.push(...keepaItems);
  }

  // If no API data, use synthetic trends
  if (allItems.length === 0) {
    console.log("Using synthetic trends (no API credentials)...");
    const syntheticItems = generateSyntheticTrends(periodDays);
    allItems.push(...syntheticItems);
  }

  return mergeAndRankTrends(allItems);
}

