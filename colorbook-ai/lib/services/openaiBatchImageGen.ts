/**
 * OpenAI Batch API for Image Generation
 *
 * Submits image generation requests as a batch job for 50% cost savings.
 * Uses /v1/images/generations endpoint in batch mode.
 */

import { getOpenAI } from "@/lib/openai";
import {
  buildFinalColoringPrompt,
  type ImageSize,
} from "@/lib/coloringPagePromptEnforcer";
import { buildOutlineOnlyContract } from "@/lib/characterIdentity";
import {
  buildCharacterIdentityContract,
  type CharacterIdentityProfile,
} from "@/lib/characterIdentity";
import { sanitizeColoringPngBase64 } from "@/lib/imageProcessing";
import {
  getSupabaseServerClient,
  uploadToStorage,
  getRetentionHours,
  calculateExpiresAt,
  createSignedUrl,
} from "@/lib/supabase/server";

const IMAGE_MODEL = "gpt-image-1";

const COLORING_PAGE_PREFIX = `IMPORTANT: Generate a COLORING BOOK PAGE with PURE WHITE background (#FFFFFF). 
The output must be BLACK LINE ART on WHITE BACKGROUND ONLY. No colors, no gray, no shading.
This is a printable coloring page - the background MUST be pure white paper.

`;

// Map sizes to GPT Image model compatible sizes
const SIZE_TO_GPT: Record<string, string> = {
  "1024x1024": "1024x1024",
  "1024x1536": "1024x1536",
  "1536x1024": "1536x1024",
  "1024x1792": "1024x1536",
  "1792x1024": "1536x1024",
};

export interface BatchPageItem {
  pageIndex: number;
  prompt: string;
  title?: string;
}

export interface CreateImageBatchParams {
  projectId: string;
  userId: string;
  pages: BatchPageItem[];
  size?: string;
  isStorybookMode?: boolean;
  characterProfile?: CharacterIdentityProfile;
  complexity?: string;
}

export interface CreateImageBatchResult {
  batchId: string;
  jobId: string;
  pageCount: number;
}

export interface BatchStatusResult {
  status: string;
  total: number;
  completed: number;
  failed: number;
  outputFileId?: string;
  errorFileId?: string;
}

export interface FinalizeResult {
  successCount: number;
  failedCount: number;
  failedPageIndexes: number[];
  updatedPages: Array<{
    pageIndex: number;
    storagePath: string;
    signedUrl?: string;
  }>;
}

/**
 * Build prompt for batch - same logic as generate-one (single pass, no retry)
 */
function buildBatchPrompt(
  page: BatchPageItem,
  params: CreateImageBatchParams
): string {
  let basePrompt = page.prompt;

  if (params.isStorybookMode && params.characterProfile) {
    const identityContract = buildCharacterIdentityContract(params.characterProfile);
    basePrompt = `${basePrompt}\n${identityContract}`;
  }

  basePrompt = `${basePrompt}\n${buildOutlineOnlyContract()}`;

  const finalPrompt = buildFinalColoringPrompt(basePrompt, {
    includeNegativeBlock: true,
    maxLength: 4500,
    size: (params.size || "1024x1024") as ImageSize,
    isStorybookMode: params.isStorybookMode ?? false,
    extraBottomReinforcement: false,
    extraCoverageReinforcement: false,
  });

  return COLORING_PAGE_PREFIX + finalPrompt;
}

/**
 * Create and submit an OpenAI batch job for image generation
 */
export async function createImageBatch(
  params: CreateImageBatchParams
): Promise<CreateImageBatchResult> {
  const openai = getOpenAI();
  const size = SIZE_TO_GPT[params.size || "1024x1024"] || "1024x1536";

  const lines: string[] = [];
  for (const page of params.pages) {
    const prompt = buildBatchPrompt(page, params);
    const body = {
      model: IMAGE_MODEL,
      prompt,
      size,
      n: 1,
      response_format: "b64_json" as const,
    };
    const customId = `page-${page.pageIndex}`;
    lines.push(
      JSON.stringify({
        custom_id: customId,
        method: "POST",
        url: "/v1/images/generations",
        body,
      })
    );
  }

  const jsonlContent = lines.join("\n");

  // Upload file (File is required by SDK, Blob may not have name/lastModified)
  const fileBlob = new File([jsonlContent], "batch.jsonl", { type: "application/jsonl" });
  const file = await openai.files.create({
    file: fileBlob,
    purpose: "batch",
  });

  // Create batch (images/generations supported per Batch API docs; SDK types may lag)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const batch = await openai.batches.create({
    input_file_id: file.id,
    endpoint: "/v1/images/generations",
    completion_window: "24h",
  } as any);

  // Store in DB
  const supabase = getSupabaseServerClient();
  const { data: job, error } = await supabase
    .from("openai_batch_jobs")
    .insert({
      batch_id: batch.id,
      project_id: params.projectId,
      user_id: params.userId,
      page_indexes: params.pages.map((p) => ({
        pageIndex: p.pageIndex,
        prompt: p.prompt,
        title: p.title,
      })),
      status: "queued",
      total_pages: params.pages.length,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[openaiBatchImageGen] Failed to store batch job:", error);
    // Still return batchId - we can poll without DB
  }

  return {
    batchId: batch.id,
    jobId: job?.id ?? batch.id,
    pageCount: params.pages.length,
  };
}

