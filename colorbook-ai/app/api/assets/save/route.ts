import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { 
  getSupabaseServerClient, 
  uploadToStorage, 
  getRetentionHours, 
  calculateExpiresAt 
} from "@/lib/supabase/server";
import { base64ToBuffer, sanitizeColoringPng } from "@/lib/imageProcessing";

/**
 * Save Generated Asset to Supabase
 * 
 * Uploads image to storage and creates/updates asset record.
 * This is called after each successful page generation.
 */
export const maxDuration = 60;

const requestSchema = z.object({
  projectId: z.string().uuid(),
  userId: z.string().uuid(),
  pageNumber: z.number().int().min(1).optional(),
  assetType: z.enum(["page_image", "front_matter", "pdf", "zip", "preview"]),
  imageBase64: z.string(),
  meta: z.object({
    prompt: z.string().optional(),
    title: z.string().optional(),
    frontMatterType: z.enum(["title", "copyright", "belongsTo"]).optional(),
    attempts: z.number().optional(),
    validationResult: z.any().optional(),
  }).optional(),
  // Option to skip sanitization (for already-processed images)
  skipSanitize: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = requestSchema.parse(body);
    
    console.log(`[save-asset] Saving ${data.assetType} for project ${data.projectId}`);
    
    // Sanitize image unless skipped
    let imageBuffer: Buffer;
    try {
      const rawBuffer = base64ToBuffer(data.imageBase64);
      
      if (data.skipSanitize || data.assetType !== "page_image") {
        imageBuffer = rawBuffer;
      } else {
        imageBuffer = await sanitizeColoringPng(rawBuffer);
      }
    } catch (sanitizeError) {
      const msg = sanitizeError instanceof Error ? sanitizeError.message : "Sanitization failed";
      console.error(`[save-asset] Sanitize error: ${msg}`);
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    
    // Determine storage path
    let storagePath: string;
    if (data.assetType === "front_matter" && data.meta?.frontMatterType) {
      storagePath = `${data.userId}/${data.projectId}/front/${data.meta.frontMatterType}.png`;
    } else if (data.assetType === "page_image" && data.pageNumber) {
      const paddedNum = String(data.pageNumber).padStart(3, "0");
      storagePath = `${data.userId}/${data.projectId}/pages/page-${paddedNum}.png`;
    } else {
      storagePath = `${data.userId}/${data.projectId}/${data.assetType}-${Date.now()}.png`;
    }
    
    // Upload to storage
    const { path: uploadedPath, error: uploadError } = await uploadToStorage(
      "generated",
      storagePath,
      imageBuffer,
      "image/png"
    );
    
    if (uploadError) {
      console.error(`[save-asset] Upload failed: ${uploadError.message}`);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }
    
    // Get retention hours and calculate expiry
    const retentionHours = await getRetentionHours(data.userId);
    const expiresAt = calculateExpiresAt(retentionHours);
    
    // Save to database
    const supabase = getSupabaseServerClient();
    
    // Upsert asset record
    const assetData = {
      project_id: data.projectId,
      user_id: data.userId,
      page_number: data.pageNumber || null,
      asset_type: data.assetType,
      storage_bucket: "generated",
      storage_path: uploadedPath,
      mime_type: "image/png",
      status: "ready" as const,
      expires_at: expiresAt,
      meta: {
        ...data.meta,
        fileSize: imageBuffer.length,
        savedAt: new Date().toISOString(),
      },
    };
    
    // Check if asset already exists (for upsert)
    let existingAsset = null;
    if (data.assetType === "front_matter" && data.meta?.frontMatterType) {
      const { data: existing } = await supabase
        .from("generated_assets")
        .select("id")
        .eq("project_id", data.projectId)
        .eq("asset_type", "front_matter")
        .eq("meta->>frontMatterType", data.meta.frontMatterType)
        .single();
      existingAsset = existing;
    } else if (data.assetType === "page_image" && data.pageNumber) {
      const { data: existing } = await supabase
        .from("generated_assets")
        .select("id")
        .eq("project_id", data.projectId)
        .eq("asset_type", "page_image")
        .eq("page_number", data.pageNumber)
        .single();
      existingAsset = existing;
    }
    
    let assetId: string;
    
    if (existingAsset) {
      // Update existing
      const { data: updated, error: updateError } = await supabase
        .from("generated_assets")
        .update(assetData)
        .eq("id", existingAsset.id)
        .select("id")
        .single();
      
      if (updateError) {
        console.error(`[save-asset] Update failed: ${updateError.message}`);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
      
      assetId = updated.id;
    } else {
      // Insert new
      const { data: inserted, error: insertError } = await supabase
        .from("generated_assets")
        .insert(assetData)
        .select("id")
        .single();
      
      if (insertError) {
        console.error(`[save-asset] Insert failed: ${insertError.message}`);
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
      
      assetId = inserted.id;
    }
    
    console.log(`[save-asset] Saved asset ${assetId} at ${uploadedPath}`);
    
    return NextResponse.json({
      success: true,
      assetId,
      storagePath: uploadedPath,
      expiresAt,
    });
    
  } catch (error) {
    console.error("[save-asset] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save asset" },
      { status: 500 }
    );
  }
}

