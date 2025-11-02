-- Calendar Feature Database Schema Extension
-- Adds support for calendar events, tasks, and notes

-- Drop existing calendar tables if they exist
DROP TABLE IF EXISTS calendar_event_tags CASCADE;
DROP TABLE IF EXISTS calendar_events CASCADE;

-- Drop existing ENUM types for calendar
DROP TYPE IF EXISTS event_type CASCADE;
DROP TYPE IF EXISTS task_status CASCADE;
DROP TYPE IF EXISTS event_priority CASCADE;

-- Create ENUM types for calendar
CREATE TYPE event_type AS ENUM ('task', 'note', 'solved_problem', 'reminder');
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
CREATE TYPE event_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Calendar Events Table
-- This is the main table for all calendar entries (tasks, notes, practice sessions)
CREATE TABLE calendar_events (
    id BIGSERIAL PRIMARY KEY,
    
    -- Event Classification
    event_type event_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Date and Time Information
    event_date DATE NOT NULL,
    event_time TIME,
    duration_minutes INTEGER,
    all_day BOOLEAN DEFAULT FALSE,
    
    -- Task-specific fields
    task_status task_status DEFAULT 'pending',
    due_date DATE,
    completed_date TIMESTAMP,
    priority event_priority DEFAULT 'medium',
    
    -- Note-specific fields
    note_content TEXT,
    is_pinned BOOLEAN DEFAULT FALSE,
    
    -- Solved Problem specific fields
    problem_id BIGINT REFERENCES problems(id) ON DELETE SET NULL,
    time_spent_minutes INTEGER,
    difficulty VARCHAR(10), -- Easy, Medium, Hard
    
    -- Rich text support
    content_html TEXT, -- For rich text formatting
    
    -- Relationships
    parent_event_id BIGINT REFERENCES calendar_events(id) ON DELETE CASCADE, -- For recurring events or sub-tasks
    
    -- Metadata
    tags TEXT[], -- Array of custom tags
    color VARCHAR(7), -- Hex color code for visual distinction
    is_archived BOOLEAN DEFAULT FALSE,
    
    -- Reminders
    reminder_minutes_before INTEGER, -- Minutes before event to remind
    reminder_sent BOOLEAN DEFAULT FALSE,
    
    -- User preferences
    is_visible BOOLEAN DEFAULT TRUE, -- Allow hiding without deleting
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_due_date CHECK (due_date >= event_date),
    CONSTRAINT valid_color CHECK (color ~ '^#[0-9A-Fa-f]{6}$' OR color IS NULL),
    CONSTRAINT task_fields_check CHECK (
        event_type != 'task' OR (task_status IS NOT NULL)
    ),
    CONSTRAINT note_content_check CHECK (
        event_type != 'note' OR (note_content IS NOT NULL)
    ),
    CONSTRAINT practice_session_check CHECK (
        event_type != 'practice_session' OR (problem_id IS NOT NULL)
    )
);

-- Calendar Event Tags (for linking events to problems, patterns, etc.)
CREATE TABLE calendar_event_tags (
    id BIGSERIAL PRIMARY KEY,
    event_id BIGINT NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
    
    -- Optional references to existing entities
    problem_id BIGINT REFERENCES problems(id) ON DELETE CASCADE,
    pattern_id BIGINT REFERENCES patterns(id) ON DELETE CASCADE,
    variant_id BIGINT REFERENCES variants(id) ON DELETE CASCADE,
    concept_id BIGINT REFERENCES concepts(id) ON DELETE CASCADE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(event_id, problem_id, pattern_id, variant_id, concept_id)
);

-- Indexes for performance optimization
CREATE INDEX idx_calendar_events_event_date ON calendar_events(event_date);
CREATE INDEX idx_calendar_events_event_type ON calendar_events(event_type);
CREATE INDEX idx_calendar_events_task_status ON calendar_events(task_status);
CREATE INDEX idx_calendar_events_due_date ON calendar_events(due_date);
CREATE INDEX idx_calendar_events_problem_id ON calendar_events(problem_id);
CREATE INDEX idx_calendar_events_tags ON calendar_events USING GIN(tags);
CREATE INDEX idx_calendar_events_is_archived ON calendar_events(is_archived);
CREATE INDEX idx_calendar_events_is_visible ON calendar_events(is_visible);
CREATE INDEX idx_calendar_events_date_range ON calendar_events(event_date, event_type);
CREATE INDEX idx_calendar_event_tags_event_id ON calendar_event_tags(event_id);
CREATE INDEX idx_calendar_event_tags_problem_id ON calendar_event_tags(problem_id);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_calendar_events_updated_at 
    BEFORE UPDATE ON calendar_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to get calendar events for a date range
