const pool = require('../config/database');

// Get review history for a problem
exports.getReviewHistory = async (req, res) => {
  try {
    const { problemId } = req.params;
    const userId = req.user.userId;
    
    const result = await pool.query(`
      SELECT * FROM review_history
      WHERE problem_id = $1 AND user_id = $2
      ORDER BY review_date DESC
    `, [problemId, userId]);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching review history:', err);
    res.status(500).json({ error: 'Failed to fetch review history' });
  }
};

// Add review session
exports.addReviewSession = async (req, res) => {
  try {
    const { problemId } = req.params;
    const { outcome, notes } = req.body;
    const userId = req.user.userId;
    
    if (!outcome) {
      return res.status(400).json({ error: 'outcome is required' });
    }
    
    const result = await pool.query(
      'SELECT add_review_session($1, $2, $3, NULL, $4)',
      [problemId, outcome, notes || '', userId]
    );
    
    res.json({ success: true, message: 'Review session added' });
  } catch (err) {
    console.error('Error adding review session:', err);
    res.status(500).json({ error: 'Failed to add review session' });
  }
};

// Get problems due for review today (personalized for user)
exports.getDueProblems = async (req, res) => {
  try {
    const userId = req.user.userId;
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Query review_history filtered by user_id where next_review_date <= today
    // Calculate days_overdue for each problem
    // Sort by next_review_date ascending, then difficulty descending
    const result = await pool.query(`
      SELECT 
        rh.id,
        rh.problem_id,
        p.title,
        p.difficulty,
        p.concept,
        p.problem_id as leetcode_number,
        p.leetcode_link,
        rh.next_review_date,
        rh.review_date as last_review_date,
        rh.result as last_result,
        rh.interval_days,
        CASE 
          WHEN rh.next_review_date < CURRENT_DATE 
          THEN CURRENT_DATE - rh.next_review_date 
          ELSE 0 
        END as days_overdue
      FROM review_history rh
      INNER JOIN problems p ON rh.problem_id = p.id
      WHERE rh.user_id = $1 
        AND rh.next_review_date <= $2
        AND rh.id IN (
          -- Get only the most recent review for each problem
          SELECT MAX(id) 
          FROM review_history 
          WHERE user_id = $1 
          GROUP BY problem_id
        )
      ORDER BY 
        rh.next_review_date ASC,
        CASE p.difficulty 
          WHEN 'hard' THEN 1 
          WHEN 'medium' THEN 2 
          WHEN 'easy' THEN 3 
        END ASC,
        p.title ASC
    `, [userId, todayStr]);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching due problems:', err);
    res.status(500).json({ error: 'Failed to fetch due problems' });
  }
};

// Get solved problems
exports.getSolvedProblems = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const result = await pool.query(`
      SELECT p.*, up.solved_at as solved_date, up.notes
      FROM problems p
      INNER JOIN user_progress up ON p.id = up.problem_id
      WHERE up.user_id = $1 AND up.solved = TRUE 
      ORDER BY up.solved_at DESC, p.concept, p.title
    `, [userId]);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching solved problems:', err);
    res.status(500).json({ error: 'Failed to fetch solved problems' });
  }
};
