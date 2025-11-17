const express = require('express');
const router = express.Router();

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
router.get('/stats', async (req, res) => {
  const pool = require('../config/database');
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_problems,
        COUNT(CASE WHEN solved = true THEN 1 END) as solved_problems,
        COUNT(CASE WHEN difficulty = 'easy' THEN 1 END) as easy_count,
        COUNT(CASE WHEN difficulty = 'medium' THEN 1 END) as medium_count,
        COUNT(CASE WHEN difficulty = 'hard' THEN 1 END) as hard_count
      FROM problems
    `);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Solved problems endpoint
router.get('/solved', async (req, res) => {
  const pool = require('../config/database');
  try {
    const result = await pool.query(
      'SELECT * FROM problems WHERE solved = true ORDER BY updated_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch solved problems' });
  }
});

// Mount routes
router.use('/problems', problemRoutes);
router.use('/calendar', calendarRoutes);
router.use('/reviews', reviewRoutes);
router.use('/patterns', patternRoutes);
router.use('/concepts', conceptRoutes);

module.exports = router;
