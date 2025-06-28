-- Migration to decouple tutoring_sessions from messages
-- This migration removes the message_id dependency and adds display_order for conversation sorting
-- Note: While display_order is kept for backwards compatibility, we now use created_at for sorting

-- 1. First, add a new display_order column to store the position in conversation
ALTER TABLE tutoring_session
ADD COLUMN display_order TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. Initialize display_order based on existing created_at timestamps
UPDATE tutoring_session
SET display_order = created_at;

-- 3. Create a trigger to automatically set display_order on insert
-- Note: This trigger is kept for backwards compatibility but we now use created_at for ordering
CREATE OR REPLACE FUNCTION set_tutoring_session_display_order()
RETURNS TRIGGER AS $$
BEGIN
  -- Set display_order to current timestamp if not provided
  IF NEW.display_order IS NULL THEN
    NEW.display_order := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_display_order_on_insert
BEFORE INSERT ON tutoring_session
FOR EACH ROW
EXECUTE FUNCTION set_tutoring_session_display_order();

-- 4. Remove the foreign key constraint to message table
-- First get constraint name
DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'tutoring_session'::regclass::oid
    AND conname LIKE '%message_id_fkey%';
  
  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE tutoring_session DROP CONSTRAINT ' || constraint_name;
  END IF;
END $$;

-- 5. Make message_id nullable during transition
ALTER TABLE tutoring_session
ALTER COLUMN message_id DROP NOT NULL;

-- Note: We're not fully removing the message_id column yet to allow for smooth transition
-- It can be removed in a future migration after ensuring all code has been updated 