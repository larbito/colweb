import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

/**
 * Route segment config
 */
export const maxDuration = 300;

const requestSchema = z.object({
  images: z.array(z.object({
    pageId: z.number(),
    imageBase64: z.string(),
  })),
  scale: z.number().min(1).max(4).default(2),
});

interface EnhanceResult {
  pageId: number;
  status: "success" | "failed";
  enhancedImageBase64?: string;
  error?: string;
}

/**
 * POST /api/image/enhance-batch
 * 
 * Enhances multiple images sequentially to avoid rate limits.
 * Returns results for each image.
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

    const { images, scale } = parseResult.data;
    const results: EnhanceResult[] = [];

    console.log(`[enhance-batch] Starting batch enhancement of ${images.length} images`);

    // Process images sequentially (or with limited concurrency)
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      console.log(`[enhance-batch] Processing image ${i + 1}/${images.length} (page ${image.pageId})`);

      try {
        // Call the single enhance endpoint
        const response = await fetch(new URL("/api/image/enhance", request.url), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: image.imageBase64,
            scale,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Enhancement failed");
        }

        const data = await response.json();

        results.push({
          pageId: image.pageId,
          status: "success",
          enhancedImageBase64: data.enhancedImageBase64,
        });

        console.log(`[enhance-batch] Page ${image.pageId} enhanced successfully`);

      } catch (error) {
        console.error(`[enhance-batch] Failed to enhance page ${image.pageId}:`, error);
        results.push({
          pageId: image.pageId,
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }

      // Small delay between requests to avoid rate limits
      if (i < images.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    const successCount = results.filter(r => r.status === "success").length;
    console.log(`[enhance-batch] Completed: ${successCount}/${images.length} successful`);

    return NextResponse.json({
      results,
      summary: {
        total: images.length,
        successful: successCount,
        failed: images.length - successCount,
      },
    });

  } catch (error) {
    console.error("[enhance-batch] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process batch" },
      { status: 500 }
    );
  }
}

