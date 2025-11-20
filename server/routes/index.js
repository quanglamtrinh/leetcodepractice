const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

const authRoutes = require('./authRoutes');
const problemRoutes = require('./problemRoutes');
const calendarRoutes = require('./calendarRoutes');
const reviewRoutes = require('./reviewRoutes');
const patternRoutes = require('./patternRoutes');
const conceptRoutes = require('./conceptRoutes');

// Health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    database: 'connected'
  });
});

// Stats endpoint
router.get('/stats', authenticateToken, async (req, res) => {
  const pool = require('../config/database');
  const userId = req.user.userId;
  
  try {
    // Get total problems count
    const totalResult = await pool.query('SELECT COUNT(*) as total_problems FROM problems');
    const totalProblems = parseInt(totalResult.rows[0].total_problems);
    
    // Get user-specific statistics
    const userStatsResult = await pool.query(`
      SELECT 
        COUNT(CASE WHEN up.solved = true THEN 1 END) as solved_problems,
        COUNT(CASE WHEN up.solved = true AND p.difficulty = 'easy' THEN 1 END) as easy_solved,
        COUNT(CASE WHEN up.solved = true AND p.difficulty = 'medium' THEN 1 END) as medium_solved,
        COUNT(CASE WHEN up.solved = true AND p.difficulty = 'hard' THEN 1 END) as hard_solved
      FROM problems p
      LEFT JOIN user_progress up ON p.id = up.problem_id AND up.user_id = $1
    `, [userId]);
    
    // Get difficulty breakdown for all problems
    const difficultyResult = await pool.query(`
      SELECT 
        COUNT(CASE WHEN difficulty = 'easy' THEN 1 END) as easy_count,
        COUNT(CASE WHEN difficulty = 'medium' THEN 1 END) as medium_count,
        COUNT(CASE WHEN difficulty = 'hard' THEN 1 END) as hard_count
      FROM problems
    `);
    
    // Get concept-based statistics
    const conceptResult = await pool.query(`
      SELECT 
        p.concept,
        COUNT(p.id) as total,
        COUNT(CASE WHEN up.solved = true THEN 1 END) as solved
      FROM problems p
      LEFT JOIN user_progress up ON p.id = up.problem_id AND up.user_id = $1
      WHERE p.concept IS NOT NULL
      GROUP BY p.concept
      ORDER BY p.concept
    `, [userId]);
    
    res.json({
      total_problems: totalProblems,
      solved_problems: parseInt(userStatsResult.rows[0].solved_problems) || 0,
      easy_count: parseInt(difficultyResult.rows[0].easy_count) || 0,
      medium_count: parseInt(difficultyResult.rows[0].medium_count) || 0,
      hard_count: parseInt(difficultyResult.rows[0].hard_count) || 0,
      easy_solved: parseInt(userStatsResult.rows[0].easy_solved) || 0,
      medium_solved: parseInt(userStatsResult.rows[0].medium_solved) || 0,
      hard_solved: parseInt(userStatsResult.rows[0].hard_solved) || 0,
      concepts: conceptResult.rows
    });
  } catch (err) {
    console.error('Error fetching statistics:', err);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Solved problems endpoint
router.get('/solved', authenticateToken, async (req, res) => {
  const pool = require('../config/database');
  const userId = req.user.userId;
  
  try {
    const result = await pool.query(`
      SELECT 
        p.*,
        up.solved,
        up.solved_at,
        up.notes
      FROM problems p
      INNER JOIN user_progress up ON p.id = up.problem_id AND up.user_id = $1
      WHERE up.solved = true 
      ORDER BY up.updated_at DESC
    `, [userId]);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching solved problems:', err);
    res.status(500).json({ error: 'Failed to fetch solved problems' });
  }
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/problems', problemRoutes);
router.use('/calendar', calendarRoutes);
router.use('/reviews', reviewRoutes);
router.use('/patterns', patternRoutes);
router.use('/concepts', conceptRoutes);

module.exports = router;
