-- Migration 002: Add project expiry and status fields
-- Run this after 001_generated_assets.sql

-- ============================================
-- 1. Add project status enum
-- ============================================

CREATE TYPE project_status AS ENUM (
  'draft',
  'generating',
  'ready',
  'failed',
  'expired'
);

-- ============================================
-- 2. Add columns to projects table
-- ============================================

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS status project_status DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS pages_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS retention_hours INTEGER DEFAULT 72,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- ============================================
-- 3. Add file size tracking to assets
-- ============================================

ALTER TABLE generated_assets
ADD COLUMN IF NOT EXISTS file_size BIGINT,
ADD COLUMN IF NOT EXISTS width INTEGER,
ADD COLUMN IF NOT EXISTS height INTEGER;

-- ============================================
-- 4. Index for expiry queries on projects
-- ============================================

CREATE INDEX IF NOT EXISTS idx_projects_expires_at 
ON projects(expires_at) 
WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_projects_status 
ON projects(status);

-- ============================================
-- 5. Function to set project expiry on creation
-- ============================================

CREATE OR REPLACE FUNCTION set_project_expiry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expires_at IS NULL AND NEW.retention_hours IS NOT NULL THEN
    NEW.expires_at := NOW() + (NEW.retention_hours || ' hours')::INTERVAL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_project_expiry
  BEFORE INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION set_project_expiry();

-- ============================================
-- 6. Function to get expired projects
-- ============================================

CREATE OR REPLACE FUNCTION get_expired_projects(batch_size INTEGER DEFAULT 50)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.user_id, p.name
  FROM projects p
  WHERE p.status != 'expired'
    AND p.expires_at IS NOT NULL
    AND p.expires_at < NOW()
  ORDER BY p.expires_at ASC
  LIMIT batch_size;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. Function to mark project as expired
-- ============================================

CREATE OR REPLACE FUNCTION mark_project_expired(project_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Mark project as expired
  UPDATE projects 
  SET status = 'expired', updated_at = NOW()
  WHERE id = project_id;
  
  -- Mark all assets as expired
  UPDATE generated_assets 
  SET status = 'expired', deleted_at = NOW()
  WHERE project_id = project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. Create colweb storage bucket
-- ============================================
-- Run in Supabase Dashboard > Storage:
-- 1. Create bucket named "colweb"
-- 2. Set to Private
--
-- Alternatively, run this SQL (may need storage admin):
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('colweb', 'colweb', false)
-- ON CONFLICT (id) DO NOTHING;

