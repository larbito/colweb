import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import OpenAI from "openai";
import { 
  getSupabaseServerClient, 
  uploadToStorage, 
  createSignedUrl,
  getRetentionHours, 
  calculateExpiresAt 
} from "@/lib/supabase/server";
import { sanitizeColoringPngBase64, isImageInvalid } from "@/lib/imageProcessing";

/**
 * Belongs-To Page Generation API
 * 
 * Generates a REAL AI coloring page with:
 * - "THIS BOOK BELONGS TO:" header
 * - A blank name line
 * - Theme character/style matching the book
 * - White background line art
 * 
 * Uses the same validation pipeline as regular coloring pages.
 */
export const maxDuration = 120;

const requestSchema = z.object({
  projectId: z.string().uuid(),
  userId: z.string().uuid(),
  bookTitle: z.string().default("My Coloring Book"),
  // Character/theme info for matching
  mainCharacterDesc: z.string().optional(),
  theme: z.string().optional(),
  stylePreset: z.string().optional(),
  complexity: z.enum(["kids", "medium", "adult"]).default("kids"),
});

const MAX_ATTEMPTS = 5;

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const data = requestSchema.parse(body);
    
    console.log(`[belongs-to] Starting generation for project ${data.projectId}`);
    
    // Build the prompt based on available info
    const prompt = buildBelongsToPrompt(data);
    
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    let imageBase64: string | null = null;
    let attempts = 0;
    let lastError: string | null = null;
    
    // Retry loop with validation
    while (attempts < MAX_ATTEMPTS && !imageBase64) {
      attempts++;
      console.log(`[belongs-to] Attempt ${attempts}/${MAX_ATTEMPTS}`);
      
      try {
        const response = await openai.images.generate({
          model: "gpt-image-1",
          prompt,
          n: 1,
          size: "1024x1536", // Portrait aspect ratio
          response_format: "b64_json",
        });
        
        const rawBase64 = response.data?.[0]?.b64_json;
        if (!rawBase64) {
          lastError = "No image returned from API";
          continue;
        }
        
        // Convert base64 to buffer for validation
        const rawBuffer = Buffer.from(rawBase64, "base64");
        
        // Check for invalid image before sanitizing
        const preCheck = await isImageInvalid(rawBuffer);
        if (preCheck.isInvalid) {
          console.log(`[belongs-to] Pre-sanitize check failed: ${preCheck.reason}`);
          lastError = preCheck.reason || "Invalid image";
          continue;
        }
        
        // Sanitize: flatten to white background, remove alpha
        const sanitized = await sanitizeColoringPngBase64(rawBase64);
        
        // Post-sanitize validation
        const sanitizedBuffer = Buffer.from(sanitized, "base64");
        const postCheck = await isImageInvalid(sanitizedBuffer);
        if (postCheck.isInvalid) {
          console.log(`[belongs-to] Post-sanitize check failed: ${postCheck.reason}`);
          lastError = postCheck.reason || "Invalid after processing";
          continue;
        }
        
        imageBase64 = sanitized;
        
      } catch (apiError) {
        const errorMsg = apiError instanceof Error ? apiError.message : "API error";
        console.error(`[belongs-to] API error on attempt ${attempts}:`, errorMsg);
        lastError = errorMsg;
        
        // Don't retry on billing/auth errors
        if (errorMsg.includes("billing") || errorMsg.includes("quota") || errorMsg.includes("401")) {
          break;
        }
        
        // Exponential backoff
        await new Promise(r => setTimeout(r, 1000 * attempts));
      }
    }
    
    if (!imageBase64) {
      return NextResponse.json({
        error: lastError || "Failed to generate valid image after max attempts",
        attempts,
      }, { status: 500 });
    }
    
    // Upload to storage
    const imageBuffer = Buffer.from(imageBase64, "base64");
    const storagePath = `${data.userId}/${data.projectId}/front/belongsTo.png`;
    
    const { path: uploadedPath, error: uploadError } = await uploadToStorage(
      "generated",
      storagePath,
      imageBuffer,
      "image/png"
    );
    
    if (uploadError) {
      console.error(`[belongs-to] Upload failed:`, uploadError);
      // Return image anyway, just not persisted
      return NextResponse.json({
        success: true,
        imageBase64,
        attempts,
        warning: "Generated but not saved to storage",
      });
    }
    
    // Save to database
    const supabase = getSupabaseServerClient();
    const retentionHours = await getRetentionHours(data.userId);
    const expiresAt = calculateExpiresAt(retentionHours);
    
    // Check if existing asset
    const { data: existing } = await supabase
      .from("generated_assets")
      .select("id")
      .eq("project_id", data.projectId)
      .eq("user_id", data.userId)
      .eq("asset_type", "front_matter")
      .eq("meta->>frontMatterType", "belongsTo")
      .single();
    
    const assetData = {
      project_id: data.projectId,
      user_id: data.userId,
      asset_type: "front_matter" as const,
      storage_bucket: "generated",
      storage_path: uploadedPath,
      mime_type: "image/png",
      status: "ready" as const,
      expires_at: expiresAt,
      meta: {
        frontMatterType: "belongsTo",
        prompt,
        attempts,
        generatedAt: new Date().toISOString(),
        fileSize: imageBuffer.length,
      },
    };
    
    let assetId: string | undefined;
    
    if (existing) {
      const { data: updated } = await supabase
        .from("generated_assets")
        .update(assetData)
        .eq("id", existing.id)
        .select("id")
        .single();
      assetId = updated?.id;
    } else {
      const { data: inserted } = await supabase
        .from("generated_assets")
        .insert(assetData)
        .select("id")
        .single();
      assetId = inserted?.id;
    }
    
    // Get signed URL
    const signedUrl = await createSignedUrl("generated", uploadedPath!, 3600);
    
    const elapsed = Date.now() - startTime;
    console.log(`[belongs-to] SUCCESS in ${elapsed}ms (${attempts} attempts)`);
    
    return NextResponse.json({
      success: true,
      assetId,
      storagePath: uploadedPath,
      signedUrl,
      expiresAt,
      attempts,
      imageBase64, // Include for immediate preview
    });
    
  } catch (error) {
    console.error("[belongs-to] Error:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Generation failed",
    }, { status: 500 });
  }
}

