import { NextRequest, NextResponse } from "next/server";
import { getBatchStatus } from "@/lib/services/openaiBatchImageGen";

export const runtime = "nodejs";

/**
 * GET /api/batch/openai/status?batchId=...
 * Returns the current status of an OpenAI batch job
 */
export async function GET(request: NextRequest) {
  const batchId = request.nextUrl.searchParams.get("batchId");
  if (!batchId) {
    return NextResponse.json(
      { error: "batchId is required" },
      { status: 400 }
    );
  }

  try {
    const status = await getBatchStatus(batchId);
    return NextResponse.json(status);
  } catch (error) {
    console.error("[batch/status] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to get status",
      },
      { status: 500 }
    );
  }
}