/**
 * Get batch status from OpenAI
 */
export async function getBatchStatus(batchId: string): Promise<BatchStatusResult> {
  const openai = getOpenAI();
  const batch = await openai.batches.retrieve(batchId);

  const counts = batch.request_counts ?? { total: 0, completed: 0, failed: 0 };

  return {
    status: batch.status || "unknown",
    total: counts.total ?? 0,
    completed: counts.completed ?? 0,
    failed: counts.failed ?? 0,
    outputFileId: batch.output_file_id ?? undefined,
    errorFileId: batch.error_file_id ?? undefined,
  };
}

/**
 * Finalize batch: download output, save images to storage, update DB
 */
export async function finalizeBatch(
  batchId: string,
  projectId: string,
  userId: string
): Promise<FinalizeResult> {
  const openai = getOpenAI();
  const supabase = getSupabaseServerClient();

  const batch = await openai.batches.retrieve(batchId);
  if (batch.status !== "completed" || !batch.output_file_id) {
    throw new Error(
      `Batch not ready for finalize: status=${batch.status}, outputFileId=${batch.output_file_id}`
    );
  }

  // Get job record for page metadata
  const { data: job } = await supabase
    .from("openai_batch_jobs")
    .select("page_indexes")
    .eq("batch_id", batchId)
    .single();

  const pageIndexes = (job?.page_indexes as { pageIndex: number; prompt?: string; title?: string }[]) ?? [];
  const pageMap = new Map(pageIndexes.map((p) => [p.pageIndex, p]));

  const fileResponse = await openai.files.content(batch.output_file_id);
  const content = await fileResponse.text();

  const lines = content.split("\n").filter((l) => l.trim());
  const retentionHours = await getRetentionHours(userId);
  const expiresAt = calculateExpiresAt(retentionHours);

  const failedPageIndexes: number[] = [];
  const updatedPages: FinalizeResult["updatedPages"] = [];

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line) as {
        custom_id?: string;
        response?: { status_code?: number; body?: { data?: Array<{ b64_json?: string }> } };
        error?: { message?: string };
      };

      const customId = parsed.custom_id;
      if (!customId || !customId.startsWith("page-")) continue;

      const pageIndex = parseInt(customId.replace("page-", ""), 10);
      if (isNaN(pageIndex)) continue;

      const statusCode = parsed.response?.status_code ?? 0;
      const body = parsed.response?.body;

      if (statusCode !== 200 || !body?.data?.[0]?.b64_json) {
        failedPageIndexes.push(pageIndex);
        continue;
      }

      let imageBase64 = body.data[0].b64_json;

      try {
        imageBase64 = await sanitizeColoringPngBase64(imageBase64);
      } catch (e) {
        console.error(`[openaiBatchImageGen] Sanitize failed for page ${pageIndex}:`, e);
        failedPageIndexes.push(pageIndex);
        continue;
      }

      const paddedNum = String(pageIndex).padStart(3, "0");
      const storagePath = `${userId}/${projectId}/pages/page-${paddedNum}.png`;
      const buffer = Buffer.from(imageBase64, "base64");

      const { path: uploadedPath, error: uploadError } = await uploadToStorage(
        "generated",
        storagePath,
        buffer,
        "image/png"
      );

      if (uploadError) {
        console.error(`[openaiBatchImageGen] Upload failed for page ${pageIndex}:`, uploadError);
        failedPageIndexes.push(pageIndex);
        continue;
      }

      const pageMeta = pageMap.get(pageIndex);
      const assetData = {
        project_id: projectId,
        user_id: userId,
        page_number: pageIndex,
        asset_type: "page_image" as const,
        storage_bucket: "generated",
        storage_path: uploadedPath,
        mime_type: "image/png",
        status: "ready" as const,
        expires_at: expiresAt,
        meta: {
          prompt: pageMeta?.prompt,
          title: pageMeta?.title,
          batchId,
          source: "openai_batch",
        },
      };

      const { data: existing } = await supabase
        .from("generated_assets")
        .select("id")
        .eq("project_id", projectId)
        .eq("asset_type", "page_image")
        .eq("page_number", pageIndex)
        .single();

      if (existing) {
        await supabase
          .from("generated_assets")
          .update(assetData)
          .eq("id", existing.id);
      } else {
        await supabase.from("generated_assets").insert(assetData);
      }

      const signedUrl = await createSignedUrl(
        "generated",
        uploadedPath,
        3600
      );
      updatedPages.push({
        pageIndex,
        storagePath: uploadedPath,
        signedUrl: signedUrl ?? undefined,
      });
    } catch (e) {
      console.error(`[openaiBatchImageGen] Error processing line:`, e);
    }
  }

  // Mark job as completed
  await supabase
    .from("openai_batch_jobs")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      success_count: updatedPages.length,
      failed_count: failedPageIndexes.length,
      failed_page_indexes: failedPageIndexes,
    })
    .eq("batch_id", batchId);

  return {
    successCount: updatedPages.length,
    failedCount: failedPageIndexes.length,
    failedPageIndexes,
    updatedPages,
  };
}
