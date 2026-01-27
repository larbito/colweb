import { NextRequest, NextResponse } from "next/server";
import { openai, isOpenAIConfigured } from "@/lib/openai";
import { z } from "zod";
import { characterLockSchema } from "@/lib/schemas";
import type { GenerationSpec } from "@/lib/generationSpec";

// Accept GenerationSpec directly
const generationSpecSchema = z.object({
  trimSize: z.string(),
  pixelSize: z.string(),
  complexity: z.enum(["simple", "medium", "detailed"]),
  lineThickness: z.enum(["thin", "medium", "bold"]),
  pageCount: z.number().int().min(1).max(80),
  includeBlankBetween: z.boolean(),
  includeBelongsTo: z.boolean(),
  includePageNumbers: z.boolean(),
  includeCopyrightPage: z.boolean(),
  stylePreset: z.literal("kids-kdp"),
});

const requestSchema = z.object({
  theme: z.string().min(1),
  mainCharacter: z.string().optional(),
  characterLock: characterLockSchema.optional().nullable(),
  spec: generationSpecSchema,
});

const pagePromptSchema = z.object({
  pageNumber: z.number(),
  sceneTitle: z.string(),
  prompt: z.string(),
});

const responseSchema = z.object({
  pages: z.array(pagePromptSchema),
});

export type PromptGenerationRequest = z.infer<typeof requestSchema>;
export type PromptListResponse = z.infer<typeof responseSchema>;

// Complexity guidelines for prompt generation
const COMPLEXITY_GUIDE = {
  simple: "1 main subject + 2-4 simple props, minimal/no background, very large coloring areas",
  medium: "1-2 subjects + 4-8 props, light simple background, moderate detail",
  detailed: "1-2 subjects + 8-12 props, more intricate patterns but still NO shading",
};

const LINE_GUIDE = {
  thin: "medium outer lines, thin inner details",
  medium: "thick outer lines, medium inner details", 
  bold: "very thick outer lines, thick inner details - forgiving for young children",
};

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
      console.error("Validation error:", JSON.stringify(parseResult.error.flatten(), null, 2));
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { theme, mainCharacter, characterLock, spec } = parseResult.data;

    // Build character section for system prompt
    let characterSection = mainCharacter ? `MAIN CHARACTER: ${mainCharacter}` : "";
    if (characterLock) {
      characterSection = `
MAIN CHARACTER (LOCKED - ALL PAGES MUST SHOW THIS EXACT CHARACTER):
Name: ${characterLock.canonicalName}
Body: ${characterLock.visualRules.proportions}
Face: ${characterLock.visualRules.face}
Unique Features: ${characterLock.visualRules.uniqueFeatures.join(", ")}
Outfit: ${characterLock.visualRules.outfit}

IMPORTANT: The character MUST look IDENTICAL on every page - same face, same body proportions, same outfit, same features.`;
    }

    const systemPrompt = `You are a children's coloring book prompt writer creating a ${spec.pageCount}-page story series.

THEME: ${theme}
${characterSection}

GENERATION SPEC:
- Trim Size: ${spec.trimSize}
- Complexity: ${spec.complexity} - ${COMPLEXITY_GUIDE[spec.complexity]}
- Line Thickness: ${spec.lineThickness} - ${LINE_GUIDE[spec.lineThickness]}

YOUR TASK:
Generate ${spec.pageCount} scene prompts that form a cohesive story arc. Each prompt describes ONE coloring page.

RULES FOR EACH PROMPT:
1. Feature the main character prominently
2. Describe a SINGLE clear scene/moment
3. Match the complexity level: "${spec.complexity}"
4. Suitable for black & white LINE ART coloring page
5. NO text, speech bubbles, or written words in the scene
6. Include 1-2 simple background elements appropriate to complexity
7. Keep scenes varied but connected (story progression)
8. Portrait orientation - vertical composition

COMPLEXITY "${spec.complexity}" MEANS:
${COMPLEXITY_GUIDE[spec.complexity]}

Return a JSON object with this exact structure:
{
  "pages": [
    {
      "pageNumber": 1,
      "sceneTitle": "Short 3-5 word title",
      "prompt": "Detailed scene description for image generation..."
    },
    ...
  ]
}

Each prompt should be 2-4 sentences describing exactly what appears in the scene.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate ${spec.pageCount} coloring page prompts for this coloring book.` },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "No response from AI" }, { status: 500 });
    }

    // Parse JSON from response
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

    const validationResult = responseSchema.safeParse(parsed);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "AI response format invalid", details: validationResult.error.flatten() },
        { status: 500 }
      );
    }

    return NextResponse.json(validationResult.data);
  } catch (error) {
    console.error("Generate prompts error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate prompts" },
      { status: 500 }
    );
  }
}
