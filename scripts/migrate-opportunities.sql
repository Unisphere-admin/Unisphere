-- ============================================================
-- Run this in your Supabase dashboard → SQL Editor
-- ============================================================

-- 1. Opportunities catalog table
CREATE TABLE IF NOT EXISTS opportunity (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  organizer   TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('essay-competition','olympiad','scholarship','program','extracurricular')),
  track       TEXT NOT NULL CHECK (track IN ('uk','us','both')),
  deadline    DATE NOT NULL,
  deadline_note TEXT,
  description TEXT NOT NULL,
  details     TEXT,
  external_url TEXT,
  accent      TEXT NOT NULL DEFAULT 'blue',
  tags        TEXT[] NOT NULL DEFAULT '{}',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Allow public read of active opportunities
ALTER TABLE opportunity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active opportunities"
  ON opportunity FOR SELECT
  USING (is_active = true);

CREATE POLICY "Service role has full access to opportunities"
  ON opportunity FOR ALL
  USING (true)
  WITH CHECK (true);

-- 2. Resource download tracking table
CREATE TABLE IF NOT EXISTS resource_download (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  file_path     TEXT NOT NULL,
  file_name     TEXT NOT NULL,
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email    TEXT,
  user_name     TEXT,
  downloaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast per-file count queries
CREATE INDEX IF NOT EXISTS resource_download_path_idx ON resource_download(file_path);
CREATE INDEX IF NOT EXISTS resource_download_user_idx ON resource_download(user_id);

-- Only service role can insert/read (tracking happens server-side)
ALTER TABLE resource_download ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to resource_download"
  ON resource_download FOR ALL
  USING (true)
  WITH CHECK (true);
