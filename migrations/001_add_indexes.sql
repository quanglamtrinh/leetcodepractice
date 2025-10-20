-- Migration: Add performance indexes
-- Created: 2025-10-20
-- Description: Add indexes to improve query performance on frequently searched columns

-- Index on problems table for concept-based queries
CREATE INDEX IF NOT EXISTS idx_problems_concept ON problems(concept);

-- Index on problems table for difficulty-based queries
CREATE INDEX IF NOT EXISTS idx_problems_difficulty ON problems(difficulty);

-- Index on problems table for popularity sorting
CREATE INDEX IF NOT EXISTS idx_problems_popularity ON problems(popularity DESC NULLS LAST);

-- Index on user_progress for problem lookups
CREATE INDEX IF NOT EXISTS idx_user_progress_problem_id ON user_progress(problem_id);

-- Index on user_progress for solved status queries
CREATE INDEX IF NOT EXISTS idx_user_progress_solved ON user_progress(solved);

-- Composite index for filtering solved problems by concept
CREATE INDEX IF NOT EXISTS idx_problems_concept_difficulty 
ON problems(concept, difficulty);

-- Index on user_progress for recently solved problems
CREATE INDEX IF NOT EXISTS idx_user_progress_solved_at 
ON user_progress(solved_at DESC NULLS LAST);

-- Comments for documentation
COMMENT ON INDEX idx_problems_concept IS 'Improves performance for concept-based filtering';
COMMENT ON INDEX idx_problems_difficulty IS 'Speeds up difficulty-based queries';
COMMENT ON INDEX idx_problems_popularity IS 'Optimizes sorting by popularity';
COMMENT ON INDEX idx_user_progress_solved IS 'Accelerates solved/unsolved filtering';

