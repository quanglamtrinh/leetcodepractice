const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('.')); // Serve static files

// Database connection with better error handling
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'leetcode_practice',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 20,
});

// Test database connection on startup
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    console.log('🔧 Make sure PostgreSQL is running and .env file is configured');
  } else {
    console.log('✅ Database connected successfully');
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    database: 'connected'
  });
});

// Get all problems
app.get('/api/problems', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM problems
      ORDER BY concept, title
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching problems:', err);
    res.status(500).json({ error: 'Failed to fetch problems' });
  }
});

// Get problems by concept
app.get('/api/problems/concept/:concept', async (req, res) => {
  try {
    const { concept } = req.params;
    const result = await pool.query(`
      SELECT * FROM problems WHERE concept = $1 ORDER BY title
    `, [concept]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching problems by concept:', err);
    res.status(500).json({ error: 'Failed to fetch problems' });
  }
});

// Get a single problem by ID
app.get('/api/problems/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT * FROM problems WHERE id = $1
    `, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Problem not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching problem:', err);
    res.status(500).json({ error: 'Failed to fetch problem' });
  }
});

// Update problem progress with spaced repetition initialization
app.put('/api/problems/:id/progress', async (req, res) => {
  try {
    const { id } = req.params;
    const { solved, notes, solution, solved_date } = req.body;
    if (typeof solved !== 'boolean') {
      return res.status(400).json({ error: 'solved must be a boolean' });
    }

    // Fetch current solved state and first_solved_date
    const currentResult = await pool.query('SELECT solved, first_solved_date FROM problems WHERE id = $1', [id]);
    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Problem not found' });
    }
    const wasSolved = currentResult.rows[0].solved;
    const firstSolvedDate = currentResult.rows[0].first_solved_date;

    if (solved) {
      // Marking as solved
      // Use today's date in local timezone for initial review
      let initialReviewDate = firstSolvedDate ? new Date(firstSolvedDate) : (solved_date ? new Date(solved_date) : new Date());
      let initialReviewDateStr = initialReviewDate.toISOString().split('T')[0];

      // If this is the first time solving, ensure we use today's date
      if (!firstSolvedDate) {
        // Get today's date in local timezone to avoid timezone issues
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;
        initialReviewDateStr = todayStr;
        await pool.query(`
          UPDATE problems SET first_solved_date = $1 WHERE id = $2
        `, [todayStr, id]);
      }
      // Calculate next review date - first review should be today
      const nextReviewDate = new Date(initialReviewDateStr);

      // Update problem with spaced repetition data
      const result = await pool.query(`
        UPDATE problems 
        SET solved = $1, 
            notes = $2, 
            solution = $3,
            current_interval = 0,
            next_review_date = $4,
            in_review_cycle = TRUE,
            review_count = 0,
            updated_at = CURRENT_TIMESTAMP 
        WHERE id = $5 
        RETURNING *
      `, [solved, notes, solution, nextReviewDate.toISOString().split('T')[0], id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Problem not found' });
      }

      // Add initial review history entry with first_solved_date as the fixed initial date
      // Only add if not already present
      const initialHistory = await pool.query(`
        SELECT 1 FROM review_history WHERE problem_id = $1 AND result = 'initial'`, [id]);
      if (initialHistory.rows.length === 0) {
        await pool.query(`
          INSERT INTO review_history (problem_id, review_date, result, interval_days, next_review_date)
          VALUES ($1, $2, $3, $4, $5)
        `, [id, initialReviewDateStr, 'initial', 1, nextReviewDate.toISOString().split('T')[0]]);
      }

      res.json(result.rows[0]);
    } else {
      // Marking as unsolved - clear all review data
      const result = await pool.query(`
        UPDATE problems 
        SET solved = $1, 
            notes = $2, 
            solution = $3,
            first_solved_date = NULL,
            current_interval = 0,
            next_review_date = NULL,
            in_review_cycle = FALSE,
            review_count = 0,
            updated_at = CURRENT_TIMESTAMP 
        WHERE id = $4 
        RETURNING *
      `, [solved, notes, solution, id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Problem not found' });
      }

      // Clear all review history for this problem
      await pool.query(`
        DELETE FROM review_history WHERE problem_id = $1
      `, [id]);

      res.json(result.rows[0]);
    }
  } catch (err) {
    console.error('Error updating progress:', err);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

// Get progress statistics
app.get('/api/stats', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_problems,
        COUNT(CASE WHEN solved = true THEN 1 END) as solved_problems,
        COUNT(CASE WHEN difficulty = 'Easy' THEN 1 END) as easy_count,
        COUNT(CASE WHEN difficulty = 'Medium' THEN 1 END) as medium_count,
        COUNT(CASE WHEN difficulty = 'Hard' THEN 1 END) as hard_count,
        COUNT(CASE WHEN difficulty = 'Easy' AND solved = true THEN 1 END) as solved_easy,
        COUNT(CASE WHEN difficulty = 'Medium' AND solved = true THEN 1 END) as solved_medium,
        COUNT(CASE WHEN difficulty = 'Hard' AND solved = true THEN 1 END) as solved_hard
      FROM problems
    `);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Reference Data Endpoints (New comprehensive schema)

// Get all concepts
app.get('/api/concepts', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, concept_id, name, created_at
      FROM concepts
      ORDER BY name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching concepts:', err);
    res.status(500).json({ error: 'Failed to fetch concepts' });
  }
});

