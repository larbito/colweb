import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  buildQuotePagePrompt,
  validateQuote,
  normalizeQuote,
  classifyQuoteTopic,
  getMotifPackForTopic,
  type DecorationTheme,
  type TypographyStyle,
  type DecorationDensity,
  type FrameStyle,
  type DecorationLevel,
  type IconSet,
  type QuoteTopic,
  DECORATION_THEMES,
  ICON_SETS,
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
  
  // Decoration level - controls how much decoration appears
  decorationLevel: z.enum(["text_only", "minimal_icons", "border_only", "full_background"]).default("minimal_icons"),
  
  // Icon set (only used with minimal_icons)
  iconSet: z.enum(["stars", "hearts", "doodles", "sports", "kids"]).default("stars"),
  
  // Style settings (used for full_background and border_only modes)
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
 * Now includes:
 * - Topic classification for meaningful decorations
 * - Motif pack selection based on quote meaning
 * - Full prompt included in response for debugging ("View Prompt")
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

    console.log(`[quote/prompts] Generating prompts: ${quotes.length} quotes, level: ${decorationLevel}, typography: ${typographyStyle}`);

    // SERVER-SIDE ENFORCEMENT: text_only mode disables all decoration options
    const isTextOnly = decorationLevel === "text_only";
    if (isTextOnly) {
      console.log(`[quote/prompts] TEXT-ONLY MODE: Forcing iconSet=null, density=none, frameStyle=none`);
    }

    interface PagePrompt {
      page: number;
      quote: string;
      title: string;
      prompt: string;
      decorationTheme: DecorationTheme;
      decorationLevel: DecorationLevel;
      iconSet?: IconSet;
      topic: QuoteTopic;
      keywords: string[];
      motifPack: string[];
      validation: ReturnType<typeof validateQuote>;
      // Settings snapshot for debugging
      appliedSettings: {
        decorationLevel: DecorationLevel;
        typographyStyle: TypographyStyle;
        iconSet?: IconSet;
        decorationTheme?: DecorationTheme;
        density: DecorationDensity;
        frameStyle: FrameStyle;
      };
    }

    const pages: PagePrompt[] = [];

    if (bookType === "different_quotes") {
      // Each page has a different quote
      quotes.forEach((quote, index) => {
        const normalized = normalizeQuote(quote);
        const validation = validateQuote(normalized);
        
        // For TEXT-ONLY mode: skip all decoration logic
        if (isTextOnly) {
          const prompt = buildQuotePagePrompt({
            quote: normalized,
            decorationTheme: "stars", // Ignored for text_only
            typographyStyle,
            density: "low",
            frameStyle: "none",
            decorationLevel: "text_only",
          });

          // Log first prompt for debugging
          if (index === 0) {
            console.log(`[quote/prompts] TEXT-ONLY prompt preview (first 200 chars): ${prompt.slice(0, 200)}...`);
          }

          pages.push({
            page: index + 1,
            quote: normalized,
            title: normalized.slice(0, 30) + (normalized.length > 30 ? "..." : ""),
            prompt,
            decorationTheme: "stars",
            decorationLevel: "text_only",
            iconSet: undefined,
            topic: "general",
            keywords: [],
            motifPack: [], // Empty - no decorations
            validation,
            appliedSettings: {
              decorationLevel: "text_only",
              typographyStyle,
              iconSet: undefined,
              decorationTheme: undefined,
              density: "low",
              frameStyle: "none",
            },
          });
          return; // Continue to next quote
        }

        // For DECORATED modes: full logic
        // Classify quote to get topic and motifs
        const classification = classifyQuoteTopic(normalized);
        const motifPack = getMotifPackForTopic(classification.topic);
        
        // For minimal_icons mode, vary the icon set slightly
        let pageIconSet = iconSet;
        if (decorationLevel === "minimal_icons") {
          const iconSets: IconSet[] = ["stars", "hearts", "doodles", "sports", "kids"];
          pageIconSet = index % 4 === 0 ? iconSets[(iconSets.indexOf(iconSet) + 1) % iconSets.length] : iconSet;
        }
        
        // For full_background mode, vary the theme slightly
        let pageTheme = decorationTheme;
        if (decorationLevel === "full_background") {
          const themes: DecorationTheme[] = ["floral", "stars", "mandala", "hearts", "nature", "geometric", "doodles"];
          pageTheme = index % 3 === 0 ? themes[(themes.indexOf(decorationTheme) + index) % themes.length] : decorationTheme;
        }
        
        // Build the prompt with all settings
        const prompt = buildQuotePagePrompt({
          quote: normalized,
          decorationTheme: pageTheme,
          typographyStyle,
          density,
          frameStyle,
          decorationLevel,
          iconSet: pageIconSet,
          topic: classification.topic,
          keywords: classification.keywords,
          motifPack,
        });

        pages.push({
          page: index + 1,
          quote: normalized,
          title: normalized.slice(0, 30) + (normalized.length > 30 ? "..." : ""),
          prompt,
          decorationTheme: pageTheme,
          decorationLevel,
          iconSet: pageIconSet,
          topic: classification.topic,
          keywords: classification.keywords,
          motifPack,
          validation,
          appliedSettings: {
            decorationLevel,
            typographyStyle,
            iconSet: pageIconSet,
            decorationTheme: pageTheme,
            density,
            frameStyle,
          },
        });
      });
    } else {
      // Same quote with variations
      const mainQuote = normalizeQuote(quotes[0]);
      const validation = validateQuote(mainQuote);
      
      // Typography variations
      const typographyVariations: TypographyStyle[] = ["bubble", "script", "block", "mixed"];
      
      // For TEXT-ONLY mode: only vary typography
      if (isTextOnly) {
        for (let i = 0; i < variationCount; i++) {
          const typo = typographyVariations[i % typographyVariations.length];
          
          const prompt = buildQuotePagePrompt({
            quote: mainQuote,
            decorationTheme: "stars",
            typographyStyle: typo,
            density: "low",
            frameStyle: "none",
            decorationLevel: "text_only",
          });

          pages.push({
            page: i + 1,
            quote: mainQuote,
            title: `${typo} typography`,
            prompt,
            decorationTheme: "stars",
            decorationLevel: "text_only",
            iconSet: undefined,
            topic: "general",
            keywords: [],
            motifPack: [],
            validation,
            appliedSettings: {
              decorationLevel: "text_only",
              typographyStyle: typo,
              iconSet: undefined,
              decorationTheme: undefined,
              density: "low",
              frameStyle: "none",
            },
          });
        }
      } else {
        // For DECORATED modes: full variation logic
        // Classify quote once
        const classification = classifyQuoteTopic(mainQuote);
        const motifPack = getMotifPackForTopic(classification.topic);
        
        // Get variation sets based on decoration level
        const iconVariations = decorationLevel === "minimal_icons" 
          ? getVariationIconSets(variationCount) 
          : [];
        const themeVariations = decorationLevel === "full_background"
          ? getVariationThemes(decorationTheme, variationCount)
          : [];
        
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
            topic: classification.topic,
            keywords: classification.keywords,
            motifPack,
          });

          // Build title based on decoration level
          let title: string;
          if (decorationLevel === "minimal_icons") {
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
            topic: classification.topic,
            keywords: classification.keywords,
            motifPack,
            validation,
            appliedSettings: {
              decorationLevel,
              typographyStyle: typo,
              iconSet: pageIconSet,
              decorationTheme: pageTheme,
              density,
              frameStyle,
            },
          });
        }
      } // end else (decorated modes)
    }

    // Check for any invalid quotes
    const invalidQuotes = pages.filter(p => !p.validation.isValid);
    const warnings = invalidQuotes.map(p => ({
      page: p.page,
      quote: p.quote,
      issue: p.validation.suggestedAction,
    }));

    console.log(`[quote/prompts] Generated ${pages.length} page prompts with topic classification`);

    return NextResponse.json({
      pages: pages.map(p => ({
        page: p.page,
        quote: p.quote,
        title: p.title,
        prompt: p.prompt, // Full prompt for "View Prompt" feature
        decorationTheme: p.decorationTheme,
        decorationLevel: p.decorationLevel,
        iconSet: p.iconSet,
        topic: p.topic,
        keywords: p.keywords,
        motifPack: p.motifPack,
        appliedSettings: p.appliedSettings, // Settings snapshot for debugging
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
