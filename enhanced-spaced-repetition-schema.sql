-- Enhanced Spaced Repetition Schema Extensions
-- This file adds new tables for pattern-variant analytics without modifying existing tables
-- Safe to apply on the 'advance' branch

-- ============================================================================
-- PATTERN-VARIANT PERFORMANCE TRACKING TABLES
-- ============================================================================

-- Track performance metrics for patterns
CREATE TABLE IF NOT EXISTS pattern_performance (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT DEFAULT 1, -- For future multi-user support, default to single user
    pattern_id BIGINT NOT NULL REFERENCES patterns(id) ON DELETE CASCADE,
    total_attempts INTEGER DEFAULT 0,
    successful_attempts INTEGER DEFAULT 0,
    last_reviewed DATE,
    average_time_minutes DECIMAL(5,2),
    difficulty_rating DECIMAL(3,2) DEFAULT 0.5, -- 0.0 (easy) to 1.0 (hard)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure one record per user-pattern combination
    UNIQUE(user_id, pattern_id)
);

-- Track performance metrics for variants
CREATE TABLE IF NOT EXISTS variant_performance (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT DEFAULT 1, -- For future multi-user support
    variant_id BIGINT NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
    pattern_id BIGINT NOT NULL REFERENCES patterns(id) ON DELETE CASCADE,
    total_attempts INTEGER DEFAULT 0,
    successful_attempts INTEGER DEFAULT 0,
    last_reviewed DATE,
    average_time_minutes DECIMAL(5,2),
    difficulty_rating DECIMAL(3,2) DEFAULT 0.5, -- 0.0 (easy) to 1.0 (hard)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure one record per user-variant combination
    UNIQUE(user_id, variant_id)
);

