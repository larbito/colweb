-- Migration: Create generated_assets table and related infrastructure
-- Run this in your Supabase SQL editor or via CLI

-- ============================================
-- 1. Create ENUM types
-- ============================================

-- Asset type enum
CREATE TYPE asset_type AS ENUM (
  'page_image',
  'front_matter', 
  'pdf',
  'zip',
  'preview'
);

-- Asset status enum
CREATE TYPE asset_status AS ENUM (
  'generating',
  'ready',
  'failed',
  'expired'
);

-- Project type enum
CREATE TYPE project_type AS ENUM (
  'coloring_book',
  'quote_book'
);

-- ============================================
-- 2. Create projects table
-- ============================================

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Untitled Project',
  project_type project_type NOT NULL DEFAULT 'coloring_book',
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for user lookups
CREATE INDEX idx_projects_user_id ON projects(user_id);

-- ============================================
-- 3. Create generated_assets table
-- ============================================

CREATE TABLE IF NOT EXISTS generated_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  page_number INTEGER,
  asset_type asset_type NOT NULL,
  storage_bucket TEXT NOT NULL DEFAULT 'generated',
  storage_path TEXT,
  mime_type TEXT NOT NULL DEFAULT 'image/png',
  status asset_status NOT NULL DEFAULT 'generating',
  expires_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  meta JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_generated_assets_project_id ON generated_assets(project_id);
CREATE INDEX idx_generated_assets_user_id ON generated_assets(user_id);
CREATE INDEX idx_generated_assets_status ON generated_assets(status);
CREATE INDEX idx_generated_assets_expires_at ON generated_assets(expires_at) WHERE expires_at IS NOT NULL;

-- Unique constraint for page_number within a project (for page_image type)
CREATE UNIQUE INDEX idx_generated_assets_project_page 
  ON generated_assets(project_id, page_number) 
  WHERE asset_type = 'page_image' AND page_number IS NOT NULL;

-- Unique constraint for front matter type within a project
CREATE UNIQUE INDEX idx_generated_assets_front_matter
  ON generated_assets(project_id, (meta->>'frontMatterType'))
  WHERE asset_type = 'front_matter';

-- ============================================
-- 4. Enable Row Level Security (RLS)
-- ============================================

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_assets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for projects
CREATE POLICY "Users can view their own projects"
  ON projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
  ON projects FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for generated_assets
CREATE POLICY "Users can view their own assets"
  ON generated_assets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own assets"
  ON generated_assets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own assets"
  ON generated_assets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own assets"
  ON generated_assets FOR DELETE
  USING (auth.uid() = user_id);

-- Service role policy (for cleanup cron)
CREATE POLICY "Service role has full access to assets"
  ON generated_assets FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================
-- 5. Auto-update updated_at trigger
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_generated_assets_updated_at
  BEFORE UPDATE ON generated_assets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. Enable Realtime for generated_assets
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE generated_assets;

-- ============================================
-- 7. Create storage bucket (run separately in Supabase dashboard)
-- ============================================
-- 
-- In Supabase Dashboard > Storage:
-- 1. Create bucket named "generated"
-- 2. Set to Private (not public)
-- 3. Configure CORS if needed
--
-- Bucket policies (apply via SQL):

-- Allow authenticated users to upload to their own folder
-- INSERT INTO storage.policies (bucket_id, name, definition)
-- VALUES (
--   'generated',
--   'Users can upload to their folder',
--   '{"allowedMethods": ["POST", "PUT"], "condition": "bucket_id = ''generated'' AND auth.uid()::text = (storage.foldername(name))[1]"}'
-- );

-- ============================================
-- 8. Helper function: Get expired assets for cleanup
-- ============================================

CREATE OR REPLACE FUNCTION get_expired_assets(batch_size INTEGER DEFAULT 100)
RETURNS TABLE (
  id UUID,
  storage_bucket TEXT,
  storage_path TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT ga.id, ga.storage_bucket, ga.storage_path
  FROM generated_assets ga
  WHERE ga.status = 'ready'
    AND ga.expires_at IS NOT NULL
    AND ga.expires_at < NOW()
    AND ga.deleted_at IS NULL
  ORDER BY ga.expires_at ASC
  LIMIT batch_size;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 9. Helper function: Mark assets as expired
-- ============================================

CREATE OR REPLACE FUNCTION mark_assets_expired(asset_ids UUID[])
RETURNS INTEGER AS $$
DECLARE
  affected INTEGER;
BEGIN
  UPDATE generated_assets
  SET status = 'expired', deleted_at = NOW()
  WHERE id = ANY(asset_ids);
  
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

