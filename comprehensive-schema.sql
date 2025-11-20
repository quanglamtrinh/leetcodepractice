-- Comprehensive LeetCode Practice Database Schema with Multi-User Support
-- Based on the database-upgrade-ui-form design document
-- This schema supports patterns, variants, techniques, concepts, goals, advanced review tracking, and multi-user authentication

-- Drop existing tables if they exist (for clean restart)
DROP TABLE IF EXISTS calendar_events CASCADE;
DROP TABLE IF EXISTS calendar_tasks CASCADE;
DROP TABLE IF EXISTS calendar_notes CASCADE;
DROP TABLE IF EXISTS user_progress CASCADE;
DROP TABLE IF EXISTS proiew_histo CASCADE;
DROP TABLE IF EXISTS mistakes CASCADE;
DROP TABLE IF EXISTS review_attempts CASCADE;
DROP TABLE IF EXISTS review_patterns CASCADE;
DROP TABLE IF EXISTS review_history CASCADE;
DROP TABLE IF EXISTS variants CASCADE;
DROP TABLE IF EXISTS patterns CASCADE;
DROP TABLE IF EXISTS template_variants CASCADE;
DROP TABLE IF EXISTS template_basics CASCADE;
DROP TABLE IF EXISTS goals CASCADE;
DROP TABLE IF EXISTS techniques CASCADE;
DROP TABLE IF EXISTS concepts CASCADE;
DROP TABLE IF EXISTS problems CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop existing ENUM types if they exist
DROP TYPE IF EXISTS difficulty_level CASCADE;
DROP TYPE IF EXISTS review_result CASCADE;
DROP TYPE IF EXISTS mistake_type CASCADE;

-- Create ENUM types
CREATE TYPE difficulty_level AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE review_result AS ENUM ('remembered', 'forgot');
CREATE TYPE mistake_type AS ENUM (
    'logic_error', 'syntax_error', 'edge_case', 'time_complexity',
    'space_complexity', 'algorithm_choice', 'implementation_detail',
    'off_by_one', 'boundary_condition', 'data_structure_choice',
    'optimization', 'other'
);

-- ============================================================================
-- USER AUTHENTICATION AND MANAGEMENT
-- ============================================================================

-- Users table for multi-user
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Create index on email for fast lookups during authentication
CREATE INDEX idx_users_email ON users(email);

-- Add comments to users table
COMMENT ON TABLE users IS 'Stores user accounts with authentication credentials';
COMMENT ON COLUMN users.email IS 'Unique email address for user authentication';
COMMENT ON COLUMN users.password_hash IS 'Bcrypt hashed password (never store plain text)';
COMMENT ON COLUMN users.last_login IS 'Timestamp of most recent successful login';

-- ============================================================================
-- CORE REFERENCE TABLES
-- ============================================================================

