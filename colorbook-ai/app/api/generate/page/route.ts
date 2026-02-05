/**
 * POST /api/generate/page
 * 
 * Generate a single coloring page with Supabase persistence.
 * Creates DB row immediately, uploads to storage on success, updates status.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { 
  getSupabaseServerClient, 
  getRetentionHours, 
  calculateExpiresAt,
  uploadToStorage 
} from '@/lib/supabase/server';
import { generateImage, ImageSize } from '@/lib/services/openaiImageGen';
import { buildFinalColoringPrompt } from '@/lib/coloringPagePromptEnforcer';
import { validateGeneratedImage } from '@/lib/services/imageValidator';
import { sanitizeColoringPngBase64 } from '@/lib/imageProcessing';
import type { AssetMeta } from '@/types/database';

export const maxDuration = 300; // 5 minutes

const MAX_ATTEMPTS = 12;
const MAX_WALL_TIME_MS = 120000; // 2 minutes

const requestSchema = z.object({
  projectId: z.string().uuid(),
  userId: z.string(),
  pageNumber: z.number(),
  prompt: z.string(),
  size: z.enum(['square', 'portrait', 'landscape']).default('portrait'),
  validate: z.boolean().default(true),
  // Optional: existing asset ID for regeneration
  assetId: z.string().uuid().optional(),
});

const SIZE_MAP: Record<string, string> = {
  square: '1024x1024',
  portrait: '1024x1536',
  landscape: '1536x1024',
};

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const data = requestSchema.parse(body);
    
    const supabase = getSupabaseServerClient();
    
    // Get retention hours for expiry calculation
    const retentionHours = await getRetentionHours(data.userId);
    const expiresAt = calculateExpiresAt(retentionHours);
    
    // Create or update asset row with status="generating"
    let assetId = data.assetId;
    
    if (!assetId) {
      // Check if asset already exists for this page
      const { data: existing } = await supabase
        .from('generated_assets')
        .select('id')
        .eq('project_id', data.projectId)
        .eq('page_number', data.pageNumber)
        .eq('asset_type', 'page_image')
        .single();
      
      assetId = existing?.id;
    }
    
    const meta: AssetMeta = {
      prompt: data.prompt,
      promptHash: hashPrompt(data.prompt),
      attempts: 0,
      maxAttempts: MAX_ATTEMPTS,
    };
    
    if (assetId) {
      // Update existing asset
      await supabase
        .from('generated_assets')
        .update({
          status: 'generating',
          meta,
          expires_at: null, // Clear expiry while generating
        })
        .eq('id', assetId);
    } else {
      // Create new asset
      const { data: newAsset, error } = await supabase
        .from('generated_assets')
        .insert({
          project_id: data.projectId,
          user_id: data.userId,
          page_number: data.pageNumber,
          asset_type: 'page_image',
          status: 'generating',
          meta,
        })
        .select('id')
        .single();
      
      if (error) {
        console.error('[generate/page] Failed to create asset row:', error);
        return NextResponse.json(
          { error: 'Failed to create asset record' },
          { status: 500 }
        );
      }
      
      assetId = newAsset.id;
    }
    
    console.log(`[generate/page] Starting generation for asset ${assetId}, page ${data.pageNumber}`);
    
    const modelSize = SIZE_MAP[data.size] || '1024x1536';
    
    // Build enhanced prompt with all coloring page constraints
    const enhancedPrompt = buildFinalColoringPrompt(data.prompt, {
      size: modelSize as '1024x1024' | '1024x1536' | '1536x1024' | '1024x1792' | '1792x1024',
    });
    
    // Generation loop with retry
    let lastError: string | null = null;
    let bestImage: string | null = null;
    
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const elapsedMs = Date.now() - startTime;
      if (elapsedMs >= MAX_WALL_TIME_MS) {
        console.log(`[generate/page] Wall time limit reached after ${attempt - 1} attempts`);
        break;
      }
      
      // Update meta with current attempt
      meta.attempts = attempt;
      await supabase
        .from('generated_assets')
        .update({ meta })
        .eq('id', assetId);
      
      try {
        console.log(`[generate/page] Attempt ${attempt}/${MAX_ATTEMPTS}`);
        
        // Generate image
        const result = await generateImage({
          prompt: enhancedPrompt,
          size: modelSize as ImageSize,
          n: 1,
        });
        
        if (!result.images || result.images.length === 0) {
          lastError = 'No image generated';
          await delay(1000 * attempt); // Exponential backoff
          continue;
        }
        
        let imageBase64 = result.images[0];
        
        // Sanitize image (flatten to white background)
        try {
          imageBase64 = await sanitizeColoringPngBase64(imageBase64);
        } catch (sanitizeError) {
          console.error('[generate/page] Sanitization failed:', sanitizeError);
          lastError = 'Image sanitization failed';
          continue;
        }
        
        bestImage = imageBase64;
        
        // Validate if requested
        if (data.validate) {
          // validateGeneratedImage(imageBase64, characterProfile, validateCharacter, validateBottomFill, complexity)
          const validationResult = await validateGeneratedImage(
            imageBase64,
            undefined, // characterProfile
            true,      // validateCharacter
            true,      // validateBottomFill
            'medium'   // complexity
          );
          
          meta.validationResult = {
            valid: validationResult.valid,
            notes: validationResult.outlineValidation?.notes,
          };
          
          if (!validationResult.valid) {
            lastError = validationResult.outlineValidation?.notes || 'Validation failed';
            console.log(`[generate/page] Validation failed: ${lastError}`);
            await delay(1000 * attempt);
            continue;
          }
        }
        
        // Success! Upload to storage
        const storagePath = `${data.userId}/${data.projectId}/pages/page-${data.pageNumber}.png`;
        const imageBuffer = Buffer.from(imageBase64, 'base64');
        
        const { path, error: uploadError } = await uploadToStorage(
          'generated',
          storagePath,
          imageBuffer,
          'image/png'
        );
        
        if (uploadError) {
          console.error('[generate/page] Upload failed:', uploadError);
          lastError = 'Upload to storage failed';
          continue;
        }
        
        // Update asset as ready
        await supabase
          .from('generated_assets')
          .update({
            status: 'ready',
            storage_path: path,
            expires_at: expiresAt,
            meta: {
              ...meta,
              fileSize: imageBuffer.length,
            },
          })
          .eq('id', assetId);
        
        console.log(`[generate/page] Success on attempt ${attempt}! Asset ${assetId} ready`);
        
        return NextResponse.json({
          success: true,
          assetId,
          status: 'ready',
          storagePath: path,
          expiresAt,
          attempts: attempt,
        });
        
      } catch (genError) {
        lastError = genError instanceof Error ? genError.message : 'Generation failed';
        console.error(`[generate/page] Attempt ${attempt} error:`, lastError);
        
        // Check for non-retriable errors
        if (lastError.includes('billing') || lastError.includes('quota')) {
          break;
        }
        
        await delay(1000 * attempt);
      }
    }
    
    // Max attempts reached - mark as failed
    console.log(`[generate/page] Max attempts reached for asset ${assetId}`);
    
    meta.error = lastError || 'Max attempts reached';
    meta.errorCode = 'MAX_ATTEMPTS_EXHAUSTED';
    
    await supabase
      .from('generated_assets')
      .update({
        status: 'failed',
        meta,
      })
      .eq('id', assetId);
    
    return NextResponse.json({
      success: false,
      assetId,
      status: 'failed',
      error: lastError,
      attempts: meta.attempts,
    });
    
  } catch (error) {
    console.error('[generate/page] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    );
  }
}

function hashPrompt(prompt: string): string {
  // Simple hash for prompt comparison
  let hash = 0;
  for (let i = 0; i < prompt.length; i++) {
    const char = prompt.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

