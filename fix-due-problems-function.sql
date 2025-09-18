-- Fix the get_due_problems_today function to resolve ambiguous column reference
CREATE OR REPLACE FUNCTION get_due_problems_today()
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
        SELECT DISTINCT ON (rh_inner.problem_id) 
            rh_inner.problem_id, 
            rh_inner.next_review_date
        FROM review_history rh_inner
        ORDER BY rh_inner.problem_id, rh_inner.created_at DESC
    ) rh ON p.id = rh.problem_id
    WHERE rh.next_review_date <= CURRENT_DATE
    ORDER BY rh.next_review_date ASC, p.difficulty DESC;
END;
$$ LANGUAGE plpgsql;