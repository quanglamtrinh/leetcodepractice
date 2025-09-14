-- LeetCode Problem Review Database - PostgreSQL

-- Drop existing tables if they exist (in reverse dependency order)
DROP TABLE IF EXISTS mistakes CASCADE;
DROP TABLE IF EXISTS review_attempts CASCADE;
DROP TABLE IF EXISTS review_history CASCADE;
DROP TABLE IF EXISTS review_patterns CASCADE;
DROP TABLE IF EXISTS problem_tags CASCADE;
DROP TABLE IF EXISTS template_variants CASCADE;
DROP TABLE IF EXISTS variants CASCADE;
DROP TABLE IF EXISTS problems CASCADE;
DROP TABLE IF EXISTS patterns CASCADE;
DROP TABLE IF EXISTS template_basics CASCADE;
DROP TABLE IF EXISTS concepts CASCADE;
DROP TABLE IF EXISTS techniques CASCADE;
DROP TABLE IF EXISTS goals CASCADE;

-- Create ENUM types
CREATE TYPE difficulty_level AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE review_result AS ENUM ('remembered', 'forgot');
CREATE TYPE mistake_type AS ENUM (
    'logic_error', 
    'syntax_error', 
    'edge_case', 
    'time_complexity',
    'space_complexity', 
    'algorithm_choice', 
    'implementation_detail',
    'off_by_one',
    'boundary_condition',
    'data_structure_choice',
    'optimization',
    'other'
);