// Create new concept
app.post('/api/concepts', async (req, res) => {
  try {
    const { concept_id, name } = req.body;
    
    if (!concept_id || !name) {
      return res.status(400).json({ error: 'concept_id and name are required' });
    }
    
    const result = await pool.query(`
      INSERT INTO concepts (concept_id, name)
      VALUES ($1, $2)
      RETURNING id, concept_id, name, created_at
    `, [concept_id, name]);
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating concept:', err);
    if (err.code === '23505') {
      res.status(409).json({ error: 'Concept with this ID already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create concept' });
    }
  }
});

// Get all techniques
app.get('/api/techniques', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, description, created_at
      FROM techniques
      ORDER BY name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching techniques:', err);
    res.status(500).json({ error: 'Failed to fetch techniques' });
  }
});

// Create new technique
app.post('/api/techniques', async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }
    
    const result = await pool.query(`
      INSERT INTO techniques (name, description)
      VALUES ($1, $2)
      RETURNING id, name, description, created_at
    `, [name, description || null]);
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating technique:', err);
    if (err.code === '23505') {
      res.status(409).json({ error: 'Technique with this name already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create technique' });
    }
  }
});

// Get all goals
app.get('/api/goals', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, description, created_at
      FROM goals
      ORDER BY name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching goals:', err);
    res.status(500).json({ error: 'Failed to fetch goals' });
  }
});

// Create new goal
app.post('/api/goals', async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }
    
    const result = await pool.query(`
      INSERT INTO goals (name, description)
      VALUES ($1, $2)
      RETURNING id, name, description, created_at
    `, [name, description || null]);
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating goal:', err);
    if (err.code === '23505') {
      res.status(409).json({ error: 'Goal with this name already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create goal' });
    }
  }
});

// Get all template basics
app.get('/api/template-basics', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, description, template_code, created_at
      FROM template_basics
      ORDER BY description
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching template basics:', err);
    res.status(500).json({ error: 'Failed to fetch template basics' });
  }
});

// Create new template basic
app.post('/api/template-basics', async (req, res) => {
  try {
    const { description, template_code } = req.body;
    
    if (!description || !template_code) {
      return res.status(400).json({ error: 'description and template_code are required' });
    }
    
    const result = await pool.query(`
      INSERT INTO template_basics (description, template_code)
      VALUES ($1, $2)
      RETURNING id, description, template_code, created_at
    `, [description, template_code]);
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating template basic:', err);
    res.status(500).json({ error: 'Failed to create template basic' });
  }
});

// Pattern Management Endpoints

// Get all patterns with optional filtering
app.get('/api/patterns', async (req, res) => {
  try {
    const { concept_id } = req.query;
    
    let query = `
      SELECT 
        p.id, 
        p.name, 
        p.description, 
        p.template_id,
        p.concept_id,
        p.created_at,
        c.name as concept_name,
        c.concept_id as concept_identifier,
        tb.description as template_description
      FROM patterns p
      LEFT JOIN concepts c ON p.concept_id = c.id
      LEFT JOIN template_basics tb ON p.template_id = tb.id
    `;
    
    const params = [];
    if (concept_id) {
      query += ' WHERE c.concept_id = $1';
      params.push(concept_id);
    }
    
    query += ' ORDER BY p.name';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching patterns:', err);
    res.status(500).json({ error: 'Failed to fetch patterns' });
  }
});

