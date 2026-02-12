import { NextRequest, NextResponse } from "next/server";
import { finalizeBatch } from "@/lib/services/openaiBatchImageGen";
import { z } from "zod";

export const maxDuration = 300;
export const runtime = "nodejs";

const requestSchema = z.object({
  batchId: z.string().min(1),
  projectId: z.string().uuid(),
  userId: z.string().uuid(),
});

/**
 * POST /api/batch/openai/finalize
 * Downloads batch output, saves images to storage, updates DB
 * Call when batch status is "completed"
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = requestSchema.parse(body);

    const result = await finalizeBatch(
      data.batchId,
      data.projectId,
      data.userId
    );

    console.log(
      `[batch/finalize] Completed: ${result.successCount} success, ${result.failedCount} failed`
    );

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.flatten() },
        { status: 400 }
      );
    }
    console.error("[batch/finalize] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to finalize batch",
      },
      { status: 500 }
    );
  }
}
