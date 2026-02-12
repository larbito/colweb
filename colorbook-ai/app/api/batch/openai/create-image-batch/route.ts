import { NextRequest, NextResponse } from "next/server";
import { createImageBatch } from "@/lib/services/openaiBatchImageGen";
import { isOpenAIImageGenConfigured } from "@/lib/services/openaiImageGen";
import { z } from "zod";

export const maxDuration = 60;
export const runtime = "nodejs";

const requestSchema = z.object({
  projectId: z.string().uuid(),
  userId: z.string().uuid(),
  pages: z.array(
    z.object({
      pageIndex: z.number().int().min(1),
      prompt: z.string().min(1),
      title: z.string().optional(),
    })
  ),
  size: z
    .enum(["1024x1024", "1024x1792", "1792x1024", "1024x1536", "1536x1024"])
    .default("1024x1024"),
  isStorybookMode: z.boolean().default(false),
  characterProfile: z.any().optional(),
  complexity: z.string().optional(),
});

/**
 * POST /api/batch/openai/create-image-batch
 * Creates and submits an OpenAI batch job for image generation
 */
export async function POST(request: NextRequest) {
  if (!isOpenAIImageGenConfigured()) {
    return NextResponse.json(
      { error: "OpenAI API key not configured" },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const data = requestSchema.parse(body);

    if (data.pages.length === 0) {
      return NextResponse.json(
        { error: "At least one page is required" },
        { status: 400 }
      );
    }

    const result = await createImageBatch({
      projectId: data.projectId,
      userId: data.userId,
      pages: data.pages.map((p) => ({
        pageIndex: p.pageIndex,
        prompt: p.prompt,
        title: p.title,
      })),
      size: data.size,
      isStorybookMode: data.isStorybookMode,
      characterProfile: data.characterProfile,
      complexity: data.complexity,
    });

    console.log(
      `[create-image-batch] Created batch ${result.batchId} for ${result.pageCount} pages`
    );

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.flatten() },
        { status: 400 }
      );
    }
    console.error("[create-image-batch] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to create batch",
      },
      { status: 500 }
    );
  }
}