// Get a specific pattern by ID
app.get('/api/patterns/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT 
        p.id, 
        p.name, 
        p.description, 
        p.template_id,
        p.concept_id,
        p.created_at,
        c.name as concept_name,
        c.concept_id as concept_identifier,
        tb.description as template_description,
        tb.template_code
      FROM patterns p
      LEFT JOIN concepts c ON p.concept_id = c.id
      LEFT JOIN template_basics tb ON p.template_id = tb.id
      WHERE p.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pattern not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching pattern:', err);
    res.status(500).json({ error: 'Failed to fetch pattern' });
  }
});

// Create new pattern
app.post('/api/patterns', async (req, res) => {
  try {
    const { name, description, template_id, concept_id } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }
    
    const result = await pool.query(`
      INSERT INTO patterns (name, description, template_id, concept_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, description, template_id, concept_id, created_at
    `, [name, description || null, template_id || null, concept_id || null]);
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating pattern:', err);
    res.status(500).json({ error: 'Failed to create pattern' });
  }
});

// Update existing pattern
app.put('/api/patterns/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, template_id, concept_id } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }
    
    const result = await pool.query(`
      UPDATE patterns 
      SET name = $1, description = $2, template_id = $3, concept_id = $4
      WHERE id = $5
      RETURNING id, name, description, template_id, concept_id, created_at
    `, [name, description || null, template_id || null, concept_id || null, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pattern not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating pattern:', err);
    res.status(500).json({ error: 'Failed to update pattern' });
  }
});