-- 1. Core Reference Tables
CREATE TABLE goals (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE techniques (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE concepts (
    id BIGSERIAL PRIMARY KEY,
    concept_id VARCHAR(50) UNIQUE NOT NULL, -- For easy reference like 'two-pointers'
    name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE template_basics (
    id BIGSERIAL PRIMARY KEY,
    description TEXT NOT NULL,
    template_code TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE patterns (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    template_id BIGINT REFERENCES template_basics(id),
    concept_id BIGINT REFERENCES concepts(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Problems and Variants
CREATE TABLE problems (
    id BIGSERIAL PRIMARY KEY,
    problem_id BIGINT UNIQUE NOT NULL, -- LeetCode problem number
    title VARCHAR(255) NOT NULL,
    concept VARCHAR(100),
    difficulty difficulty_level NOT NULL,
    acceptance_rate DECIMAL(5,2), -- Store as percentage (e.g., 45.67)
    popularity BIGINT,
    solved BOOLEAN DEFAULT FALSE,
    notes TEXT,
    leetcode_link TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    solution BIGINT -- This seems to reference something, but unclear from diagram
);

CREATE TABLE variants (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    use_when TEXT,
    notes TEXT,
    pattern_id BIGINT REFERENCES patterns(id),
    technique_id BIGINT REFERENCES techniques(id),
    goal_id BIGINT REFERENCES goals(id),
    concept_id BIGINT REFERENCES concepts(id),
    template_pattern_id BIGINT, -- This might reference patterns or template_variants
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE template_variants (
    id BIGSERIAL PRIMARY KEY,
    description TEXT NOT NULL,
    template_code TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Many-to-Many Relationships
CREATE TABLE problem_tags (
    id BIGSERIAL PRIMARY KEY,
    problem_id BIGINT REFERENCES problems(id) ON DELETE CASCADE,
    variant_id BIGINT REFERENCES variants(id) ON DELETE CASCADE,
    pattern_id BIGINT REFERENCES patterns(id) ON DELETE CASCADE,
    goal_id BIGINT REFERENCES goals(id) ON DELETE CASCADE,
    technique_id BIGINT REFERENCES techniques(id) ON DELETE CASCADE,
    concept_id BIGINT REFERENCES concepts(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure at least one tag type is specified
    CHECK (
        (problem_id IS NOT NULL)::int + 
        (variant_id IS NOT NULL)::int + 
        (pattern_id IS NOT NULL)::int + 
        (goal_id IS NOT NULL)::int + 
        (technique_id IS NOT NULL)::int + 
        (concept_id IS NOT NULL)::int >= 2
    )
);

-- 4. Review System Tables
CREATE TABLE review_history (
    id BIGSERIAL PRIMARY KEY,
    problem_id BIGINT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    review_date DATE NOT NULL DEFAULT CURRENT_DATE,
    result review_result NOT NULL,
    interval_days INTEGER NOT NULL,
    next_review_date DATE NOT NULL,
    review_notes TEXT,
    time_spent_minutes INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE review_attempts (
    id BIGSERIAL PRIMARY KEY,
    problem_id BIGINT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    review_attempt_date DATE NOT NULL DEFAULT CURRENT_DATE,
    review_result review_result NOT NULL,
    new_column INTEGER, -- Unclear from diagram what this represents
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE review_patterns (
    id BIGSERIAL PRIMARY KEY,
    difficulty difficulty_level NOT NULL,
    pattern TEXT NOT NULL, -- Could be JSON for complex patterns
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE mistakes (
    id BIGSERIAL PRIMARY KEY,
    problem_id BIGINT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    mistake_type mistake_type NOT NULL DEFAULT 'other',
    code_snippet TEXT,
    correction TEXT,
    review_session_id BIGINT, -- Reference to review_history or review_attempts
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Indexes for Performance
CREATE INDEX idx_problems_difficulty ON problems(difficulty);
CREATE INDEX idx_problems_solved ON problems(solved);
CREATE INDEX idx_problems_problem_id ON problems(problem_id);
CREATE INDEX idx_review_history_problem ON review_history(problem_id);
CREATE INDEX idx_review_history_next_date ON review_history(next_review_date);
CREATE INDEX idx_variants_pattern ON variants(pattern_id);
CREATE INDEX idx_problem_tags_problem ON problem_tags(problem_id);
CREATE INDEX idx_next_review_date ON review_history(next_review_date);
CREATE INDEX idx_problem_review_date ON review_history(problem_id, review_date);
CREATE INDEX idx_problem_attempt_date ON review_attempts(problem_id, review_attempt_date);
CREATE INDEX idx_mistake_type ON mistakes(mistake_type);
CREATE INDEX idx_problem_mistakes ON mistakes(problem_id);

-- 6. Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_problems_updated_at 
    BEFORE UPDATE ON problems
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Views for Common Queries

-- View for due problems today
CREATE VIEW due_problems_today AS
SELECT 
    p.id,
    p.problem_id,
    p.title,
    p.difficulty,
    rh.next_review_date,
    rh.interval_days,
    CURRENT_DATE - rh.next_review_date as days_overdue,
    rh.result as last_result
FROM problems p
JOIN review_history rh ON p.id = rh.problem_id
WHERE rh.next_review_date <= CURRENT_DATE
AND rh.id = (
    SELECT MAX(id) 
    FROM review_history rh2 
    WHERE rh2.problem_id = p.id
)
ORDER BY rh.next_review_date ASC, p.difficulty DESC;

-- View for problem statistics
CREATE VIEW problem_stats AS
SELECT 
    p.id,
    p.title,
    p.difficulty,
    COUNT(rh.id) as total_reviews,
    COUNT(CASE WHEN rh.result = 'remembered' THEN 1 END) as remembered_count,
    COUNT(CASE WHEN rh.result = 'forgot' THEN 1 END) as forgot_count,
    ROUND(
        COUNT(CASE WHEN rh.result = 'remembered' THEN 1 END) * 100.0 / 
        NULLIF(COUNT(rh.id), 0), 2
    ) as success_rate,
    MAX(rh.review_date) as last_reviewed,
    AVG(rh.time_spent_minutes) as avg_time_spent
FROM problems p
LEFT JOIN review_history rh ON p.id = rh.problem_id
GROUP BY p.id, p.title, p.difficulty;

-- View for mistake analysis
CREATE VIEW mistake_analysis AS
SELECT 
    p.title,
    p.difficulty,
    m.mistake_type,
    COUNT(*) as frequency,
    STRING_AGG(DISTINCT m.description, '; ') as common_descriptions
FROM mistakes m
JOIN problems p ON m.problem_id = p.id
GROUP BY p.title, p.difficulty, m.mistake_type
ORDER BY frequency DESC;

-- 8. Functions for Spaced Repetition

-- Function to calculate next review interval
CREATE OR REPLACE FUNCTION calculate_next_interval(
    current_interval INTEGER,
    result review_result,
    problem_difficulty difficulty_level DEFAULT 'medium'
) RETURNS INTEGER AS $$
DECLARE
    base_multiplier DECIMAL := 2.0;
    difficulty_factor DECIMAL;
BEGIN
    -- Adjust base multiplier based on difficulty
    difficulty_factor := CASE problem_difficulty
        WHEN 'easy' THEN 1.5
        WHEN 'medium' THEN 2.0
        WHEN 'hard' THEN 2.5
    END;
    
    IF result = 'forgot' THEN
        -- Reset to shorter interval when forgotten
        RETURN GREATEST(1, FLOOR(current_interval * 0.3));
    ELSE
        -- Increase interval when remembered
        RETURN FLOOR(current_interval * difficulty_factor);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to add a review session
CREATE OR REPLACE FUNCTION add_review_session(
    p_problem_id BIGINT,
    p_result review_result,
    p_time_spent INTEGER DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
) RETURNS BIGINT AS $$
DECLARE
    last_interval INTEGER;
    new_interval INTEGER;
    problem_diff difficulty_level;
    initial_interval INTEGER;
    review_id BIGINT;
BEGIN
    -- Get problem difficulty
    SELECT difficulty INTO problem_diff FROM problems WHERE id = p_problem_id;
    
    -- Get initial interval from review_patterns
    SELECT 1 INTO initial_interval; -- Default to 1 day
    
    -- Get last interval, default to initial interval based on difficulty
    SELECT COALESCE(
        (SELECT interval_days FROM review_history 
         WHERE problem_id = p_problem_id 
         ORDER BY review_date DESC LIMIT 1),
        initial_interval
    ) INTO last_interval;
    
    -- Calculate new interval
    new_interval := calculate_next_interval(last_interval, p_result, problem_diff);
    
    -- Insert review session
    INSERT INTO review_history (
        problem_id, 
        result, 
        interval_days, 
        next_review_date,
        time_spent_minutes, 
        review_notes
    ) VALUES (
        p_problem_id,
        p_result,
        new_interval,
        CURRENT_DATE + new_interval,
        p_time_spent,
        p_notes
    ) RETURNING id INTO review_id;
    
    -- Also record in review_attempts
    INSERT INTO review_attempts (problem_id, review_result) 
    VALUES (p_problem_id, p_result);
    
    RETURN review_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get all due problems for today
CREATE OR REPLACE FUNCTION get_due_problems_today()
RETURNS TABLE (
    problem_id BIGINT,
    leetcode_id BIGINT,
    title TEXT,
    difficulty difficulty_level,
    next_review_date DATE,
    days_overdue INTEGER,
    last_result review_result,
    success_streak INTEGER,
    total_reviews BIGINT,
    solution BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH latest_reviews AS (
        SELECT DISTINCT ON (rh.problem_id)
            rh.problem_id,
            rh.next_review_date,
            rh.result as last_result,
            rh.review_date
        FROM review_history rh
        ORDER BY rh.problem_id, rh.review_date DESC
    ),
    review_stats AS (
        SELECT 
            rh.problem_id,
            COUNT(*) as total_reviews,
            COUNT(*) FILTER (WHERE rh.result = 'remembered' AND rh.review_date >= (
                SELECT MAX(review_date) 
                FROM review_history rh2 
                WHERE rh2.problem_id = rh.problem_id AND rh2.result = 'forgot'
            )) as success_streak
        FROM review_history rh
        GROUP BY rh.problem_id
    )
    SELECT 
        p.id as problem_id,
        p.problem_id as leetcode_id,
        p.title,
        p.difficulty,
        lr.next_review_date,
        (CURRENT_DATE - lr.next_review_date)::INTEGER as days_overdue,
        lr.last_result,
        COALESCE(rs.success_streak, 0)::INTEGER as success_streak,
        COALESCE(rs.total_reviews, 0) as total_reviews,
        p.solution
    FROM problems p
    LEFT JOIN latest_reviews lr ON p.id = lr.problem_id
    LEFT JOIN review_stats rs ON p.id = rs.problem_id
    WHERE (lr.next_review_date IS NULL AND p.solved = true) -- Never reviewed but solved
       OR lr.next_review_date <= CURRENT_DATE -- Due for review
    ORDER BY 
        CASE WHEN lr.next_review_date IS NULL THEN 0 ELSE 1 END, -- New problems first
        lr.next_review_date ASC,
        p.difficulty DESC;
END;
$$ LANGUAGE plpgsql;

-- 9. Sample Data
INSERT INTO goals (name, description) VALUES 
('Master Arrays', 'Become proficient with array manipulation problems'),
('Dynamic Programming', 'Master DP concepts and patterns'),
('Graph Algorithms', 'Learn BFS, DFS, and advanced graph algorithms'),
('System Design', 'Prepare for system design interviews');

INSERT INTO techniques (name, description) VALUES 
('Two Pointers', 'Use two pointers to solve problems efficiently'),
('Sliding Window', 'Maintain a window of elements'),
('Binary Search', 'Divide and conquer search technique'),
('Dynamic Programming', 'Break down problems into subproblems');

INSERT INTO concepts (concept_id, name) VALUES 
('two-pointers', 'Two Pointers Technique'),
('sliding-window', 'Sliding Window'),
('binary-search', 'Binary Search'),
('dp', 'Dynamic Programming'),
('graph-traversal', 'Graph Traversal');

INSERT INTO template_basics (description, template_code) VALUES 
('Two Pointers Template', 'def two_pointers(arr):\n    left, right = 0, len(arr) - 1\n    while left < right:\n        # process\n        left += 1\n        right -= 1'),
('Binary Search Template', 'def binary_search(arr, target):\n    left, right = 0, len(arr) - 1\n    while left <= right:\n        mid = (left + right) // 2\n        if arr[mid] == target:\n            return mid\n        elif arr[mid] < target:\n            left = mid + 1\n        else:\n            right = mid - 1\n    return -1');

-- Sample problems
INSERT INTO problems (problem_id, title, difficulty, acceptance_rate, solved) VALUES 
(1, 'Two Sum', 'easy', 49.5, true),
(15, '3Sum', 'medium', 32.1, false),
(200, 'Number of Islands', 'medium', 56.8, true),
(70, 'Climbing Stairs', 'easy', 51.2, true);

COMMENT ON TABLE problems IS 'LeetCode problems with metadata';
COMMENT ON TABLE review_history IS 'Tracks review sessions with spaced repetition intervals';
COMMENT ON TABLE mistakes IS 'Records mistakes made during problem solving';
COMMENT ON FUNCTION add_review_session IS 'Adds a new review session and calculates next review interval';
COMMENT ON VIEW due_problems_today IS 'Shows all problems due for review today';