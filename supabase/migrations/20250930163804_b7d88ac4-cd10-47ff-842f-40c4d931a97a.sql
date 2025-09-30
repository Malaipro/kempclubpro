-- Fix foreign key constraint for schedules.instructor_id
-- It should reference trainers table, not profiles

-- Drop the old foreign key constraint
ALTER TABLE schedules
DROP CONSTRAINT IF EXISTS schedules_instructor_id_fkey;

-- Add new foreign key constraint referencing trainers
ALTER TABLE schedules
ADD CONSTRAINT schedules_instructor_id_fkey 
FOREIGN KEY (instructor_id) 
REFERENCES trainers(id) 
ON DELETE SET NULL;