// Get variants for a specific pattern
app.get('/api/patterns/:id/variants', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT 
        v.id,
        v.name,
        v.use_when,
        v.notes,
        v.pattern_id,
        v.technique_id,
        v.goal_id,
        v.concept_id,
        v.template_pattern_id,
        v.created_at,
        t.name as technique_name,
        g.name as goal_name,
        c.name as concept_name
      FROM variants v
      LEFT JOIN techniques t ON v.technique_id = t.id
      LEFT JOIN goals g ON v.goal_id = g.id
      LEFT JOIN concepts c ON v.concept_id = c.id
      WHERE v.pattern_id = $1
      ORDER BY v.name
    `, [id]);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching pattern variants:', err);
    res.status(500).json({ error: 'Failed to fetch pattern variants' });
  }
});

// Variant Management Endpoints

// Get all variants with optional filtering
app.get('/api/variants', async (req, res) => {
  try {
    const { pattern_id } = req.query;
    
    let query = `
      SELECT 
        v.id,
        v.name,
        v.use_when,
        v.notes,
        v.pattern_id,
        v.technique_id,
        v.goal_id,
        v.concept_id,
        v.template_pattern_id,
        v.created_at,
        p.name as pattern_name,
        t.name as technique_name,
        g.name as goal_name,
        c.name as concept_name
      FROM variants v
      LEFT JOIN patterns p ON v.pattern_id = p.id
      LEFT JOIN techniques t ON v.technique_id = t.id
      LEFT JOIN goals g ON v.goal_id = g.id
      LEFT JOIN concepts c ON v.concept_id = c.id
    `;
    
    const params = [];
    if (pattern_id) {
      query += ' WHERE v.pattern_id = $1';
      params.push(pattern_id);
    }
    
    query += ' ORDER BY v.name';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching variants:', err);
    res.status(500).json({ error: 'Failed to fetch variants' });
  }
});

// Get a specific variant by ID
app.get('/api/variants/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT 
        v.id,
        v.name,
        v.use_when,
        v.notes,
        v.pattern_id,
        v.technique_id,
        v.goal_id,
        v.concept_id,
        v.template_pattern_id,
        v.created_at,
        p.name as pattern_name,
        t.name as technique_name,
        g.name as goal_name,
        c.name as concept_name
      FROM variants v
      LEFT JOIN patterns p ON v.pattern_id = p.id
      LEFT JOIN techniques t ON v.technique_id = t.id
      LEFT JOIN goals g ON v.goal_id = g.id
      LEFT JOIN concepts c ON v.concept_id = c.id
      WHERE v.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Variant not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching variant:', err);
    res.status(500).json({ error: 'Failed to fetch variant' });
  }
});

// Create new variant
app.post('/api/variants', async (req, res) => {
  try {
    const { 
      name, 
      use_when, 
      notes, 
      pattern_id, 
      technique_id, 
      goal_id, 
      concept_id, 
      template_pattern_id 
    } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }
    
    if (!use_when) {
      return res.status(400).json({ error: 'use_when is required' });
    }
    
    const result = await pool.query(`
      INSERT INTO variants (
        name, use_when, notes, pattern_id, technique_id, 
        goal_id, concept_id, template_pattern_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, name, use_when, notes, pattern_id, technique_id, 
                goal_id, concept_id, template_pattern_id, created_at
    `, [
      name, 
      use_when || null, 
      notes || null, 
      pattern_id || null, 
      technique_id || null,
      goal_id || null, 
      concept_id || null, 
      template_pattern_id || null
    ]);
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating variant:', err);
    if (err.code === '23503') {
      res.status(400).json({ error: 'Invalid foreign key reference' });
    } else {
      res.status(500).json({ error: 'Failed to create variant' });
    }
  }
});

// Update existing variant
app.put('/api/variants/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      use_when, 
      notes, 
      pattern_id, 
      technique_id, 
      goal_id, 
      concept_id, 
      template_pattern_id 
    } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }
    
    if (!use_when) {
      return res.status(400).json({ error: 'use_when is required' });
    }
    
    const result = await pool.query(`
      UPDATE variants 
      SET name = $1, use_when = $2, notes = $3, pattern_id = $4, 
          technique_id = $5, goal_id = $6, concept_id = $7, 
          template_pattern_id = $8
      WHERE id = $9
      RETURNING id, name, use_when, notes, pattern_id, technique_id, 
                goal_id, concept_id, template_pattern_id, created_at
    `, [
      name, 
      use_when || null, 
      notes || null, 
      pattern_id || null, 
      technique_id || null,
      goal_id || null, 
      concept_id || null, 
      template_pattern_id || null,
      id
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Variant not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating variant:', err);
    if (err.code === '23503') {
      res.status(400).json({ error: 'Invalid foreign key reference' });
    } else {
      res.status(500).json({ error: 'Failed to update variant' });
    }
  }
});

// Delete variant
app.delete('/api/variants/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      DELETE FROM variants WHERE id = $1 RETURNING id, name
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Variant not found' });
    }
    
    res.json({ 
      message: 'Variant deleted successfully', 
      deleted: result.rows[0] 
    });
  } catch (err) {
    console.error('Error deleting variant:', err);
    res.status(500).json({ error: 'Failed to delete variant' });
  }
});

// Legacy concepts endpoint for backward compatibility
app.get('/api/concepts-legacy', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        concept,
        COUNT(*) as total_problems,
        COUNT(CASE WHEN solved = true THEN 1 END) as solved_problems
      FROM problems
      GROUP BY concept
      ORDER BY concept
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching legacy concepts:', err);
    res.status(500).json({ error: 'Failed to fetch concepts' });
  }
});

// Search problems
app.get('/api/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Search query required' });
    }
    
    const result = await pool.query(`
      SELECT * FROM problems WHERE title ILIKE $1 OR concept ILIKE $1 ORDER BY title LIMIT 50
    `, [`%${q}%`]);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error searching problems:', err);
    res.status(500).json({ error: 'Failed to search problems' });
  }
});

// Import problems from CSV (one-time setup)
app.post('/api/import-problems', async (req, res) => {
  try {
    const fs = require('fs');
    const csvPath = path.join(__dirname, 'leetcode_master_with_popularity.csv');
    
    if (!fs.existsSync(csvPath)) {
      return res.status(404).json({ error: 'CSV file not found' });
    }
    
    let problems = [];
    
    try {
      const csv = require('csv-parser');
      problems = await new Promise((resolve, reject) => {
        const results = [];
        fs.createReadStream(csvPath)
          .pipe(csv())
          .on('data', (row) => {
            results.push({
              title: row.Title || row.title || '',
              concept: row.Concept || row.concept || '',
              difficulty: row.Difficulty || row.difficulty || 'Medium',
              acceptance_rate: parseFloat(row.Acceptance || row.acceptance) || null,
              popularity: parseInt(row.Popularity || row.popularity) || null,
              leetcode_link: row.LeetCodeLink || row.leetcodeLink || ''
            });
          })
          .on('end', () => resolve(results))
          .on('error', reject);
      });
    } catch (err) {
      // Fallback to simple CSV parsing
      const csvContent = fs.readFileSync(csvPath, 'utf8');
      const lines = csvContent.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
          const row = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          
          problems.push({
            title: row.Title || row.title || '',
            concept: row.Concept || row.concept || '',
            difficulty: row.Difficulty || row.difficulty || 'Medium',
            acceptance_rate: parseFloat(row.Acceptance || row.acceptance) || null,
            popularity: parseInt(row.Popularity || row.popularity) || null,
            leetcode_link: row.LeetCodeLink || row.leetcodeLink || ''
          });
        }
      }
    }
    
    if (problems.length === 0) {
      return res.status(400).json({ error: 'No problems found in CSV' });
    }
    
    // Clear existing problems
    await pool.query('DELETE FROM problems');
    
    // Insert problems in batches
    const batchSize = 100;
    for (let i = 0; i < problems.length; i += batchSize) {
      const batch = problems.slice(i, i + batchSize);
      
      for (const problem of batch) {
        try {
          await pool.query(`
            INSERT INTO problems (title, concept, difficulty, acceptance_rate, popularity, leetcode_link)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            problem.title,
            problem.concept,
            problem.difficulty,
            problem.acceptance_rate,
            problem.popularity,
            problem.leetcode_link
          ]);
        } catch (err) {
          console.error(`Error importing problem "${problem.title}":`, err.message);
        }
      }
    }
    
    res.json({ 
      message: `Imported ${problems.length} problems successfully`,
      count: problems.length
    });
    
  } catch (err) {
    console.error('Error importing problems:', err);
    res.status(500).json({ error: 'Failed to import problems' });
  }
});

