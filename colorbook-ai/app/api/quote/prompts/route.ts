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
  type DecorationLevel,
  type IconSet,
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
  
  // NEW: Decoration level - controls how much decoration appears
  decorationLevel: z.enum(["text_only", "minimal_icons", "border_only", "full_background"]).default("minimal_icons"),
  
  // NEW: Icon set (only used with minimal_icons)
  iconSet: z.enum(["stars", "hearts", "doodles", "sports", "kids"]).default("stars"),
  
  // Style settings (used for full_background mode)
  decorationTheme: z.enum(["floral", "stars", "mandala", "hearts", "nature", "geometric", "doodles", "mixed"]).default("stars"),
  typographyStyle: z.enum(["bubble", "script", "block", "mixed"]).default("bubble"),
  density: z.enum(["low", "medium", "high"]).default("medium"),
  frameStyle: z.enum(["none", "thin", "corners"]).default("thin"),
  
  // For same_quote_variations mode
  variationCount: z.number().int().min(1).max(20).default(5),
});

/**
 * Generate variation icon sets for same-quote-variations mode
 */
function getVariationIconSets(count: number): IconSet[] {
  const allSets: IconSet[] = ["stars", "hearts", "doodles", "sports", "kids"];
  const result: IconSet[] = [];
  
  for (let i = 0; i < count; i++) {
    result.push(allSets[i % allSets.length]);
  }
  
  return result;
}

/**
 * Generate variation themes for same-quote-variations mode (full_background only)
 */
function getVariationThemes(baseTheme: DecorationTheme, count: number): DecorationTheme[] {
  const allThemes: DecorationTheme[] = ["floral", "stars", "mandala", "hearts", "nature", "geometric", "doodles"];
  
  const themes: DecorationTheme[] = [baseTheme];
  const remaining = allThemes.filter(t => t !== baseTheme);
  
  for (let i = 1; i < count; i++) {
    themes.push(remaining[(i - 1) % remaining.length]);
  }
  
  return themes;
}

/**
 * POST /api/quote/prompts
 * 
 * Converts quotes into structured prompts for image generation.
 * Now supports decoration levels for fine-grained control.
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
      decorationLevel,
      iconSet,
      decorationTheme,
      typographyStyle,
      density,
      frameStyle,
      variationCount,
    } = parseResult.data;

    console.log(`[quote/prompts] Generating prompts: ${quotes.length} quotes, level: ${decorationLevel}, mode: ${bookType}`);

    interface PagePrompt {
      page: number;
      quote: string;
      title: string;
      prompt: string;
      decorationTheme: DecorationTheme;
      decorationLevel: DecorationLevel;
      iconSet?: IconSet;
      validation: ReturnType<typeof validateQuote>;
    }

    const pages: PagePrompt[] = [];

    if (bookType === "different_quotes") {
      // Each page has a different quote
      quotes.forEach((quote, index) => {
        const normalized = normalizeQuote(quote);
        const validation = validateQuote(normalized);
        
        // For minimal_icons mode, vary the icon set slightly
        let pageIconSet = iconSet;
        if (decorationLevel === "minimal_icons") {
          const iconSets: IconSet[] = ["stars", "hearts", "doodles", "sports", "kids"];
          // Mostly use the selected set, occasionally vary
          pageIconSet = index % 4 === 0 ? iconSets[(iconSets.indexOf(iconSet) + 1) % iconSets.length] : iconSet;
        }
        
        // For full_background mode, vary the theme slightly
        let pageTheme = decorationTheme;
        if (decorationLevel === "full_background") {
          const themes: DecorationTheme[] = ["floral", "stars", "mandala", "hearts", "nature", "geometric", "doodles"];
          pageTheme = index % 3 === 0 ? themes[(themes.indexOf(decorationTheme) + index) % themes.length] : decorationTheme;
        }
        
        const prompt = buildQuotePagePrompt({
          quote: normalized,
          decorationTheme: pageTheme,
          typographyStyle,
          density,
          frameStyle,
          decorationLevel,
          iconSet: pageIconSet,
          pageNumber: index + 1,
          totalPages: quotes.length,
        });

        pages.push({
          page: index + 1,
          quote: normalized,
          title: normalized.slice(0, 30) + (normalized.length > 30 ? "..." : ""),
          prompt,
          decorationTheme: pageTheme,
          decorationLevel,
          iconSet: pageIconSet,
          validation,
        });
      });
    } else {
      // Same quote with variations
      const mainQuote = normalizeQuote(quotes[0]);
      const validation = validateQuote(mainQuote);
      
      // Get variation sets based on decoration level
      const iconVariations = decorationLevel === "minimal_icons" 
        ? getVariationIconSets(variationCount) 
        : [];
      const themeVariations = decorationLevel === "full_background"
        ? getVariationThemes(decorationTheme, variationCount)
        : [];
      
      // Typography variations
      const typographyVariations: TypographyStyle[] = ["bubble", "script", "block", "mixed"];
      
      for (let i = 0; i < variationCount; i++) {
        const typo = typographyVariations[i % typographyVariations.length];
        const pageIconSet = iconVariations[i] || iconSet;
        const pageTheme = themeVariations[i] || decorationTheme;
        
        const prompt = buildQuotePagePrompt({
          quote: mainQuote,
          decorationTheme: pageTheme,
          typographyStyle: typo,
          density,
          frameStyle,
          decorationLevel,
          iconSet: pageIconSet,
          pageNumber: i + 1,
          totalPages: variationCount,
        });

        // Build title based on decoration level
        let title: string;
        if (decorationLevel === "text_only") {
          title = `${typo} typography`;
        } else if (decorationLevel === "minimal_icons") {
          title = `${pageIconSet} + ${typo}`;
        } else if (decorationLevel === "border_only") {
          title = `${typo} with border`;
        } else {
          title = `${DECORATION_THEMES[pageTheme].split(",")[0]}`;
        }

        pages.push({
          page: i + 1,
          quote: mainQuote,
          title,
          prompt,
          decorationTheme: pageTheme,
          decorationLevel,
          iconSet: pageIconSet,
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
        decorationLevel: p.decorationLevel,
        iconSet: p.iconSet,
      })),
      bookType,
      settings: {
        decorationLevel,
        iconSet,
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
