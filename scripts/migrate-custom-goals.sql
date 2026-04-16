-- Migration: Custom Goals
-- Run this in your Supabase SQL editor

-- Custom goals created by students or tutors for a specific student
CREATE TABLE IF NOT EXISTS user_custom_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_by_role TEXT NOT NULL DEFAULT 'student', -- 'student' or 'tutor'
  created_by_name TEXT, -- display name of creator (tutor name, or null for student)
  title TEXT NOT NULL,
  description TEXT,
  track TEXT NOT NULL DEFAULT 'both', -- 'uk', 'us', 'both'
  icon TEXT DEFAULT 'Target',
  color TEXT DEFAULT 'blue',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Individual items (deadlines / milestones / reminders) within a custom goal
CREATE TABLE IF NOT EXISTS user_goal_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID REFERENCES user_custom_goals(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  due_date DATE,
  description TEXT,
  is_completed BOOLEAN DEFAULT false,
  category TEXT DEFAULT 'deadline', -- 'deadline', 'milestone', 'reminder'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_custom_goals_student ON user_custom_goals(student_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_custom_goals_creator ON user_custom_goals(created_by);
CREATE INDEX IF NOT EXISTS idx_goal_items_goal ON user_goal_items(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_items_student ON user_goal_items(student_id);

-- RLS
ALTER TABLE user_custom_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_goal_items ENABLE ROW LEVEL SECURITY;

-- Students can read their own goals
CREATE POLICY "Students read own goals" ON user_custom_goals
  FOR SELECT USING (auth.uid() = student_id);

-- Students can create their own goals
CREATE POLICY "Students create own goals" ON user_custom_goals
  FOR INSERT WITH CHECK (auth.uid() = student_id AND auth.uid() = created_by);

-- Students can update their own goals (and goals created for them)
CREATE POLICY "Students update own goals" ON user_custom_goals
  FOR UPDATE USING (auth.uid() = student_id);

-- Students can delete goals they created themselves
CREATE POLICY "Students delete own goals" ON user_custom_goals
  FOR DELETE USING (auth.uid() = student_id AND auth.uid() = created_by);

-- Tutors can read goals they created
CREATE POLICY "Tutors read created goals" ON user_custom_goals
  FOR SELECT USING (auth.uid() = created_by);

-- Tutors can create goals for students
CREATE POLICY "Tutors create goals" ON user_custom_goals
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Tutors can update goals they created
CREATE POLICY "Tutors update created goals" ON user_custom_goals
  FOR UPDATE USING (auth.uid() = created_by);

-- Tutors can delete goals they created
CREATE POLICY "Tutors delete created goals" ON user_custom_goals
  FOR DELETE USING (auth.uid() = created_by);

-- Goal items: students can manage their own
CREATE POLICY "Students manage own items" ON user_goal_items
  FOR ALL USING (auth.uid() = student_id);

-- Goal items: tutors can manage items on goals they created
CREATE POLICY "Tutors manage items on their goals" ON user_goal_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_custom_goals g
      WHERE g.id = goal_id AND g.created_by = auth.uid()
    )
  );