// Get all solved problems
app.get('/api/solved', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM problems WHERE solved = TRUE ORDER BY concept, title
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching solved problems:', err);
    res.status(500).json({ error: 'Failed to fetch solved problems' });
  }
});

// Get problems due for review today
app.get('/api/due-today', async (req, res) => {
  try {
    // In /api/due-today, use UTC date string
    const todayUTC = new Date().toISOString().split('T')[0];
    const result = await pool.query(`
      SELECT DISTINCT p.*, 
             rp.pattern as review_pattern,
             p.current_interval,
             p.review_count
      FROM problems p
      LEFT JOIN review_patterns rp ON p.difficulty = rp.difficulty
      WHERE p.solved = TRUE 
        AND p.in_review_cycle = TRUE
        AND (p.next_review_date <= $1 OR p.next_review_date IS NULL)
        AND NOT EXISTS (
          SELECT 1 FROM review_history rh 
          WHERE rh.problem_id = p.id 
          AND rh.review_date = $1
        )
      ORDER BY p.difficulty, p.title
    `, [todayUTC]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching due today problems:', err);
    res.status(500).json({ error: 'Failed to fetch due today problems' });
  }
});

// Get review history for a specific problem
app.get('/api/problems/:id/review-history', async (req, res) => {
  try {
    const { id } = req.params;
    // Get problem details, review stats, and next planned reviews
    const result = await pool.query(`
      SELECT 
        p.title,
        p.difficulty,
        p.concept,
        p.review_count,
        p.next_review_date,
        p.first_solved_date,
        rp.pattern as review_pattern,
        COUNT(rh.id) as total_review_attempts,
        LEAST(COUNT(CASE WHEN rh.result = 'remembered' THEN 1 END), p.review_count) as remembered_attempts,
        COUNT(CASE WHEN rh.result = 'forgot' THEN 1 END) as forgot_attempts,
        CASE 
          WHEN p.review_count > 0 THEN 
            ROUND((LEAST(COUNT(CASE WHEN rh.result = 'remembered' THEN 1 END), p.review_count) * 100.0 / NULLIF(p.review_count, 0)), 2)
          ELSE 0
        END as success_rate
      FROM problems p
      LEFT JOIN review_history rh ON p.id = rh.problem_id
      LEFT JOIN review_patterns rp ON p.difficulty = rp.difficulty
      WHERE p.id = $1
      GROUP BY p.id, p.title, p.difficulty, p.concept, p.review_count, p.next_review_date, p.first_solved_date, rp.pattern
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    const row = result.rows[0];
    // Ensure review_pattern is an array
    if (row.review_pattern && typeof row.review_pattern === 'string') {
      row.review_pattern = row.review_pattern.replace(/[{}]/g, '').split(',').map(Number);
    }
    // Calculate next 3 planned reviews based on first_solved_date
    let nextPlannedReviews = [];
    if (row.first_solved_date && row.review_pattern && Array.isArray(row.review_pattern)) {
      let baseDate = new Date(row.first_solved_date);
      for (let i = 1; i <= 3; i++) {
        // Use the next intervals in the pattern, or repeat the last interval
        let interval = row.review_pattern[Math.min(i, row.review_pattern.length - 1)];
        let plannedDate = new Date(baseDate);
        plannedDate.setDate(baseDate.getDate() + interval);
        nextPlannedReviews.push(plannedDate.toISOString().split('T')[0]);
      }
    }
    row.next_planned_reviews = nextPlannedReviews;

    // Fetch review timeline (last 10 reviews)
    const timelineResult = await pool.query(`
      SELECT review_date, result, interval_days, next_review_date, time_spent_minutes, notes
      FROM review_history
      WHERE problem_id = $1
      ORDER BY review_date ASC
      LIMIT 10
    `, [id]);
    // Adjust intervals: first review should be 0, then follow the pattern
    let timeline = timelineResult.rows;
    if (timeline.length > 0 && row.review_pattern && Array.isArray(row.review_pattern) && row.first_solved_date) {
      for (let i = 0; i < timeline.length; i++) {
        timeline[i].interval_days = row.review_pattern[Math.min(i, row.review_pattern.length - 1)];
      }
    }
    row.review_timeline = timeline;
    res.json(row);
  } catch (err) {
    console.error('Error fetching review history:', err);
    res.status(500).json({ error: 'Failed to fetch review history' });
  }
});

// Mark problem as reviewed (remembered or forgot)
app.put('/api/problems/:id/review', async (req, res) => {
  try {
    const { id } = req.params;
    const { result, time_spent, notes } = req.body; // 'remembered' or 'forgot'
    
    if (!['remembered', 'forgot'].includes(result)) {
      return res.status(400).json({ error: 'Result must be "remembered" or "forgot"' });
    }

    // Get current problem and review pattern
    const problemResult = await pool.query(`
      SELECT p.*, rp.pattern as review_pattern
      FROM problems p
      LEFT JOIN review_patterns rp ON p.difficulty = rp.difficulty
      WHERE p.id = $1
    `, [id]);

    if (problemResult.rows.length === 0) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    const problem = problemResult.rows[0];
    const pattern = problem.review_pattern || [0, 1, 2, 4, 6, 10];
    const currentInterval = problem.current_interval || 0;
    const reviewCount = problem.review_count || 0;

    // Use first_solved_date as the anchor for review intervals
    let anchorDate;
    if (problem.first_solved_date) {
      anchorDate = new Date(problem.first_solved_date);
    } else {
      // Fallback to today if no first_solved_date found
      anchorDate = new Date();
    }

    let newInterval, nextReviewDate;

    if (result === 'remembered') {
      // Move to next interval in pattern
      const nextIndex = Math.min(currentInterval + 1, pattern.length - 1);
      newInterval = nextIndex;
      const daysToAdd = pattern[nextIndex];
      
      // Calculate next review date based on the fixed anchor date
      nextReviewDate = new Date(anchorDate.toISOString().split('T')[0]); // Always UTC
      nextReviewDate.setDate(nextReviewDate.getDate() + daysToAdd);
    } else {
      // Forgot - move back in pattern
      const previousIndex = Math.max(currentInterval - 1, 0);
      newInterval = previousIndex;
      const daysToAdd = pattern[previousIndex];
      
      // Calculate next review date based on the fixed anchor date
      nextReviewDate = new Date(anchorDate.toISOString().split('T')[0]); // Always UTC
      nextReviewDate.setDate(nextReviewDate.getDate() + daysToAdd);
    }

    // Update problem
    await pool.query(`
      UPDATE problems 
      SET current_interval = $1, 
          next_review_date = $2, 
          review_count = $3,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
    `, [newInterval, nextReviewDate.toISOString().split('T')[0], reviewCount + 1, id]);

    // Add to review history with time_spent and notes
    await pool.query(`
      INSERT INTO review_history (problem_id, review_date, result, interval_days, next_review_date, time_spent_minutes, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [id, new Date().toISOString().split('T')[0], result, pattern[newInterval], nextReviewDate.toISOString().split('T')[0], time_spent || null, notes || null]);

    // Get updated problem
    const updatedProblem = await pool.query(`
      SELECT * FROM problems WHERE id = $1
    `, [id]);

    res.json(updatedProblem.rows[0]);
  } catch (err) {
    console.error('Error updating review:', err);
    res.status(500).json({ error: 'Failed to update review' });
  }
});

// Serve the main app
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 API available at http://localhost:${PORT}/api`);
  console.log(`🌐 Frontend available at http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  pool.end(() => {
    console.log('✅ Database connections closed');
    process.exit(0);
  });
}); 
