/**
 * POST /api/projects
 * 
 * Create a new project as draft. Returns the project ID for asset association.
 * Projects persist even if generation is incomplete.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServerClient, getRetentionHours } from '@/lib/supabase/server';

const createProjectSchema = z.object({
  name: z.string().default('Untitled Project'),
  projectType: z.enum(['coloring_book', 'quote_book']).default('coloring_book'),
  bookType: z.enum(['storybook', 'theme']).optional(),
  idea: z.string().optional(),
  pagesRequested: z.number().int().min(1).max(80).optional(),
  settings: z.object({
    bookTitle: z.string().optional(),
    authorName: z.string().optional(),
    pageCount: z.number().optional(),
    complexity: z.string().optional(),
    orientation: z.string().optional(),
    styleProfile: z.string().optional(),
    theme: z.string().optional(),
    model: z.string().optional(),
    size: z.string().optional(),
    lineThickness: z.string().optional(),
    targetAge: z.string().optional(),
    characterProfile: z.any().optional(),
  }).optional().default({}),
  // For anonymous users, we generate a temporary user_id
  userId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = createProjectSchema.parse(body);
    
    const supabase = getSupabaseServerClient();
    
    // Get user ID from auth or use provided/generated ID
    // TODO: Implement proper auth - for now we use a provided or generated ID
    const userId = data.userId || crypto.randomUUID();
    
    // Get retention hours for this user
    const retentionHours = await getRetentionHours(userId);
    
    // Calculate expiry date
    const expiresAt = new Date(Date.now() + retentionHours * 60 * 60 * 1000).toISOString();
    
    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        user_id: userId,
        name: data.name,
        project_type: data.projectType,
        book_type: data.bookType || 'theme',
        idea: data.idea,
        pages_requested: data.pagesRequested || 0,
        settings: data.settings,
        status: 'draft',
        prompts_generated_count: 0,
        images_generated_count: 0,
        retention_hours: retentionHours,
        expires_at: expiresAt,
      })
      .select()
      .single();
    
    if (error) {
      console.error('[projects] Create error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    console.log(`[projects] Created draft project ${project.id} for user ${userId}, pages_requested: ${data.pagesRequested}`);
    
    return NextResponse.json({
      success: true,
      project,
      retentionHours,
    });
    
  } catch (error) {
    console.error('[projects] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create project' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/projects
 * 
 * List all projects for the current user with progress counts.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }
    
    const supabase = getSupabaseServerClient();
    
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    
    if (error) {
      console.error('[projects] List error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    // Enrich with computed fields
    const enrichedProjects = projects.map(p => ({
      ...p,
      isExpired: p.expires_at ? new Date(p.expires_at) < new Date() : false,
      canResume: p.status !== 'ready' && p.status !== 'expired' && 
        (p.prompts_generated_count < p.pages_requested || p.images_generated_count < p.pages_requested),
    }));
    
    return NextResponse.json({
      success: true,
      projects: enrichedProjects,
    });
    
  } catch (error) {
    console.error('[projects] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list projects' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/projects
 * 
 * Update a project's settings, status, or progress counts.
 */
const updateProjectSchema = z.object({
  projectId: z.string().uuid(),
  userId: z.string().optional(),
  name: z.string().optional(),
  idea: z.string().optional(),
  pagesRequested: z.number().int().min(1).max(80).optional(),
  bookType: z.enum(['storybook', 'theme']).optional(),
  status: z.enum(['draft', 'generating', 'ready', 'failed', 'expired', 'partial']).optional(),
  settings: z.record(z.any()).optional(),
  errorMessage: z.string().nullable().optional(),
  promptsGeneratedCount: z.number().int().optional(),
  imagesGeneratedCount: z.number().int().optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const data = updateProjectSchema.parse(body);
    
    const supabase = getSupabaseServerClient();
    
    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    
    if (data.name !== undefined) updateData.name = data.name;
    if (data.idea !== undefined) updateData.idea = data.idea;
    if (data.pagesRequested !== undefined) updateData.pages_requested = data.pagesRequested;
    if (data.bookType !== undefined) updateData.book_type = data.bookType;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.settings !== undefined) updateData.settings = data.settings;
    if (data.errorMessage !== undefined) updateData.error_message = data.errorMessage;
    if (data.promptsGeneratedCount !== undefined) updateData.prompts_generated_count = data.promptsGeneratedCount;
    if (data.imagesGeneratedCount !== undefined) updateData.images_generated_count = data.imagesGeneratedCount;
    
    let query = supabase
      .from('projects')
      .update(updateData)
      .eq('id', data.projectId);
    
    // If userId provided, also check ownership
    if (data.userId) {
      query = query.eq('user_id', data.userId);
    }
    
    const { data: project, error } = await query
      .select()
      .single();
    
    if (error) {
      console.error('[projects] Update error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    console.log(`[projects] Updated project ${data.projectId}, status: ${data.status}, prompts: ${data.promptsGeneratedCount}, images: ${data.imagesGeneratedCount}`);
    
    return NextResponse.json({
      success: true,
      project,
    });
    
  } catch (error) {
    console.error('[projects] Update error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update project' },
      { status: 500 }
    );
  }
}

