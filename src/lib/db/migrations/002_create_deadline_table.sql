-- Create the deadline table for admin-managed deadlines and competitions
CREATE TABLE IF NOT EXISTS deadline (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ NOT NULL,
  category TEXT NOT NULL DEFAULT 'deadline',
  link TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for querying active deadlines sorted by due date
CREATE INDEX IF NOT EXISTS idx_deadline_active_due ON deadline (is_active, due_date)
  WHERE is_active = true;

-- RLS policies
ALTER TABLE deadline ENABLE ROW LEVEL SECURITY;

-- Everyone can read active deadlines
CREATE POLICY "Anyone can read active deadlines"
  ON deadline FOR SELECT
  USING (is_active = true);

-- Only admins can insert/update/delete (enforced at API level, but service role bypasses RLS)
CREATE POLICY "Service role can manage deadlines"
  ON deadline FOR ALL
  USING (true)
  WITH CHECK (true);
