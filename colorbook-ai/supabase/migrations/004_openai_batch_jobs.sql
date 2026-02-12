-- Migration: OpenAI Batch Jobs table
-- Stores batch job metadata for image generation via OpenAI Batch API

CREATE TABLE IF NOT EXISTS openai_batch_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id TEXT NOT NULL UNIQUE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  page_indexes JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'queued',
  total_pages INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  failed_page_indexes INTEGER[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_openai_batch_jobs_batch_id ON openai_batch_jobs(batch_id);
CREATE INDEX idx_openai_batch_jobs_project_id ON openai_batch_jobs(project_id);
CREATE INDEX idx_openai_batch_jobs_user_id ON openai_batch_jobs(user_id);
CREATE INDEX idx_openai_batch_jobs_status ON openai_batch_jobs(status);

-- RLS
ALTER TABLE openai_batch_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own batch jobs"
  ON openai_batch_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own batch jobs"
  ON openai_batch_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own batch jobs"
  ON openai_batch_jobs FOR UPDATE
  USING (auth.uid() = user_id);