/**
 * Build prompt for Belongs-To page
 * Matches the book's theme/character if available
 */
function buildBelongsToPrompt(data: z.infer<typeof requestSchema>): string {
  const complexityDesc = {
    kids: "simple shapes, thick outlines, large elements, minimal detail, cute and friendly",
    medium: "moderate detail, clean lines, balanced composition",
    adult: "intricate patterns, fine details, elegant design",
  }[data.complexity];
  
  // Base requirements
  const base = `Create a coloring book page (black outlines on pure white background, NO fills, NO shading, NO grayscale).

The page MUST include:
1. Large decorative text at top: "THIS BOOK BELONGS TO:"
2. A horizontal line below for writing a name
3. Decorative border or frame around the edges`;

  // Add character/theme if available
  let characterDesc = "";
  if (data.mainCharacterDesc) {
    characterDesc = `
Include the main character from this book: ${data.mainCharacterDesc}
The character should be shown in a friendly pose (like holding a pencil, waving, or sitting).`;
  } else if (data.theme) {
    characterDesc = `
Include thematic elements matching: "${data.theme}"
Add decorative elements that fit this theme around the border and text.`;
  }

  // Style requirements
  const style = `

Style: ${complexityDesc}
- Pure white background
- Clean black outlines only
- NO solid fills, NO gray tones
- Suitable for coloring with crayons or markers
- Kid-friendly and inviting

Make it look like a professional coloring book ownership page.`;

  return base + characterDesc + style;
}

