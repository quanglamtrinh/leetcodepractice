-- Update calendar schema to replace practice sessions with solved problems

-- Update the event_type enum to replace practice_session with solved_problem
ALTER TYPE event_type RENAME TO event_type_old;
CREATE TYPE event_type AS ENUM ('task', 'note', 'solved_problem', 'reminder');

-- Update existing practice_session events to solved_problem
UPDATE calendar_events 
SET event_type = 'solved_problem'::event_type 
WHERE event_type::text = 'practice_session';

-- Update the table to use the new enum
ALTER TABLE calendar_events 
ALTER COLUMN event_type TYPE event_type USING event_type::text::event_type;

-- Drop the old enum
DROP TYPE event_type_old;

-- Add difficulty column if it doesn't exist
ALTER TABLE calendar_events 
ADD COLUMN IF NOT EXISTS difficulty VARCHAR(10);

-- Remove was_successful column as it's not needed for solved problems
ALTER TABLE calendar_events 
DROP COLUMN IF EXISTS was_successful;

-- Update existing records to set difficulty from problems table
UPDATE calendar_events ce
SET difficulty = p.difficulty::VARCHAR
FROM problems p
WHERE ce.problem_id = p.id 
AND ce.event_type = 'solved_problem'
AND ce.difficulty IS NULL;

-- Drop the old function
DROP FUNCTION IF EXISTS create_practice_session_event(BIGINT, DATE, INTEGER, BOOLEAN, TEXT);

-- Create new function for solved problems
CREATE OR REPLACE FUNCTION create_solved_problem_event(
    p_problem_id BIGINT,
    p_event_date DATE DEFAULT CURRENT_DATE,
    p_time_spent INTEGER DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS BIGINT AS $$
DECLARE
    v_event_id BIGINT;
    v_problem_title VARCHAR(255);
    v_problem_difficulty difficulty_level;
    v_color VARCHAR(7);
BEGIN
    -- Get problem details
    SELECT title, difficulty INTO v_problem_title, v_problem_difficulty
    FROM problems WHERE id = p_problem_id;
    
    -- Determine color based on difficulty
    v_color := CASE v_problem_difficulty
        WHEN 'easy' THEN '#22c55e'
        WHEN 'medium' THEN '#f97316'
        WHEN 'hard' THEN '#ef4444'
    END;
    
    -- Create the solved problem event
    INSERT INTO calendar_events (
        event_type,
        title,
        description,
        event_date,
        problem_id,
        time_spent_minutes,
        difficulty,
        color,
        note_content
    ) VALUES (
        'solved_problem',
        'Solved: ' || v_problem_title,
        'Problem solved on ' || p_event_date,
        p_event_date,
        p_problem_id,
        p_time_spent,
        v_problem_difficulty::VARCHAR,
        v_color,
        p_notes
    )
    RETURNING id INTO v_event_id;
    
    RETURN v_event_id;
END;
$$ LANGUAGE plpgsql;