-- Migration 003: Add prompts table for persistent project prompts
-- Run this after 002_add_project_expiry.sql

-- ============================================
-- 1. Create prompts table
-- ============================================

CREATE TABLE IF NOT EXISTS project_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  page_index INTEGER NOT NULL,
  title TEXT,
  prompt_text TEXT NOT NULL,
  scene_description TEXT,
  status TEXT NOT NULL DEFAULT 'ready', -- 'ready', 'generating_image', 'image_done', 'image_failed'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint for page_index within a project
CREATE UNIQUE INDEX idx_project_prompts_unique_page
  ON project_prompts(project_id, page_index);

-- Index for project lookups
CREATE INDEX idx_project_prompts_project_id ON project_prompts(project_id);
CREATE INDEX idx_project_prompts_user_id ON project_prompts(user_id);

-- ============================================
-- 2. Add RLS for project_prompts
-- ============================================

ALTER TABLE project_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own prompts"
  ON project_prompts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own prompts"
  ON project_prompts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own prompts"
  ON project_prompts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own prompts"
  ON project_prompts FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 3. Add updated_at trigger for prompts
-- ============================================

CREATE TRIGGER update_project_prompts_updated_at
  BEFORE UPDATE ON project_prompts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. Add more fields to projects table
-- ============================================

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS pages_requested INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS prompts_generated_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS images_generated_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS error_message TEXT,
ADD COLUMN IF NOT EXISTS idea TEXT,
ADD COLUMN IF NOT EXISTS book_type TEXT DEFAULT 'theme'; -- 'storybook' or 'theme'

-- ============================================
-- 5. Function to count prompts and images for a project
-- ============================================

CREATE OR REPLACE FUNCTION update_project_counts(p_project_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE projects
  SET 
    prompts_generated_count = (
      SELECT COUNT(*) FROM project_prompts 
      WHERE project_id = p_project_id
    ),
    images_generated_count = (
      SELECT COUNT(*) FROM generated_assets 
      WHERE project_id = p_project_id 
        AND asset_type = 'page_image' 
        AND status = 'ready'
    ),
    updated_at = NOW()
  WHERE id = p_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. Enable Realtime for project_prompts
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE project_prompts;


