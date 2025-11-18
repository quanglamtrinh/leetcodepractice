const pool = require('../config/database');

// Get review history for a problem
exports.getReviewHistory = async (req, res) => {
  try {
    const { problemId } = req.params;
    
    const result = await pool.query(`
      SELECT * FROM review_history
      WHERE problem_id = $1
      ORDER BY review_date DESC
    `, [problemId]);
    
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
    
    if (!outcome) {
      return res.status(400).json({ error: 'outcome is required' });
    }
    
    const result = await pool.query(
      'SELECT add_review_session($1, $2, $3, NULL)',
      [problemId, outcome, notes || '']
    );
    
    res.json({ success: true, message: 'Review session added' });
  } catch (err) {
    console.error('Error adding review session:', err);
    res.status(500).json({ error: 'Failed to add review session' });
  }
};

// Get problems due for review
exports.getDueProblems = async (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    
    const result = await pool.query(`
      SELECT * FROM problems
      WHERE in_review_cycle = true
      AND next_review_date <= $1
      ORDER BY next_review_date, concept, title
    `, [todayStr]);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching due problems:', err);
    res.status(500).json({ error: 'Failed to fetch due problems' });
  }
};

// Get solved problems
exports.getSolvedProblems = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *, updated_at as solved_date
      FROM problems 
      WHERE solved = TRUE 
      ORDER BY updated_at DESC, concept, title
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching solved problems:', err);
    res.status(500).json({ error: 'Failed to fetch solved problems' });
  }
};