CREATE OR REPLACE FUNCTION get_calendar_events(
    p_start_date DATE,
    p_end_date DATE,
    p_event_types event_type[] DEFAULT NULL,
    p_include_archived BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
    id BIGINT,
    event_type event_type,
    title VARCHAR(255),
    description TEXT,
    event_date DATE,
    event_time TIME,
    task_status task_status,
    priority event_priority,
    problem_id BIGINT,
    problem_title VARCHAR(255),
    problem_difficulty difficulty_level,
    tags TEXT[],
    color VARCHAR(7)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ce.id,
        ce.event_type,
        ce.title,
        ce.description,
        ce.event_date,
        ce.event_time,
        ce.task_status,
        ce.priority,
        ce.problem_id,
        p.title as problem_title,
        p.difficulty as problem_difficulty,
        ce.tags,
        ce.color
    FROM calendar_events ce
    LEFT JOIN problems p ON ce.problem_id = p.id
    WHERE ce.event_date BETWEEN p_start_date AND p_end_date
        AND (p_include_archived = TRUE OR ce.is_archived = FALSE)
        AND ce.is_visible = TRUE
        AND (p_event_types IS NULL OR ce.event_type = ANY(p_event_types))
    ORDER BY ce.event_date ASC, ce.event_time ASC NULLS LAST;
END;
$$ LANGUAGE plpgsql;

-- Function to get events for a specific day
CREATE OR REPLACE FUNCTION get_events_for_day(
    p_date DATE
)
RETURNS TABLE (
    id BIGINT,
    event_type event_type,
    title VARCHAR(255),
    event_time TIME,
    task_status task_status,
    priority event_priority,
    color VARCHAR(7),
    problem_difficulty difficulty_level
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ce.id,
        ce.event_type,
        ce.title,
        ce.event_time,
        ce.task_status,
        ce.priority,
        ce.color,
        p.difficulty as problem_difficulty
    FROM calendar_events ce
    LEFT JOIN problems p ON ce.problem_id = p.id
    WHERE ce.event_date = p_date
        AND ce.is_archived = FALSE
        AND ce.is_visible = TRUE
    ORDER BY ce.event_time ASC NULLS LAST, ce.priority DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to create a practice session event when a problem is solved
CREATE OR REPLACE FUNCTION create_practice_session_event(
    p_problem_id BIGINT,
    p_event_date DATE DEFAULT CURRENT_DATE,
    p_time_spent INTEGER DEFAULT NULL,
    p_was_successful BOOLEAN DEFAULT TRUE,
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
    
    -- Create the practice session event
    INSERT INTO calendar_events (
        event_type,
        title,
        description,
        event_date,
        problem_id,
        time_spent_minutes,
        was_successful,
        color,
        note_content
    ) VALUES (
        'practice_session',
        'Solved: ' || v_problem_title,
        'Practice session for problem #' || p_problem_id,
        p_event_date,
        p_problem_id,
        p_time_spent,
        p_was_successful,
        v_color,
        p_notes
    )
    RETURNING id INTO v_event_id;
    
    RETURN v_event_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get overdue tasks
CREATE OR REPLACE FUNCTION get_overdue_tasks()
RETURNS TABLE (
    id BIGINT,
    title VARCHAR(255),
    due_date DATE,
    priority event_priority,
    days_overdue INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ce.id,
        ce.title,
        ce.due_date,
        ce.priority,
        (CURRENT_DATE - ce.due_date)::INTEGER as days_overdue
    FROM calendar_events ce
    WHERE ce.event_type = 'task'
        AND ce.task_status NOT IN ('completed', 'cancelled')
        AND ce.due_date < CURRENT_DATE
        AND ce.is_archived = FALSE
    ORDER BY ce.due_date ASC, ce.priority DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get calendar statistics for a date range
CREATE OR REPLACE FUNCTION get_calendar_stats(
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    total_events BIGINT,
    total_tasks BIGINT,
    completed_tasks BIGINT,
    pending_tasks BIGINT,
    total_notes BIGINT,
    total_practice_sessions BIGINT,
    total_time_spent INTEGER,
    problems_solved BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_events,
        COUNT(CASE WHEN event_type = 'task' THEN 1 END) as total_tasks,
        COUNT(CASE WHEN event_type = 'task' AND task_status = 'completed' THEN 1 END) as completed_tasks,
        COUNT(CASE WHEN event_type = 'task' AND task_status = 'pending' THEN 1 END) as pending_tasks,
        COUNT(CASE WHEN event_type = 'note' THEN 1 END) as total_notes,
        COUNT(CASE WHEN event_type = 'practice_session' THEN 1 END) as total_practice_sessions,
        COALESCE(SUM(time_spent_minutes), 0)::INTEGER as total_time_spent,
        COUNT(DISTINCT problem_id) as problems_solved
    FROM calendar_events
    WHERE event_date BETWEEN p_start_date AND p_end_date
        AND is_archived = FALSE;
END;
$$ LANGUAGE plpgsql;

-- Views for easier data access

-- View for today's events
CREATE OR REPLACE VIEW todays_events AS
SELECT * FROM get_events_for_day(CURRENT_DATE);

-- View for upcoming tasks (next 7 days)
CREATE OR REPLACE VIEW upcoming_tasks AS
SELECT 
    ce.id,
    ce.title,
    ce.description,
    ce.event_date,
    ce.due_date,
    ce.task_status,
    ce.priority,
    ce.tags
FROM calendar_events ce
WHERE ce.event_type = 'task'
    AND ce.task_status NOT IN ('completed', 'cancelled')
    AND ce.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
    AND ce.is_archived = FALSE
ORDER BY ce.due_date ASC, ce.priority DESC;

-- View for practice session history
CREATE OR REPLACE VIEW practice_session_history AS
SELECT 
    ce.id,
    ce.event_date,
    ce.problem_id,
    p.title as problem_title,
    p.difficulty,
    ce.time_spent_minutes,
    ce.was_successful,
    ce.note_content
FROM calendar_events ce
INNER JOIN problems p ON ce.problem_id = p.id
WHERE ce.event_type = 'practice_session'
    AND ce.is_archived = FALSE
ORDER BY ce.event_date DESC, ce.created_at DESC;

-- View for calendar monthly overview
CREATE OR REPLACE VIEW calendar_monthly_overview AS
SELECT 
    DATE_TRUNC('month', event_date) as month,
    COUNT(*) as total_events,
    COUNT(CASE WHEN event_type = 'task' THEN 1 END) as tasks,
    COUNT(CASE WHEN event_type = 'note' THEN 1 END) as notes,
    COUNT(CASE WHEN event_type = 'practice_session' THEN 1 END) as practice_sessions,
    COUNT(DISTINCT event_date) as active_days
FROM calendar_events
WHERE is_archived = FALSE
GROUP BY DATE_TRUNC('month', event_date)
ORDER BY month DESC;

-- Sample data for testing

-- Insert sample tasks
INSERT INTO calendar_events (event_type, title, description, event_date, due_date, task_status, priority) VALUES
('task', 'Review Binary Search Problems', 'Go through all medium binary search problems', CURRENT_DATE, CURRENT_DATE + INTERVAL '3 days', 'pending', 'high'),
('task', 'Practice Dynamic Programming', 'Focus on 1D DP problems', CURRENT_DATE + INTERVAL '1 day', CURRENT_DATE + INTERVAL '5 days', 'pending', 'medium'),
('task', 'Study Graph Algorithms', 'Review BFS and DFS patterns', CURRENT_DATE + INTERVAL '2 days', CURRENT_DATE + INTERVAL '7 days', 'pending', 'medium');

-- Insert sample notes
INSERT INTO calendar_events (event_type, title, note_content, event_date, is_pinned) VALUES
('note', 'Two Pointers Insight', 'Remember to check for sorted array before applying two pointers technique', CURRENT_DATE, TRUE),
('note', 'Sliding Window Tip', 'Use HashMap to track character frequencies in variable-size windows', CURRENT_DATE - INTERVAL '1 day', FALSE);

-- Grant permissions (adjust as needed)
-- GRANT ALL PRIVILEGES ON TABLE calendar_events TO your_user;
-- GRANT ALL PRIVILEGES ON TABLE calendar_event_tags TO your_user;
-- GRANT ALL PRIVILEGES ON SEQUENCE calendar_events_id_seq TO your_user;
-- GRANT ALL PRIVILEGES ON SEQUENCE calendar_event_tags_id_seq TO your_user;

-- Day Notes Table
-- Stores rich text notes for entire days (separate from event-specific notes)
CREATE TABLE day_notes (
    date DATE PRIMARY KEY,
    notes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for day notes
CREATE INDEX idx_day_notes_date ON day_notes(date);
CREATE INDEX idx_day_notes_updated_at ON day_notes(updated_at);

-- Add day notes functions
CREATE OR REPLACE FUNCTION get_day_notes(target_date DATE)
RETURNS TEXT AS $$
BEGIN
    RETURN (
        SELECT COALESCE(notes, '') 
        FROM day_notes 
        WHERE date = target_date
    );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION save_day_notes(target_date DATE, note_content TEXT)
RETURNS VOID AS $$
BEGIN
    INSERT INTO day_notes (date, notes, created_at, updated_at)
    VALUES (target_date, note_content, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT (date) 
    DO UPDATE SET 
        notes = EXCLUDED.notes,
        updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;