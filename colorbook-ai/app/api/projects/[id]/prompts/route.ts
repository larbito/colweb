/**
 * API routes for project prompts
 * 
 * POST /api/projects/[id]/prompts - Save/upsert prompts for a project
 * GET /api/projects/[id]/prompts - Get all prompts for a project
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServerClient } from '@/lib/supabase/server';

const promptSchema = z.object({
  pageIndex: z.number().int().min(1),
  title: z.string().optional(),
  promptText: z.string(),
  sceneDescription: z.string().optional(),
  status: z.enum(['ready', 'generating_image', 'image_done', 'image_failed']).default('ready'),
});

const savePromptsSchema = z.object({
  prompts: z.array(promptSchema),
  userId: z.string(),
  // If true, will upsert (update existing or insert new)
  upsert: z.boolean().default(true),
});

/**
 * POST /api/projects/[id]/prompts
 * 
 * Save prompts for a project. Supports batched inserts and upserts.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const data = savePromptsSchema.parse(body);
    
    const supabase = getSupabaseServerClient();
    
    // Verify project exists and belongs to user
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, user_id, pages_requested')
      .eq('id', projectId)
      .eq('user_id', data.userId)
      .single();
    
    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      );
    }
    
    // Prepare prompts for insertion
    const promptsToSave = data.prompts.map(p => ({
      project_id: projectId,
      user_id: data.userId,
      page_index: p.pageIndex,
      title: p.title || `Page ${p.pageIndex}`,
      prompt_text: p.promptText,
      scene_description: p.sceneDescription || null,
      status: p.status,
    }));
    
    let result;
    
    if (data.upsert) {
      // Upsert - update if exists, insert if not
      const { data: savedPrompts, error } = await supabase
        .from('project_prompts')
        .upsert(promptsToSave, {
          onConflict: 'project_id,page_index',
          ignoreDuplicates: false,
        })
        .select();
      
      result = { savedPrompts, error };
    } else {
      // Insert only
      const { data: savedPrompts, error } = await supabase
        .from('project_prompts')
        .insert(promptsToSave)
        .select();
      
      result = { savedPrompts, error };
    }
    
    if (result.error) {
      console.error('[prompts] Save error:', result.error);
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 }
      );
    }
    
    // Update project prompts count
    const { error: updateError } = await supabase
      .from('projects')
      .update({
        prompts_generated_count: data.prompts.length,
        status: 'generating', // Project now has prompts
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId);
    
    if (updateError) {
      console.warn('[prompts] Failed to update project count:', updateError);
    }
    
    console.log(`[prompts] Saved ${data.prompts.length} prompts for project ${projectId}`);
    
    return NextResponse.json({
      success: true,
      savedCount: result.savedPrompts?.length || 0,
      prompts: result.savedPrompts,
    });
    
  } catch (error) {
    console.error('[prompts] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save prompts' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/projects/[id]/prompts
 * 
 * Get all prompts for a project, ordered by page index.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }
    
    const supabase = getSupabaseServerClient();
    
    // Get prompts for the project
    const { data: prompts, error } = await supabase
      .from('project_prompts')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .order('page_index', { ascending: true });
    
    if (error) {
      console.error('[prompts] Get error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      prompts: prompts || [],
      count: prompts?.length || 0,
    });
    
  } catch (error) {
    console.error('[prompts] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get prompts' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/projects/[id]/prompts
 * 
 * Update a single prompt's status (e.g., after image generation).
 */
const updatePromptSchema = z.object({
  pageIndex: z.number().int().min(1),
  userId: z.string(),
  status: z.enum(['ready', 'generating_image', 'image_done', 'image_failed']).optional(),
  title: z.string().optional(),
  promptText: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const data = updatePromptSchema.parse(body);
    
    const supabase = getSupabaseServerClient();
    
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    
    if (data.status !== undefined) updateData.status = data.status;
    if (data.title !== undefined) updateData.title = data.title;
    if (data.promptText !== undefined) updateData.prompt_text = data.promptText;
    
    const { data: prompt, error } = await supabase
      .from('project_prompts')
      .update(updateData)
      .eq('project_id', projectId)
      .eq('page_index', data.pageIndex)
      .eq('user_id', data.userId)
      .select()
      .single();
    
    if (error) {
      console.error('[prompts] Update error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      prompt,
    });
    
  } catch (error) {
    console.error('[prompts] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update prompt' },
      { status: 500 }
    );
  }
}

