import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateImage, isOpenAIImageGenConfigured } from "@/lib/services/openaiImageGen";
import {
  buildFinalColoringPrompt,
  assertPromptHasConstraints,
} from "@/lib/coloringPagePromptEnforcer";

/**
 * ⚠️ DEPRECATED ROUTE
 * 
 * This route is kept for backwards compatibility but is deprecated.
 * New code should use POST /api/image/generate instead.
 * 
 * This route now applies no-fill constraints before sending to OpenAI.
 */

const requestSchema = z.object({
  prompt: z.string().min(1),
  complexity: z.enum(["simple", "medium", "detailed"]).optional(),
  lineThickness: z.enum(["thin", "medium", "bold"]).optional(),
  characterLock: z.any().optional(), // Deprecated, ignored
});

export async function POST(request: NextRequest) {
  console.warn("[DEPRECATED] /api/ai/generate-image is deprecated. Use /api/image/generate instead.");
  
  if (!isOpenAIImageGenConfigured()) {
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

    const { prompt } = parseResult.data;

    // Apply no-fill constraints to the prompt
    const finalPrompt = buildFinalColoringPrompt(prompt, {
      includeNegativeBlock: true,
      maxLength: 4000,
    });

    // Safety check: validate constraints are present
    try {
      assertPromptHasConstraints(finalPrompt);
    } catch (constraintError) {
      console.error("[/api/ai/generate-image] Constraint validation failed:", constraintError);
      return NextResponse.json(
        { error: "Internal error: prompt constraints validation failed" },
        { status: 500 }
      );
    }

    console.log(`[/api/ai/generate-image] Applied no-fill constraints, final length: ${finalPrompt.length}`);

    // Use centralized OpenAI service with constrained prompt
    const result = await generateImage({
      prompt: finalPrompt,
      n: 1,
      size: "1024x1024",
    });

    if (!result.images || result.images.length === 0) {
      return NextResponse.json({ error: "No image generated" }, { status: 500 });
    }

    // Return URL-style response for backwards compatibility
    return NextResponse.json({ 
      imageUrl: `data:image/png;base64,${result.images[0]}` 
    });

  } catch (error) {
    console.error("[/api/ai/generate-image] Error:", error);

    if (error instanceof Error) {
      if (error.message.includes("content_policy")) {
        return NextResponse.json(
          { error: "Content policy violation. Please modify the prompt and try again." },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate image" },
      { status: 500 }
    );
  }
}
