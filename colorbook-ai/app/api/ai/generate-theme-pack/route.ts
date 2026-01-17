import { NextRequest, NextResponse } from "next/server";
import { openai, isOpenAIConfigured, TEXT_MODEL, logModelUsage } from "@/lib/openai";
import { z } from "zod";
import { themePackSchema, DEFAULT_FORBIDDEN, DEFAULT_COMPOSITION_RULES } from "@/lib/themePack";

const requestSchema = z.object({
  bookMode: z.enum(["series", "collection"]),
  theme: z.string().min(1),
  subject: z.string().optional(), // e.g., "cats", "dogs", "mixed animals"
  ageGroup: z.string().default("3-8"),
  complexity: z.enum(["simple", "medium", "detailed"]).default("simple"),
});

export async function POST(request: NextRequest) {
  if (!isOpenAIConfigured()) {
    return NextResponse.json(
      { error: "OpenAI API key not configured." },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const parseResult = requestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { bookMode, theme, subject, ageGroup, complexity } = parseResult.data;

    const propsCount = complexity === "simple" ? "10-12" : complexity === "medium" ? "12-15" : "15-18";

    const systemPrompt = `You are a kids coloring book designer creating a "Theme Pack" - a consistent visual world for an entire coloring book.

BOOK TYPE: ${bookMode === "series" ? "Series (same main character on every page)" : "Collection (varied subjects within theme)"}
THEME: ${theme}
${subject ? `PRIMARY SUBJECT: ${subject}` : ""}
AGE GROUP: ${ageGroup} years old
COMPLEXITY: ${complexity}

Generate a ThemePack JSON that defines ONE consistent visual world. All pages in the book will use this same setting and props.

REQUIREMENTS:
1. setting: ONE specific location/world (not generic). Be specific like "Sunny Meadow Farm with red barn" not just "farm".
2. artMood: Keep it cheerful, simple, kawaii for kids.
3. allowedSubjects: List 3-5 specific subjects that fit the theme.
4. recurringProps: List ${propsCount} SPECIFIC props that will appear across pages. Be concrete (not "toy" but "red bouncy ball").
5. backgroundMotifs: 4-6 simple background elements that repeat.
6. forbidden: Keep the defaults plus any theme-specific forbidden items.
7. compositionRules: Keep the defaults.

Return ONLY valid JSON matching this schema:
{
  "themeTitle": "string",
  "setting": "string (specific location)",
  "artMood": "string",
  "allowedSubjects": ["string", ...],
  "recurringProps": ["string", ...] (${propsCount} items),
  "backgroundMotifs": ["string", ...],
  "forbidden": ["string", ...],
  "compositionRules": ["string", ...]
}`;

    logModelUsage("Generate ThemePack", "text", TEXT_MODEL);
    
    const response = await openai.chat.completions.create({
      model: TEXT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate a ThemePack for: "${theme}"${subject ? ` featuring ${subject}` : ""}` },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "No response from AI" }, { status: 500 });
    }

    // Parse JSON
    let jsonContent = content.trim();
    if (jsonContent.startsWith("```json")) jsonContent = jsonContent.slice(7);
    else if (jsonContent.startsWith("```")) jsonContent = jsonContent.slice(3);
    if (jsonContent.endsWith("```")) jsonContent = jsonContent.slice(0, -3);
    jsonContent = jsonContent.trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonContent);
    } catch {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
      }
    }

    // Merge with defaults to ensure completeness
    const mergedPack = {
      ...(parsed as object),
      forbidden: [...new Set([...((parsed as any).forbidden || []), ...DEFAULT_FORBIDDEN])],
      compositionRules: [...new Set([...((parsed as any).compositionRules || []), ...DEFAULT_COMPOSITION_RULES])],
    };

    const validationResult = themePackSchema.safeParse(mergedPack);
    if (!validationResult.success) {
      console.error("ThemePack validation failed:", validationResult.error);
      return NextResponse.json(
        { error: "AI response format invalid", details: validationResult.error.flatten() },
        { status: 500 }
      );
    }

    return NextResponse.json({ themePack: validationResult.data });
  } catch (error) {
    console.error("Generate theme pack error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate theme pack" },
      { status: 500 }
    );
  }
}