-- Track pattern/variant understanding in individual review sessions
CREATE TABLE IF NOT EXISTS review_pattern_tracking (
    id BIGSERIAL PRIMARY KEY,
    review_history_id BIGINT REFERENCES review_history(id) ON DELETE CASCADE,
    problem_id BIGINT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    pattern_id BIGINT REFERENCES patterns(id) ON DELETE SET NULL,
    variant_id BIGINT REFERENCES variants(id) ON DELETE SET NULL,
    pattern_understood BOOLEAN, -- Did user understand the pattern application?
    variant_applied_correctly BOOLEAN, -- Did user apply the variant correctly?
    time_to_recognize_pattern_seconds INTEGER, -- How long to recognize the pattern
    confidence_level INTEGER CHECK (confidence_level BETWEEN 1 AND 5), -- 1-5 confidence scale
    notes TEXT, -- User notes about pattern/variant application
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Store problem-pattern-variant associations with context
CREATE TABLE IF NOT EXISTS problem_associations (
    id BIGSERIAL PRIMARY KEY,
    problem_id BIGINT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    pattern_id BIGINT REFERENCES patterns(id) ON DELETE CASCADE,
    variant_id BIGINT REFERENCES variants(id) ON DELETE CASCADE,
    concept_id BIGINT REFERENCES concepts(id) ON DELETE SET NULL,
    technique_id BIGINT REFERENCES techniques(id) ON DELETE SET NULL,
    goal_id BIGINT REFERENCES goals(id) ON DELETE SET NULL,
    scenario_notes TEXT, -- When to use this pattern/variant for this problem
    application_notes TEXT, -- How to apply it specifically
    difficulty_override DECIMAL(3,2), -- Manual difficulty override (0.0-1.0)
    is_primary BOOLEAN DEFAULT FALSE, -- Is this the primary pattern for this problem?
    created_by_user BOOLEAN DEFAULT TRUE, -- User-created vs system-suggested
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure at least pattern or variant is specified
    CHECK (pattern_id IS NOT NULL OR variant_id IS NOT NULL)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Pattern performance indexes
CREATE INDEX IF NOT EXISTS idx_pattern_performance_user_pattern ON pattern_performance(user_id, pattern_id);
CREATE INDEX IF NOT EXISTS idx_pattern_performance_last_reviewed ON pattern_performance(last_reviewed);
CREATE INDEX IF NOT EXISTS idx_pattern_performance_difficulty ON pattern_performance(difficulty_rating DESC);

-- Variant performance indexes
CREATE INDEX IF NOT EXISTS idx_variant_performance_user_variant ON variant_performance(user_id, variant_id);
CREATE INDEX IF NOT EXISTS idx_variant_performance_pattern ON variant_performance(pattern_id);
CREATE INDEX IF NOT EXISTS idx_variant_performance_difficulty ON variant_performance(difficulty_rating DESC);

-- Review pattern tracking indexes
CREATE INDEX IF NOT EXISTS idx_review_pattern_tracking_review ON review_pattern_tracking(review_history_id);
CREATE INDEX IF NOT EXISTS idx_review_pattern_tracking_problem ON review_pattern_tracking(problem_id);
CREATE INDEX IF NOT EXISTS idx_review_pattern_tracking_pattern ON review_pattern_tracking(pattern_id);
CREATE INDEX IF NOT EXISTS idx_review_pattern_tracking_variant ON review_pattern_tracking(variant_id);

-- Problem associations indexes
CREATE INDEX IF NOT EXISTS idx_problem_associations_problem ON problem_associations(problem_id);
CREATE INDEX IF NOT EXISTS idx_problem_associations_pattern ON problem_associations(pattern_id);
CREATE INDEX IF NOT EXISTS idx_problem_associations_variant ON problem_associations(variant_id);
CREATE INDEX IF NOT EXISTS idx_problem_associations_primary ON problem_associations(problem_id, is_primary) WHERE is_primary = TRUE;

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================================================

-- Update updated_at timestamp for pattern_performance
CREATE OR REPLACE FUNCTION update_pattern_performance_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_pattern_performance_timestamp ON pattern_performance;
CREATE TRIGGER trigger_update_pattern_performance_timestamp
    BEFORE UPDATE ON pattern_performance
    FOR EACH ROW EXECUTE FUNCTION update_pattern_performance_timestamp();

-- Update updated_at timestamp for variant_performance
DROP TRIGGER IF EXISTS trigger_update_variant_performance_timestamp ON variant_performance;
CREATE TRIGGER trigger_update_variant_performance_timestamp
    BEFORE UPDATE ON variant_performance
    FOR EACH ROW EXECUTE FUNCTION update_pattern_performance_timestamp();

-- Update updated_at timestamp for problem_associations
DROP TRIGGER IF EXISTS trigger_update_problem_associations_timestamp ON problem_associations;
CREATE TRIGGER trigger_update_problem_associations_timestamp
    BEFORE UPDATE ON problem_associations
    FOR EACH ROW EXECUTE FUNCTION update_pattern_performance_timestamp();

-- ============================================================================
-- VIEWS FOR ANALYTICS
-- ============================================================================

-- Pattern analytics view
CREATE OR REPLACE VIEW pattern_analytics AS
SELECT 
    p.id as pattern_id,
    p.name as pattern_name,
    p.description as pattern_description,
    c.name as concept_name,
    c.concept_id as concept_identifier,
    pp.total_attempts,
    pp.successful_attempts,
    CASE 
        WHEN pp.total_attempts > 0 THEN 
            ROUND((pp.successful_attempts * 100.0 / pp.total_attempts), 2)
        ELSE 0 
    END as success_rate,
    pp.average_time_minutes,
    pp.difficulty_rating,
    pp.last_reviewed,
    COUNT(pa.id) as associated_problems_count,
    COUNT(v.id) as variants_count
FROM patterns p
LEFT JOIN concepts c ON p.concept_id = c.id
LEFT JOIN pattern_performance pp ON p.id = pp.pattern_id
LEFT JOIN problem_associations pa ON p.id = pa.pattern_id
LEFT JOIN variants v ON p.id = v.pattern_id
GROUP BY p.id, p.name, p.description, c.name, c.concept_id, 
         pp.total_attempts, pp.successful_attempts, pp.average_time_minutes, 
         pp.difficulty_rating, pp.last_reviewed
ORDER BY pp.difficulty_rating DESC NULLS LAST, p.name;

-- Variant analytics view
CREATE OR REPLACE VIEW variant_analytics AS
SELECT 
    v.id as variant_id,
    v.name as variant_name,
    v.use_when,
    v.notes as variant_notes,
    p.name as pattern_name,
    t.name as technique_name,
    g.name as goal_name,
    vp.total_attempts,
    vp.successful_attempts,
    CASE 
        WHEN vp.total_attempts > 0 THEN 
            ROUND((vp.successful_attempts * 100.0 / vp.total_attempts), 2)
        ELSE 0 
    END as success_rate,
    vp.average_time_minutes,
    vp.difficulty_rating,
    vp.last_reviewed,
    COUNT(pa.id) as associated_problems_count
FROM variants v
LEFT JOIN patterns p ON v.pattern_id = p.id
LEFT JOIN techniques t ON v.technique_id = t.id
LEFT JOIN goals g ON v.goal_id = g.id
LEFT JOIN variant_performance vp ON v.id = vp.variant_id
LEFT JOIN problem_associations pa ON v.id = pa.variant_id
GROUP BY v.id, v.name, v.use_when, v.notes, p.name, t.name, g.name,
         vp.total_attempts, vp.successful_attempts, vp.average_time_minutes,
         vp.difficulty_rating, vp.last_reviewed
ORDER BY vp.difficulty_rating DESC NULLS LAST, v.name;

-- Problem association summary view
CREATE OR REPLACE VIEW problem_association_summary AS
SELECT 
    pr.id as problem_id,
    pr.title as problem_title,
    pr.difficulty as problem_difficulty,
    pr.concept as problem_concept,
    COUNT(pa.id) as total_associations,
    COUNT(CASE WHEN pa.pattern_id IS NOT NULL THEN 1 END) as pattern_associations,
    COUNT(CASE WHEN pa.variant_id IS NOT NULL THEN 1 END) as variant_associations,
    STRING_AGG(DISTINCT p.name, ', ') as associated_patterns,
    STRING_AGG(DISTINCT v.name, ', ') as associated_variants,
    MAX(pa.updated_at) as last_association_update
FROM problems pr
LEFT JOIN problem_associations pa ON pr.id = pa.problem_id
LEFT JOIN patterns p ON pa.pattern_id = p.id
LEFT JOIN variants v ON pa.variant_id = v.id
GROUP BY pr.id, pr.title, pr.difficulty, pr.concept
ORDER BY total_associations DESC NULLS LAST, pr.title;

-- ============================================================================
-- FUNCTIONS FOR ANALYTICS AND PERFORMANCE TRACKING
-- ============================================================================

-- Function to update pattern performance after a review
CREATE OR REPLACE FUNCTION update_pattern_performance(
    p_pattern_id BIGINT,
    p_success BOOLEAN,
    p_time_minutes DECIMAL DEFAULT NULL,
    p_user_id BIGINT DEFAULT 1
) RETURNS VOID AS $$
DECLARE
    current_attempts INTEGER;
    current_successes INTEGER;
    new_difficulty DECIMAL;
BEGIN
    -- Insert or update pattern performance
    INSERT INTO pattern_performance (user_id, pattern_id, total_attempts, successful_attempts, last_reviewed, average_time_minutes)
    VALUES (p_user_id, p_pattern_id, 1, CASE WHEN p_success THEN 1 ELSE 0 END, CURRENT_DATE, p_time_minutes)
    ON CONFLICT (user_id, pattern_id) DO UPDATE SET
        total_attempts = pattern_performance.total_attempts + 1,
        successful_attempts = pattern_performance.successful_attempts + CASE WHEN p_success THEN 1 ELSE 0 END,
        last_reviewed = CURRENT_DATE,
        average_time_minutes = CASE 
            WHEN p_time_minutes IS NOT NULL THEN
                COALESCE((pattern_performance.average_time_minutes * pattern_performance.total_attempts + p_time_minutes) / (pattern_performance.total_attempts + 1), p_time_minutes)
            ELSE pattern_performance.average_time_minutes
        END;
    
    -- Calculate and update difficulty rating
    SELECT total_attempts, successful_attempts 
    INTO current_attempts, current_successes
    FROM pattern_performance 
    WHERE user_id = p_user_id AND pattern_id = p_pattern_id;
    
    -- Difficulty rating: 1.0 - success_rate, with minimum attempts consideration
    new_difficulty := CASE 
        WHEN current_attempts < 3 THEN 0.5 -- Default for new patterns
        ELSE GREATEST(0.0, LEAST(1.0, 1.0 - (current_successes::DECIMAL / current_attempts)))
    END;
    
    UPDATE pattern_performance 
    SET difficulty_rating = new_difficulty
    WHERE user_id = p_user_id AND pattern_id = p_pattern_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update variant performance after a review
CREATE OR REPLACE FUNCTION update_variant_performance(
    p_variant_id BIGINT,
    p_pattern_id BIGINT,
    p_success BOOLEAN,
    p_time_minutes DECIMAL DEFAULT NULL,
    p_user_id BIGINT DEFAULT 1
) RETURNS VOID AS $$
DECLARE
    current_attempts INTEGER;
    current_successes INTEGER;
    new_difficulty DECIMAL;
BEGIN
    -- Insert or update variant performance
    INSERT INTO variant_performance (user_id, variant_id, pattern_id, total_attempts, successful_attempts, last_reviewed, average_time_minutes)
    VALUES (p_user_id, p_variant_id, p_pattern_id, 1, CASE WHEN p_success THEN 1 ELSE 0 END, CURRENT_DATE, p_time_minutes)
    ON CONFLICT (user_id, variant_id) DO UPDATE SET
        total_attempts = variant_performance.total_attempts + 1,
        successful_attempts = variant_performance.successful_attempts + CASE WHEN p_success THEN 1 ELSE 0 END,
        last_reviewed = CURRENT_DATE,
        average_time_minutes = CASE 
            WHEN p_time_minutes IS NOT NULL THEN
                COALESCE((variant_performance.average_time_minutes * variant_performance.total_attempts + p_time_minutes) / (variant_performance.total_attempts + 1), p_time_minutes)
            ELSE variant_performance.average_time_minutes
        END;
    
    -- Calculate and update difficulty rating
    SELECT total_attempts, successful_attempts 
    INTO current_attempts, current_successes
    FROM variant_performance 
    WHERE user_id = p_user_id AND variant_id = p_variant_id;
    
    -- Difficulty rating: 1.0 - success_rate, with minimum attempts consideration
    new_difficulty := CASE 
        WHEN current_attempts < 3 THEN 0.5 -- Default for new variants
        ELSE GREATEST(0.0, LEAST(1.0, 1.0 - (current_successes::DECIMAL / current_attempts)))
    END;
    
    UPDATE variant_performance 
    SET difficulty_rating = new_difficulty
    WHERE user_id = p_user_id AND variant_id = p_variant_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get recommended patterns/variants for review
CREATE OR REPLACE FUNCTION get_recommended_focus_areas(
    p_user_id BIGINT DEFAULT 1,
    p_limit INTEGER DEFAULT 5
) RETURNS TABLE (
    type TEXT,
    id BIGINT,
    name TEXT,
    difficulty_rating DECIMAL,
    success_rate DECIMAL,
    days_since_review INTEGER,
    priority_score DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    WITH pattern_priorities AS (
        SELECT 
            'pattern'::TEXT as type,
            p.id,
            p.name,
            pp.difficulty_rating,
            CASE WHEN pp.total_attempts > 0 THEN pp.successful_attempts::DECIMAL / pp.total_attempts * 100 ELSE 0 END as success_rate,
            COALESCE(CURRENT_DATE - pp.last_reviewed, 999) as days_since_review,
            -- Priority score: higher difficulty + lower success rate + more days = higher priority
            (COALESCE(pp.difficulty_rating, 0.5) * 0.4 + 
             (1.0 - COALESCE(pp.successful_attempts::DECIMAL / NULLIF(pp.total_attempts, 0), 0.5)) * 0.4 +
             LEAST(COALESCE(CURRENT_DATE - pp.last_reviewed, 30), 30) / 30.0 * 0.2) as priority_score
        FROM patterns p
        LEFT JOIN pattern_performance pp ON p.id = pp.pattern_id AND pp.user_id = p_user_id
    ),
    variant_priorities AS (
        SELECT 
            'variant'::TEXT as type,
            v.id,
            v.name,
            vp.difficulty_rating,
            CASE WHEN vp.total_attempts > 0 THEN vp.successful_attempts::DECIMAL / vp.total_attempts * 100 ELSE 0 END as success_rate,
            COALESCE(CURRENT_DATE - vp.last_reviewed, 999) as days_since_review,
            -- Priority score: higher difficulty + lower success rate + more days = higher priority
            (COALESCE(vp.difficulty_rating, 0.5) * 0.4 + 
             (1.0 - COALESCE(vp.successful_attempts::DECIMAL / NULLIF(vp.total_attempts, 0), 0.5)) * 0.4 +
             LEAST(COALESCE(CURRENT_DATE - vp.last_reviewed, 30), 30) / 30.0 * 0.2) as priority_score
        FROM variants v
        LEFT JOIN variant_performance vp ON v.id = vp.variant_id AND vp.user_id = p_user_id
    )
    SELECT * FROM (
        SELECT * FROM pattern_priorities
        UNION ALL
        SELECT * FROM variant_priorities
    ) combined
    ORDER BY priority_score DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SAMPLE DATA AND COMMENTS
-- ============================================================================

COMMENT ON TABLE pattern_performance IS 'Tracks user performance metrics for each pattern';
COMMENT ON TABLE variant_performance IS 'Tracks user performance metrics for each variant';
COMMENT ON TABLE review_pattern_tracking IS 'Links individual review sessions to pattern/variant understanding';
COMMENT ON TABLE problem_associations IS 'Stores flexible associations between problems, patterns, and variants';

COMMENT ON FUNCTION update_pattern_performance IS 'Updates pattern performance metrics after a review session';
COMMENT ON FUNCTION update_variant_performance IS 'Updates variant performance metrics after a review session';
COMMENT ON FUNCTION get_recommended_focus_areas IS 'Returns prioritized list of patterns/variants needing attention';

COMMENT ON VIEW pattern_analytics IS 'Comprehensive analytics view for pattern performance';
COMMENT ON VIEW variant_analytics IS 'Comprehensive analytics view for variant performance';
COMMENT ON VIEW problem_association_summary IS 'Summary of pattern/variant associations per problem';