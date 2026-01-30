import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  buildQuotePagePrompt,
  validateQuote,
  normalizeQuote,
  type DecorationTheme,
  type TypographyStyle,
  type DecorationDensity,
  type FrameStyle,
  DECORATION_THEMES,
} from "@/lib/quotePagePromptEnforcer";

/**
 * Route segment config
 */
export const maxDuration = 30;

const requestSchema = z.object({
  // Quotes to generate pages for
  quotes: z.array(z.string().min(1)).min(1).max(50),
  
  // Book type
  bookType: z.enum(["different_quotes", "same_quote_variations"]).default("different_quotes"),
  
  // Style settings
  decorationTheme: z.enum(["floral", "stars", "mandala", "hearts", "nature", "geometric", "doodles", "mixed"]).default("floral"),
  typographyStyle: z.enum(["bubble", "script", "block", "mixed"]).default("bubble"),
  density: z.enum(["low", "medium", "high"]).default("medium"),
  frameStyle: z.enum(["none", "thin", "corners"]).default("none"),
  
  // For same_quote_variations mode
  variationCount: z.number().int().min(1).max(20).default(5),
});

/**
 * Generate variation themes for same-quote-variations mode
 */
function getVariationThemes(baseTheme: DecorationTheme, count: number): DecorationTheme[] {
  const allThemes: DecorationTheme[] = ["floral", "stars", "mandala", "hearts", "nature", "geometric", "doodles"];
  
  // Start with base theme, then add others
  const themes: DecorationTheme[] = [baseTheme];
  const remaining = allThemes.filter(t => t !== baseTheme);
  
  // Cycle through remaining themes
  for (let i = 1; i < count; i++) {
    themes.push(remaining[(i - 1) % remaining.length]);
  }
  
  return themes;
}

/**
 * POST /api/quote/prompts
 * 
 * Converts quotes into structured prompts for image generation.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = requestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const {
      quotes,
      bookType,
      decorationTheme,
      typographyStyle,
      density,
      frameStyle,
      variationCount,
    } = parseResult.data;

    console.log(`[quote/prompts] Generating prompts for ${quotes.length} quotes, mode: ${bookType}`);

    interface PagePrompt {
      page: number;
      quote: string;
      title: string;
      prompt: string;
      decorationTheme: DecorationTheme;
      validation: ReturnType<typeof validateQuote>;
    }

    const pages: PagePrompt[] = [];

    if (bookType === "different_quotes") {
      // Each page has a different quote
      quotes.forEach((quote, index) => {
        const normalized = normalizeQuote(quote);
        const validation = validateQuote(normalized);
        
        // Vary decoration slightly for visual interest
        const themeVariation = index % 3 === 0 
          ? decorationTheme 
          : (index % 3 === 1 ? "mixed" : decorationTheme);
        
        const prompt = buildQuotePagePrompt({
          quote: normalized,
          decorationTheme: themeVariation as DecorationTheme,
          typographyStyle,
          density,
          frameStyle,
          pageNumber: index + 1,
          totalPages: quotes.length,
        });

        pages.push({
          page: index + 1,
          quote: normalized,
          title: normalized.slice(0, 30) + (normalized.length > 30 ? "..." : ""),
          prompt,
          decorationTheme: themeVariation as DecorationTheme,
          validation,
        });
      });
    } else {
      // Same quote with variations
      const mainQuote = normalizeQuote(quotes[0]);
      const validation = validateQuote(mainQuote);
      const variationThemes = getVariationThemes(decorationTheme, variationCount);
      
      // Different typography styles for variation
      const typographyVariations: TypographyStyle[] = ["bubble", "script", "block", "mixed"];
      
      for (let i = 0; i < variationCount; i++) {
        const theme = variationThemes[i];
        const typo = typographyVariations[i % typographyVariations.length];
        
        const prompt = buildQuotePagePrompt({
          quote: mainQuote,
          decorationTheme: theme,
          typographyStyle: typo,
          density,
          frameStyle,
          pageNumber: i + 1,
          totalPages: variationCount,
        });

        pages.push({
          page: i + 1,
          quote: mainQuote,
          title: `${DECORATION_THEMES[theme].split(",")[0]} style`,
          prompt,
          decorationTheme: theme,
          validation,
        });
      }
    }

    // Check for any invalid quotes
    const invalidQuotes = pages.filter(p => !p.validation.isValid);
    const warnings = invalidQuotes.map(p => ({
      page: p.page,
      quote: p.quote,
      issue: p.validation.suggestedAction,
    }));

    console.log(`[quote/prompts] Generated ${pages.length} page prompts`);

    return NextResponse.json({
      pages: pages.map(p => ({
        page: p.page,
        quote: p.quote,
        title: p.title,
        prompt: p.prompt,
        decorationTheme: p.decorationTheme,
      })),
      bookType,
      settings: {
        decorationTheme,
        typographyStyle,
        density,
        frameStyle,
      },
      warnings: warnings.length > 0 ? warnings : undefined,
    });

  } catch (error) {
    console.error("[quote/prompts] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate prompts" },
      { status: 500 }
    );
  }
}

