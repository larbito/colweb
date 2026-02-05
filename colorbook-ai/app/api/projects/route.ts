/**
 * POST /api/projects
 * 
 * Create a new project. Returns the project ID for asset association.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServerClient, getRetentionHours } from '@/lib/supabase/server';

const createProjectSchema = z.object({
  name: z.string().default('Untitled Project'),
  projectType: z.enum(['coloring_book', 'quote_book']).default('coloring_book'),
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
    
    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        user_id: userId,
        name: data.name,
        project_type: data.projectType,
        settings: data.settings,
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
    
    // Get retention hours for this user
    const retentionHours = await getRetentionHours(userId);
    
    console.log(`[projects] Created project ${project.id} for user ${userId}`);
    
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
 * List all projects for the current user.
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
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('[projects] List error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      projects,
    });
    
  } catch (error) {
    console.error('[projects] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list projects' },
      { status: 500 }
    );
  }
}