-- Concepts table
CREATE TABLE concepts (
    id BIGSERIAL PRIMARY KEY,
    concept_id VARCHAR(50) UNIQUE NOT NULL, -- For easy reference like 'two-pointers'
    name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Techniques table
CREATE TABLE techniques (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Goals table
CREATE TABLE goals (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TEMPLATE SYSTEM
-- ============================================================================

-- Template basics table
CREATE TABLE template_basics (
    id BIGSERIAL PRIMARY KEY,
    description TEXT NOT NULL,
    template_code TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Template variants table
CREATE TABLE template_variants (
    id BIGSERIAL PRIMARY KEY,
    description TEXT NOT NULL,
    template_code TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- PATTERN AND VARIANT SYSTEM
-- ============================================================================

-- Patterns table
CREATE TABLE patterns (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    template_id BIGINT REFERENCES template_basics(id),
    concept_id BIGINT REFERENCES concepts(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Variants table
CREATE TABLE variants (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    use_when TEXT,
    notes TEXT,
    pattern_id BIGINT REFERENCES patterns(id),
    technique_id BIGINT REFERENCES techniques(id),
    goal_id BIGINT REFERENCES goals(id),
    concept_id BIGINT REFERENCES concepts(id),
    template_pattern_id BIGINT, -- References patterns or template_variants
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- PROBLEMS TABLE (SHARED ACROSS USERS)
-- ============================================================================

-- Problems table (shared problem database - user-specific data is in user_progress)
CREATE TABLE problems (
    id BIGSERIAL PRIMARY KEY,
    problem_id BIGINT UNIQUE NOT NULL, -- LeetCode problem number
    title VARCHAR(255) NOT NULL,
    concept VARCHAR(100),
    difficulty difficulty_level NOT NULL,
    acceptance_rate DECIMAL(5,2),
    popularity BIGINT,
    leetcode_link TEXT,
    solution TEXT,
    similar_problems BIGINT[] DEFAULT '{}', -- Array of problem IDs for similar problems
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE problems IS 'Shared problem database - user-specific data is in user_progress table';

-- ============================================================================
-- USER-SPECIFIC PROGRESS TRACKING
-- ============================================================================

-- User progress table (replaces solved and notes columns from problems table)
CREATE TABLE user_progress (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    problem_id BIGINT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    solved BOOLEAN DEFAULT FALSE,
    solved_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_problem UNIQUE (user_id, problem_id)
);

-- Create indexes for efficient queries
CREATE INDEX idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX idx_user_progress_problem_id ON user_progress(problem_id);
CREATE INDEX idx_user_progress_solved ON user_progress(user_id, solved);

COMMENT ON TABLE user_progress IS 'Stores user-specific progress for each problem';
COMMENT ON COLUMN user_progress.user_id IS 'Foreign key to users table';
COMMENT ON COLUMN user_progress.problem_id IS 'Foreign key to problems table';
COMMENT ON COLUMN user_progress.solved IS 'Whether the user has solved this problem';
COMMENT ON COLUMN user_progress.solved_at IS 'Timestamp when user marked problem as solved';
COMMENT ON COLUMN user_progress.notes IS 'User-specific notes for this problem';

-- ============================================================================
-- PROBLEM TAGS (FLEXIBLE MANY-TO-MANY ASSOCIATIONS)
-- ============================================================================

-- Problem tags
CREATE TABLE problem_tags (
    id BIGSERIAL PRIMARY KEY,
    problem_id BIGINT REFERENCES problems(id) ON DELETE CASCADE,
    variant_id BIGINT REFERENCES variants(id) ON DELETE CASCADE,
    pattern_id BIGINT REFERENCES patterns(id) ON DELETE CASCADE,
    goal_id BIGINT REFERENCES goals(id) ON DELETE CASCADE,
    technique_id BIGINT REFERENCES techniques(id) ON DELETE CASCADE,
    concept_id BIGINT REFERENCES concepts(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Ensure at least two associations per tag
    CHECK (
        (problem_id IS NOT NULL)::int + 
        (variant_id IS NOT NULL)::int + 
        (pattern_id IS NOT NULL)::int + 
        (goal_id IS NOT NULL)::int + 
        (technique_id IS NOT NULL)::int + 
        (concept_id IS NOT NULL)::int >= 2
    )
);

-- ============================================================================
-- REVIEW AND TRACKING SYSTEM (USER-SPECIFIC)
-- ============================================================================

-- Review history table (with user_id for multi-user support)
CREATE TABLE review_history (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    problem_id BIGINT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    review_date DATE NOT NULL DEFAULT CURRENT_DATE,
    result review_result NOT NULL,
    interval_days INTEGER NOT NULL,
    next_review_date DATE NOT NULL,
    review_notes TEXT,
    time_spent_minutes INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON COLUMN review_history.user_id IS 'Foreign key to users table for user-specific review tracking';

-- Review attempts table (with user_id for detailed tracking)
CREATE TABLE review_attempts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    problem_id BIGINT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    attempt_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    success BOOLEAN NOT NULL,
    time_spent_minutes INTEGER,
    notes TEXT,
    difficulty_rating INTEGER CHECK (difficulty_rating BETWEEN 1 AND 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON COLUMN review_attempts.user_id IS 'Foreign key to users table for user-specific attempt tracking';

-- Review patterns table (spaced repetition patterns)
CREATE TABLE review_patterns (
    id BIGSERIAL PRIMARY KEY,
    difficulty difficulty_level NOT NULL,
    pattern INTEGER[] NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Mistakes table (with user_id for user-specific mistake tracking)
CREATE TABLE mistakes (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    problem_id BIGINT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    mistake_type mistake_type NOT NULL DEFAULT 'other',
    code_snippet TEXT,
    correction TEXT,
    review_session_id BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON COLUMN mistakes.user_id IS 'Foreign key to users table for user-specific mistake tracking';

-- ============================================================================
-- CALENDAR SYSTEM (USER-SPECIFIC)
-- ============================================================================

-- Calendar notes table
CREATE TABLE calendar_notes (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    note_date DATE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_calendar_notes_user_date ON calendar_notes(user_id, note_date);

COMMENT ON TABLE calendar_notes IS 'Stores user calendar notes for specific dates';
COMMENT ON COLUMN calendar_notes.user_id IS 'Foreign key to users table';
COMMENT ON COLUMN calendar_notes.note_date IS 'Date associated with the note';

-- Task priority enum
CREATE TYPE task_priority AS ENUM ('none', 'low', 'medium', 'high');

-- Calendar tasks table
CREATE TABLE calendar_tasks (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_date DATE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority task_priority DEFAULT 'none',
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_calendar_tasks_user_date ON calendar_tasks(user_id, task_date);
CREATE INDEX idx_calendar_tasks_completed ON calendar_tasks(user_id, completed);
CREATE INDEX idx_calendar_tasks_priority ON calendar_tasks(user_id, priority) WHERE priority != 'none';

COMMENT ON TABLE calendar_tasks IS 'Stores user calendar tasks with completion tracking';
COMMENT ON COLUMN calendar_tasks.user_id IS 'Foreign key to users table';
COMMENT ON COLUMN calendar_tasks.task_date IS 'Date associated with the task';
COMMENT ON COLUMN calendar_tasks.description IS 'Optional task description';
COMMENT ON COLUMN calendar_tasks.priority IS 'Task priority: none (default), low, medium, high';
COMMENT ON COLUMN calendar_tasks.completed IS 'Whether the task has been completed';
COMMENT ON COLUMN calendar_tasks.completed_at IS 'Timestamp when task was marked complete';

-- Calendar events table
CREATE TABLE calendar_events (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_date DATE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIME,
    end_time TIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (
        (start_time IS NULL AND end_time IS NULL) OR 
        (start_time IS NOT NULL AND end_time IS NOT NULL AND end_time > start_time)
    )
);

CREATE INDEX idx_calendar_events_user_date ON calendar_events(user_id, event_date);

COMMENT ON TABLE calendar_events IS 'Stores user calendar events with optional time constraints';
COMMENT ON COLUMN calendar_events.user_id IS 'Foreign key to users table';
COMMENT ON COLUMN calendar_events.event_date IS 'Date of the event';
COMMENT ON COLUMN calendar_events.description IS 'Optional event description';
COMMENT ON COLUMN calendar_events.start_time IS 'Optional start time of the event';
COMMENT ON COLUMN calendar_events.end_time IS 'Optional end time of the event (must be after start_time if both provided)';

-- ============================================================================
-- INDEXES FOR BETTER PERFORMANCE
-- ============================================================================

CREATE INDEX idx_problems_difficulty ON problems(difficulty);
CREATE INDEX idx_problems_problem_id ON problems(problem_id);
CREATE INDEX idx_problems_similar_problems ON problems USING GIN(similar_problems);
CREATE INDEX idx_review_history_user_id ON review_history(user_id);
CREATE INDEX idx_review_history_problem_id ON review_history(problem_id);
CREATE INDEX idx_review_history_review_date ON review_history(review_date);
CREATE INDEX idx_review_history_next_review_date ON review_history(next_review_date);
CREATE INDEX idx_review_history_user_next_review ON review_history(user_id, next_review_date);
CREATE INDEX idx_review_history_user_problem ON review_history(user_id, problem_id);
CREATE INDEX idx_review_attempts_user_id ON review_attempts(user_id);
CREATE INDEX idx_review_attempts_problem_id ON review_attempts(problem_id);
CREATE INDEX idx_review_attempts_attempt_date ON review_attempts(attempt_date);
CREATE INDEX idx_review_attempts_user_problem ON review_attempts(user_id, problem_id);
CREATE INDEX idx_mistakes_user_id ON mistakes(user_id);
CREATE INDEX idx_mistakes_problem_id ON mistakes(problem_id);
CREATE INDEX idx_mistakes_mistake_type ON mistakes(mistake_type);
CREATE INDEX idx_mistakes_user_problem ON mistakes(user_id, problem_id);
CREATE INDEX idx_problem_tags_problem_id ON problem_tags(problem_id);
CREATE INDEX idx_problem_tags_pattern_id ON problem_tags(pattern_id);
CREATE INDEX idx_problem_tags_variant_id ON problem_tags(variant_id);
CREATE INDEX idx_patterns_concept_id ON patterns(concept_id);
CREATE INDEX idx_variants_pattern_id ON variants(pattern_id);
CREATE INDEX idx_variants_technique_id ON variants(technique_id);
CREATE INDEX idx_variants_goal_id ON variants(goal_id);

-- ============================================================================
-- TRIGGERS AND FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_problems_updated_at 
    BEFORE UPDATE ON problems
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_progress_updated_at 
    BEFORE UPDATE ON user_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_notes_updated_at 
    BEFORE UPDATE ON calendar_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_tasks_updated_at 
    BEFORE UPDATE ON calendar_tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_events_updated_at 
    BEFORE UPDATE ON calendar_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- USER-SPECIFIC DATABASE FUNCTIONS
-- ============================================================================

-- Function to get problems due for review today for a specific user
CREATE OR REPLACE FUNCTION get_due_problems_today(p_user_id BIGINT)
RETURNS TABLE (
    id BIGINT,
    problem_id BIGINT,
    title VARCHAR(255),
    difficulty difficulty_level,
    next_review_date DATE,
    days_overdue INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.problem_id,
        p.title,
        p.difficulty,
        rh.next_review_date,
        (CURRENT_DATE - rh.next_review_date)::INTEGER as days_overdue
    FROM problems p
    INNER JOIN (
        SELECT DISTINCT ON (review_history.problem_id) 
            review_history.problem_id, 
            review_history.next_review_date
        FROM review_history 
        WHERE review_history.user_id = p_user_id
        ORDER BY review_history.problem_id, review_history.created_at DESC
    ) rh ON p.id = rh.problem_id
    WHERE rh.next_review_date <= CURRENT_DATE
    ORDER BY rh.next_review_date ASC, p.difficulty DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_due_problems_today(BIGINT) IS 'Returns problems due for review today for a specific user';

-- Function to add a review session for a specific user
CREATE OR REPLACE FUNCTION add_review_session(
    p_problem_id BIGINT,
    p_result review_result,
    p_notes TEXT DEFAULT NULL,
    p_time_spent INTEGER DEFAULT NULL,
    p_user_id BIGINT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    current_pattern INTEGER[];
    next_interval INTEGER;
    problem_difficulty difficulty_level;
    last_interval INTEGER;
BEGIN
    -- Get problem difficulty
    SELECT difficulty INTO problem_difficulty
    FROM problems WHERE id = p_problem_id;
    
    -- Get the review pattern for this difficulty
    SELECT pattern INTO current_pattern
    FROM review_patterns 
    WHERE difficulty = problem_difficulty
    LIMIT 1;
    
    -- Get last interval from review history for this user
    SELECT interval_days INTO last_interval
    FROM review_history 
    WHERE problem_id = p_problem_id 
      AND (p_user_id IS NULL OR user_id = p_user_id)
    ORDER BY created_at DESC 
    LIMIT 1;
    
    -- Calculate next interval based on result
    IF p_result = 'remembered' THEN
        -- Find next interval in pattern or double the last one
        IF last_interval IS NULL THEN
            next_interval := current_pattern[1];
        ELSE
            -- Find current position in pattern and move to next
            FOR i IN 1..array_length(current_pattern, 1) LOOP
                IF current_pattern[i] = last_interval THEN
                    IF i < array_length(current_pattern, 1) THEN
                        next_interval := current_pattern[i + 1];
                    ELSE
                        next_interval := LEAST(last_interval * 2, 365); -- Cap at 1 year
                    END IF;
                    EXIT;
                END IF;
            END LOOP;
            
            -- If not found in pattern, double the interval with cap
            IF next_interval IS NULL THEN
                next_interval := LEAST(last_interval * 2, 365); -- Cap at 1 year
            END IF;
        END IF;
    ELSE
        -- Reset to beginning of pattern
        next_interval := current_pattern[1];
    END IF;
    
    -- Insert review history record with user_id
    INSERT INTO review_history (
        problem_id,
        user_id,
        review_date, 
        result, 
        interval_days, 
        next_review_date,
        review_notes,
        time_spent_minutes
    ) VALUES (
        p_problem_id,
        p_user_id,
        CURRENT_DATE,
        p_result,
        next_interval,
        CURRENT_DATE + INTERVAL '1 day' * next_interval,
        p_notes,
        p_time_spent
    );
    
    -- Also add to review attempts with user_id
    INSERT INTO review_attempts (
        problem_id,
        user_id,
        success,
        time_spent_minutes,
        notes
    ) VALUES (
        p_problem_id,
        p_user_id,
        p_result = 'remembered',
        p_time_spent,
        p_notes
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION add_review_session IS 'Adds a review session for a user and calculates next review date using spaced repetition';

-- Function to process review session with mistake tracking for a specific user
CREATE OR REPLACE FUNCTION process_review_session(
    p_user_id BIGINT,
    p_problem_id BIGINT,
    p_result review_result,
    p_notes TEXT DEFAULT NULL,
    p_time_spent INTEGER DEFAULT NULL,
    p_mistakes TEXT[] DEFAULT NULL,
    p_mistake_types mistake_type[] DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    mistake_text TEXT;
    mistake_type_val mistake_type;
    i INTEGER;
BEGIN
    -- Add the review session with user_id
    PERFORM add_review_session(p_problem_id, p_result, p_notes, p_time_spent, p_user_id);
    
    -- Add mistakes if provided
    IF p_mistakes IS NOT NULL AND array_length(p_mistakes, 1) > 0 THEN
        FOR i IN 1..array_length(p_mistakes, 1) LOOP
            mistake_text := p_mistakes[i];
            mistake_type_val := COALESCE(p_mistake_types[i], 'other');
            
            INSERT INTO mistakes (
                user_id,
                problem_id,
                description,
                mistake_type
            ) VALUES (
                p_user_id,
                p_problem_id,
                mistake_text,
                mistake_type_val
            );
        END LOOP;
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION process_review_session(BIGINT, BIGINT, review_result, TEXT, INTEGER, TEXT[], mistake_type[]) IS 'Processes a review session with mistake tracking for a specific user';

-- Function to get user statistics by user_id
CREATE OR REPLACE FUNCTION get_user_statistics(p_user_id BIGINT)
RETURNS TABLE (
    total_problems BIGINT,
    solved_count BIGINT,
    easy_solved BIGINT,
    medium_solved BIGINT,
    hard_solved BIGINT,
    in_review_count BIGINT,
    total_review_sessions BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT p.id) AS total_problems,
        COUNT(DISTINCT CASE WHEN up.solved = TRUE THEN up.problem_id END) AS solved_count,
        COUNT(DISTINCT CASE WHEN up.solved = TRUE AND p.difficulty = 'easy' THEN up.problem_id END) AS easy_solved,
        COUNT(DISTINCT CASE WHEN up.solved = TRUE AND p.difficulty = 'medium' THEN up.problem_id END) AS medium_solved,
        COUNT(DISTINCT CASE WHEN up.solved = TRUE AND p.difficulty = 'hard' THEN up.problem_id END) AS hard_solved,
        COUNT(DISTINCT CASE WHEN rh.problem_id IS NOT NULL THEN rh.problem_id END) AS in_review_count,
        COUNT(rh.id) AS total_review_sessions
    FROM problems p
    LEFT JOIN user_progress up ON p.id = up.problem_id AND up.user_id = p_user_id
    LEFT JOIN review_history rh ON p.id = rh.problem_id AND rh.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_user_statistics IS 'Returns statistics for a specific user including solved problems and review sessions';

-- ============================================================================
-- DEFAULT DATA
-- ============================================================================

-- Insert default review patterns
INSERT INTO review_patterns (difficulty, pattern, description) VALUES 
('easy', ARRAY[0, 1, 3, 7, 14, 30], 'Standard spaced repetition for easy problems'),
('medium', ARRAY[0, 1, 2, 4, 8, 16, 32], 'Accelerated pattern for medium problems'),
('hard', ARRAY[0, 1, 2, 4, 6, 10, 20, 40], 'Extended pattern for hard problems');

-- Insert some default concepts
INSERT INTO concepts (concept_id, name) VALUES 
('two-pointers', 'Two Pointers'),
('sliding-window', 'Sliding Window'),
('binary-search', 'Binary Search'),
('dynamic-programming', 'Dynamic Programming'),
('backtracking', 'Backtracking'),
('graph-traversal', 'Graph Traversal'),
('tree-traversal', 'Tree Traversal'),
('greedy', 'Greedy Algorithm'),
('divide-conquer', 'Divide and Conquer'),
('hash-table', 'Hash Table');

-- Insert some default techniques
INSERT INTO techniques (name, description) VALUES 
('Fast and Slow Pointers', 'Use two pointers moving at different speeds'),
('Left and Right Pointers', 'Use pointers from both ends moving towards center'),
('Sliding Window Fixed Size', 'Maintain a window of fixed size'),
('Sliding Window Variable Size', 'Expand and contract window based on conditions'),
('Binary Search on Answer', 'Use binary search to find optimal value'),
('Memoization', 'Cache results of expensive function calls'),
('Tabulation', 'Build up solution using iterative approach'),
('DFS Recursive', 'Depth-first search using recursion'),
('BFS Iterative', 'Breadth-first search using queue'),
('Backtrack with Pruning', 'Backtracking with early termination');

-- Insert some default goals
INSERT INTO goals (name, description) VALUES 
('Find Target', 'Locate a specific element or value'),
('Optimize Path', 'Find shortest or optimal path'),
('Count Occurrences', 'Count number of valid solutions'),
('Minimize Cost', 'Find solution with minimum cost'),
('Maximize Profit', 'Find solution with maximum benefit'),
('Detect Cycle', 'Identify cycles in data structure'),
('Validate Structure', 'Check if structure meets criteria'),
('Transform Data', 'Convert data from one form to another'),
('Partition Elements', 'Divide elements based on criteria'),
('Generate Combinations', 'Create all valid combinations');

-- Insert some default template basics
INSERT INTO template_basics (description, template_code) VALUES 
('Two Pointers Template', 
'def two_pointers(arr):
    left, right = 0, len(arr) - 1
    while left < right:
        # Process current pair
        if condition:
            # Move pointers based on condition
            left += 1
        else:
            right -= 1
    return result'),

('Sliding Window Template',
'def sliding_window(arr, k):
    window_sum = sum(arr[:k])
    max_sum = window_sum
    
    for i in range(k, len(arr)):
        window_sum = window_sum - arr[i-k] + arr[i]
        max_sum = max(max_sum, window_sum)
    
    return max_sum'),

('Binary Search Template',
'def binary_search(arr, target):
    left, right = 0, len(arr) - 1
    
    while left <= right:
        mid = (left + right) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    
    return -1');

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_user;
