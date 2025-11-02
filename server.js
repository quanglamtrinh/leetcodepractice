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
    const { sortBy = 'concept' } = req.query;
    
    let orderBy = 'concept, title';
    if (sortBy === 'popularity') {
      orderBy = 'popularity DESC NULLS LAST, concept, title';
    } else if (sortBy === 'difficulty') {
      orderBy = 'difficulty, concept, title';
    } else if (sortBy === 'acceptance') {
      orderBy = 'acceptance_rate DESC NULLS LAST, concept, title';
    }
    
    const result = await pool.query(`
      SELECT * FROM problems
      ORDER BY ${orderBy}
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

// Update problem notes only
app.put('/api/problems/:id/notes', async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    
    const result = await pool.query(`
      UPDATE problems 
      SET notes = $1, 
          updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2 
      RETURNING *
    `, [notes, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating notes:', err);
    res.status(500).json({ error: 'Failed to update notes' });
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

    // Fetch current solved state
    const currentResult = await pool.query('SELECT solved FROM problems WHERE id = $1', [id]);
    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Problem not found' });
    }
    const wasSolved = currentResult.rows[0].solved;

    if (solved) {
      // Marking as solved - use comprehensive schema approach
      // Handle solution field - convert empty string to null for BIGINT field
      const solutionValue = solution && solution.trim() !== '' ? parseInt(solution) : null;
      const result = await pool.query(`
        UPDATE problems 
        SET solved = $1, 
            notes = $2, 
            solution = $3,
            updated_at = CURRENT_TIMESTAMP 
        WHERE id = $4 
        RETURNING *
      `, [solved, notes, solutionValue, id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Problem not found' });
      }

      // Add initial review session using the comprehensive schema function
      await pool.query(`
        SELECT add_review_session($1, 'remembered', $2, NULL)
      `, [id, notes || 'Initial solve']);

      // Auto-create solved problem event when problem is marked as solved
      try {
        const solveDate = solved_date ? solved_date.split('T')[0] : new Date().toISOString().split('T')[0];
        const solvedProblemResult = await pool.query(`
          SELECT create_solved_problem_event($1, $2, $3, $4)
        `, [
          id, 
          solveDate,
          null, // time_spent_minutes - can be added later if needed
          notes || 'Problem solved successfully'
        ]);

        console.log(`✅ Solved problem event created for problem ${id}: Event ID ${solvedProblemResult.rows[0].create_solved_problem_event}`);
      } catch (solvedProblemError) {
        // Log error but don't fail the main operation
        console.error('⚠️  Failed to create solved problem event:', solvedProblemError.message);
      }

      res.json(result.rows[0]);
    } else {
      // Marking as unsolved - clear all review data
      // Handle solution field - convert empty string to null for BIGINT field
      const solutionValue = solution && solution.trim() !== '' ? parseInt(solution) : null;
      const result = await pool.query(`
        UPDATE problems 
        SET solved = $1, 
            notes = $2, 
            solution = $3,
            updated_at = CURRENT_TIMESTAMP 
        WHERE id = $4 
        RETURNING *
      `, [solved, notes, solutionValue, id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Problem not found' });
      }

      // Clear all review history for this problem
      await pool.query(`
        DELETE FROM review_history WHERE problem_id = $1
      `, [id]);

      // Archive solved problem events when problem is marked as unsolved
      try {
        const archiveResult = await pool.query(`
          UPDATE calendar_events 
          SET is_archived = true, updated_at = CURRENT_TIMESTAMP
          WHERE problem_id = $1 AND event_type = 'solved_problem'
          RETURNING id, title
        `, [id]);

        if (archiveResult.rows.length > 0) {
          console.log(`📦 Archived ${archiveResult.rows.length} solved problem event(s) for problem ${id}`);
        }
      } catch (archiveError) {
        // Log error but don't fail the main operation
        console.error('⚠️  Failed to archive solved problem events:', archiveError.message);
      }

      res.json(result.rows[0]);
    }
  } catch (err) {
    console.error('Error updating progress:', err);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

// Update problem solution content (for advanced editor)
app.put('/api/problems/:id/solution', async (req, res) => {
  try {
    const { id } = req.params;
    const { solution } = req.body;
    
    const result = await pool.query(`
      UPDATE problems 
      SET solution = $1,
          updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2 
      RETURNING *
    `, [solution, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating solution:', err);
    res.status(500).json({ error: 'Failed to update solution' });
  }
});

// Get progress statistics
app.get('/api/stats', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_problems,
        COUNT(CASE WHEN solved = true THEN 1 END) as solved_problems,
        COUNT(CASE WHEN difficulty = 'easy' THEN 1 END) as easy_count,
        COUNT(CASE WHEN difficulty = 'medium' THEN 1 END) as medium_count,
        COUNT(CASE WHEN difficulty = 'hard' THEN 1 END) as hard_count,
        COUNT(CASE WHEN difficulty = 'easy' AND solved = true THEN 1 END) as solved_easy,
        COUNT(CASE WHEN difficulty = 'medium' AND solved = true THEN 1 END) as solved_medium,
        COUNT(CASE WHEN difficulty = 'hard' AND solved = true THEN 1 END) as solved_hard
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
    const csvPath = path.join(__dirname, 'leetcode_comprehensive.csv');
    
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
              problem_id: parseInt(row.problem_id) || null,
              title: row.title || '',
              concept: row.concept || '',
              difficulty: row.difficulty || 'medium',
              acceptance_rate: parseFloat(row.acceptance_rate) || null,
              popularity: parseInt(row.popularity) || null,
              leetcode_link: row.leetcode_link || ''
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
            problem_id: parseInt(row.problem_id) || null,
            title: row.title || '',
            concept: row.concept || '',
            difficulty: row.difficulty || 'medium',
            acceptance_rate: parseFloat(row.acceptance_rate) || null,
            popularity: parseInt(row.popularity) || null,
            leetcode_link: row.leetcode_link || ''
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
            INSERT INTO problems (problem_id, title, concept, difficulty, acceptance_rate, popularity, leetcode_link)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [
            problem.problem_id,
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
    // Use the comprehensive schema function to get due problems
    const result = await pool.query(`
      SELECT * FROM get_due_problems_today()
    `);
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
    // Get problem details and review stats using comprehensive schema
    const result = await pool.query(`
      SELECT 
        p.title,
        p.difficulty,
        p.concept,
        rp.pattern as review_pattern,
        COUNT(rh.id) as total_review_attempts,
        COUNT(CASE WHEN rh.result = 'remembered' THEN 1 END) as remembered_attempts,
        COUNT(CASE WHEN rh.result = 'forgot' THEN 1 END) as forgot_attempts,
        CASE 
          WHEN COUNT(rh.id) > 0 THEN 
            ROUND((COUNT(CASE WHEN rh.result = 'remembered' THEN 1 END) * 100.0 / COUNT(rh.id)), 2)
          ELSE 0
        END as success_rate,
        MAX(rh.review_date) as last_reviewed,
        MIN(rh.next_review_date) as next_review
      FROM problems p
      LEFT JOIN review_history rh ON p.id = rh.problem_id
      LEFT JOIN review_patterns rp ON p.difficulty = rp.difficulty
      WHERE p.id = $1
      GROUP BY p.id, p.title, p.difficulty, p.concept, rp.pattern
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    const row = result.rows[0];
    // Ensure review_pattern is an array
    if (row.review_pattern && typeof row.review_pattern === 'string') {
      row.review_pattern = row.review_pattern.replace(/[{}]/g, '').split(',').map(Number);
    }

    // Fetch review timeline (last 10 reviews)
    const timelineResult = await pool.query(`
      SELECT review_date, result, interval_days, next_review_date, time_spent_minutes, review_notes as notes
      FROM review_history
      WHERE problem_id = $1
      ORDER BY review_date ASC
      LIMIT 10
    `, [id]);
    
    row.review_timeline = timelineResult.rows;
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

    // Check if problem exists
    const problemResult = await pool.query(`
      SELECT id FROM problems WHERE id = $1
    `, [id]);

    if (problemResult.rows.length === 0) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    // Use the comprehensive schema function to add review session
    await pool.query(`
      SELECT add_review_session($1, $2, $3, $4)
    `, [id, result, notes || null, time_spent || null]);

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

// ============================================================================
// PROBLEM-PATTERN-VARIANT ASSOCIATION ENDPOINTS
// ============================================================================

// Get all associations for a specific problem
app.get('/api/problems/:id/associations', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT 
        pa.id as association_id,
        pa.problem_id,
        pa.pattern_id,
        pa.variant_id,
        pa.concept_id,
        pa.technique_id,
        pa.goal_id,
        pa.scenario_notes,
        pa.application_notes,
        pa.difficulty_override,
        pa.is_primary,
        pa.created_at,
        p.name as pattern_name,
        p.description as pattern_description,
        v.name as variant_name,
        v.use_when as variant_use_when,
        v.notes as variant_notes,
        c.name as concept_name,
        c.concept_id as concept_identifier,
        t.name as technique_name,
        g.name as goal_name,
        tb.template_code as pattern_template_code
      FROM problem_associations pa
      LEFT JOIN patterns p ON pa.pattern_id = p.id
      LEFT JOIN variants v ON pa.variant_id = v.id
      LEFT JOIN concepts c ON pa.concept_id = c.id
      LEFT JOIN techniques t ON pa.technique_id = t.id
      LEFT JOIN goals g ON pa.goal_id = g.id
      LEFT JOIN template_basics tb ON p.template_id = tb.id
      WHERE pa.problem_id = $1
      ORDER BY pa.is_primary DESC, pa.created_at ASC
    `, [id]);
    
    // Group the results into patterns and variants
    const associations = {
      problem_id: parseInt(id),
      patterns: [],
      variants: [],
      associations: result.rows
    };
    
    // Extract unique patterns and variants
    const patternMap = new Map();
    const variantMap = new Map();
    
    result.rows.forEach(row => {
      if (row.pattern_id && !patternMap.has(row.pattern_id)) {
        patternMap.set(row.pattern_id, {
          id: row.pattern_id,
          name: row.pattern_name,
          description: row.pattern_description,
          concept: row.concept_name,
          concept_id: row.concept_identifier,
          template_code: row.pattern_template_code
        });
      }
      
      if (row.variant_id && !variantMap.has(row.variant_id)) {
        variantMap.set(row.variant_id, {
          id: row.variant_id,
          name: row.variant_name,
          use_when: row.variant_use_when,
          notes: row.variant_notes,
          pattern_id: row.pattern_id,
          technique: row.technique_name,
          goal: row.goal_name
        });
      }
    });
    
    associations.patterns = Array.from(patternMap.values());
    associations.variants = Array.from(variantMap.values());
    
    res.json(associations);
  } catch (err) {
    console.error('Error fetching problem associations:', err);
    res.status(500).json({ error: 'Failed to fetch problem associations' });
  }
});

// Create new association for a problem
app.post('/api/problems/:id/associations', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      pattern_id, 
      variant_id, 
      concept_id, 
      technique_id, 
      goal_id, 
      scenario_notes, 
      application_notes,
      difficulty_override,
      is_primary 
    } = req.body;
    
    // Validate that at least pattern or variant is provided
    if (!pattern_id && !variant_id) {
      return res.status(400).json({ 
        error: 'At least one of pattern_id or variant_id must be provided' 
      });
    }
    
    // If variant is provided, ensure it belongs to the pattern (if pattern is also provided)
    if (variant_id && pattern_id) {
      const variantCheck = await pool.query(
        'SELECT pattern_id FROM variants WHERE id = $1',
        [variant_id]
      );
      
      if (variantCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Variant not found' });
      }
      
      if (variantCheck.rows[0].pattern_id !== pattern_id) {
        return res.status(400).json({ 
          error: 'Variant does not belong to the specified pattern' 
        });
      }
    }
    
    // If only variant is provided, get the pattern_id from the variant
    let finalPatternId = pattern_id;
    if (variant_id && !pattern_id) {
      const variantInfo = await pool.query(
        'SELECT pattern_id FROM variants WHERE id = $1',
        [variant_id]
      );
      
      if (variantInfo.rows.length > 0) {
        finalPatternId = variantInfo.rows[0].pattern_id;
      }
    }
    
    const result = await pool.query(`
      INSERT INTO problem_associations (
        problem_id, pattern_id, variant_id, concept_id, technique_id, goal_id,
        scenario_notes, application_notes, difficulty_override, is_primary
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      id, finalPatternId, variant_id, concept_id, technique_id, goal_id,
      scenario_notes, application_notes, difficulty_override, is_primary || false
    ]);
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating problem association:', err);
    if (err.code === '23503') { // Foreign key violation
      res.status(400).json({ error: 'Invalid reference to pattern, variant, concept, technique, or goal' });
    } else {
      res.status(500).json({ error: 'Failed to create problem association' });
    }
  }
});

// Update existing association
app.put('/api/associations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      pattern_id, 
      variant_id, 
      concept_id, 
      technique_id, 
      goal_id, 
      scenario_notes, 
      application_notes,
      difficulty_override,
      is_primary 
    } = req.body;
    
    // Validate that at least pattern or variant is provided
    if (!pattern_id && !variant_id) {
      return res.status(400).json({ 
        error: 'At least one of pattern_id or variant_id must be provided' 
      });
    }
    
    const result = await pool.query(`
      UPDATE problem_associations 
      SET 
        pattern_id = $1,
        variant_id = $2,
        concept_id = $3,
        technique_id = $4,
        goal_id = $5,
        scenario_notes = $6,
        application_notes = $7,
        difficulty_override = $8,
        is_primary = $9,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *
    `, [
      pattern_id, variant_id, concept_id, technique_id, goal_id,
      scenario_notes, application_notes, difficulty_override, is_primary,
      id
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Association not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating association:', err);
    if (err.code === '23503') { // Foreign key violation
      res.status(400).json({ error: 'Invalid reference to pattern, variant, concept, technique, or goal' });
    } else {
      res.status(500).json({ error: 'Failed to update association' });
    }
  }
});

// Delete association
app.delete('/api/associations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM problem_associations WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Association not found' });
    }
    
    res.json({ message: 'Association deleted successfully', deleted: result.rows[0] });
  } catch (err) {
    console.error('Error deleting association:', err);
    res.status(500).json({ error: 'Failed to delete association' });
  }
});

// Get association by ID with full details
app.get('/api/associations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT 
        pa.*,
        p.name as pattern_name,
        p.description as pattern_description,
        v.name as variant_name,
        v.use_when as variant_use_when,
        v.notes as variant_notes,
        c.name as concept_name,
        t.name as technique_name,
        g.name as goal_name,
        pr.title as problem_title
      FROM problem_associations pa
      LEFT JOIN patterns p ON pa.pattern_id = p.id
      LEFT JOIN variants v ON pa.variant_id = v.id
      LEFT JOIN concepts c ON pa.concept_id = c.id
      LEFT JOIN techniques t ON pa.technique_id = t.id
      LEFT JOIN goals g ON pa.goal_id = g.id
      LEFT JOIN problems pr ON pa.problem_id = pr.id
      WHERE pa.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Association not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching association:', err);
    res.status(500).json({ error: 'Failed to fetch association' });
  }
});

// ============================================================================
// PROBLEM-PATTERN-VARIANT ASSOCIATION ENDPOINTS
// ============================================================================

// Get all associations for a specific problem
app.get('/api/problems/:id/associations', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT 
        pa.id,
        pa.problem_id,
        pa.pattern_id,
        pa.variant_id,
        pa.concept_id,
        pa.technique_id,
        pa.goal_id,
        pa.scenario_notes,
        pa.application_notes,
        pa.difficulty_override,
        pa.is_primary,
        pa.created_at,
        pa.updated_at,
        p.name as pattern_name,
        p.description as pattern_description,
        v.name as variant_name,
        v.use_when as variant_use_when,
        v.notes as variant_notes,
        c.name as concept_name,
        c.concept_id as concept_identifier,
        t.name as technique_name,
        g.name as goal_name,
        tb.template_code as pattern_template_code
      FROM problem_associations pa
      LEFT JOIN patterns p ON pa.pattern_id = p.id
      LEFT JOIN variants v ON pa.variant_id = v.id
      LEFT JOIN concepts c ON pa.concept_id = c.id
      LEFT JOIN techniques t ON pa.technique_id = t.id
      LEFT JOIN goals g ON pa.goal_id = g.id
      LEFT JOIN template_basics tb ON p.template_id = tb.id
      WHERE pa.problem_id = $1
      ORDER BY pa.is_primary DESC, pa.created_at ASC
    `, [id]);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching problem associations:', err);
    res.status(500).json({ error: 'Failed to fetch problem associations' });
  }
});

// Create new problem-pattern-variant association
app.post('/api/problems/:id/associations', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      pattern_id, 
      variant_id, 
      concept_id, 
      technique_id, 
      goal_id,
      scenario_notes,
      application_notes,
      difficulty_override,
      is_primary
    } = req.body;
    
    // Validate that at least pattern or variant is provided
    if (!pattern_id && !variant_id) {
      return res.status(400).json({ error: 'Either pattern_id or variant_id must be provided' });
    }
    
    // If variant is provided, ensure it belongs to the pattern (if pattern is also provided)
    if (variant_id && pattern_id) {
      const variantCheck = await pool.query(
        'SELECT pattern_id FROM variants WHERE id = $1',
        [variant_id]
      );
      
      if (variantCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Variant not found' });
      }
      
      if (variantCheck.rows[0].pattern_id !== parseInt(pattern_id)) {
        return res.status(400).json({ error: 'Variant does not belong to the specified pattern' });
      }
    }
    
    // If only variant is provided, get the pattern from the variant
    let finalPatternId = pattern_id;
    if (variant_id && !pattern_id) {
      const variantInfo = await pool.query(
        'SELECT pattern_id FROM variants WHERE id = $1',
        [variant_id]
      );
      
      if (variantInfo.rows.length > 0) {
        finalPatternId = variantInfo.rows[0].pattern_id;
      }
    }
    
    const result = await pool.query(`
      INSERT INTO problem_associations (
        problem_id, pattern_id, variant_id, concept_id, technique_id, goal_id,
        scenario_notes, application_notes, difficulty_override, is_primary
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      id, 
      finalPatternId, 
      variant_id, 
      concept_id, 
      technique_id, 
      goal_id,
      scenario_notes,
      application_notes,
      difficulty_override,
      is_primary || false
    ]);
    
    // Get the full association data with joined information
    const fullResult = await pool.query(`
      SELECT 
        pa.*,
        p.name as pattern_name,
        v.name as variant_name,
        c.name as concept_name,
        t.name as technique_name,
        g.name as goal_name
      FROM problem_associations pa
      LEFT JOIN patterns p ON pa.pattern_id = p.id
      LEFT JOIN variants v ON pa.variant_id = v.id
      LEFT JOIN concepts c ON pa.concept_id = c.id
      LEFT JOIN techniques t ON pa.technique_id = t.id
      LEFT JOIN goals g ON pa.goal_id = g.id
      WHERE pa.id = $1
    `, [result.rows[0].id]);
    
    res.status(201).json(fullResult.rows[0]);
  } catch (err) {
    console.error('Error creating problem association:', err);
    if (err.code === '23503') { // Foreign key violation
      res.status(400).json({ error: 'Invalid reference to pattern, variant, concept, technique, or goal' });
    } else {
      res.status(500).json({ error: 'Failed to create problem association' });
    }
  }
});

// Update existing association
app.put('/api/associations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      pattern_id, 
      variant_id, 
      concept_id, 
      technique_id, 
      goal_id,
      scenario_notes,
      application_notes,
      difficulty_override,
      is_primary
    } = req.body;
    
    // Validate that at least pattern or variant is provided
    if (!pattern_id && !variant_id) {
      return res.status(400).json({ error: 'Either pattern_id or variant_id must be provided' });
    }
    
    const result = await pool.query(`
      UPDATE problem_associations 
      SET 
        pattern_id = $1,
        variant_id = $2,
        concept_id = $3,
        technique_id = $4,
        goal_id = $5,
        scenario_notes = $6,
        application_notes = $7,
        difficulty_override = $8,
        is_primary = $9,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *
    `, [
      pattern_id, 
      variant_id, 
      concept_id, 
      technique_id, 
      goal_id,
      scenario_notes,
      application_notes,
      difficulty_override,
      is_primary,
      id
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Association not found' });
    }
    
    // Get the full association data with joined information
    const fullResult = await pool.query(`
      SELECT 
        pa.*,
        p.name as pattern_name,
        v.name as variant_name,
        c.name as concept_name,
        t.name as technique_name,
        g.name as goal_name
      FROM problem_associations pa
      LEFT JOIN patterns p ON pa.pattern_id = p.id
      LEFT JOIN variants v ON pa.variant_id = v.id
      LEFT JOIN concepts c ON pa.concept_id = c.id
      LEFT JOIN techniques t ON pa.technique_id = t.id
      LEFT JOIN goals g ON pa.goal_id = g.id
      WHERE pa.id = $1
    `, [id]);
    
    res.json(fullResult.rows[0]);
  } catch (err) {
    console.error('Error updating association:', err);
    if (err.code === '23503') { // Foreign key violation
      res.status(400).json({ error: 'Invalid reference to pattern, variant, concept, technique, or goal' });
    } else {
      res.status(500).json({ error: 'Failed to update association' });
    }
  }
});

// Delete association
app.delete('/api/associations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM problem_associations WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Association not found' });
    }
    
    res.json({ message: 'Association deleted successfully', deleted: result.rows[0] });
  } catch (err) {
    console.error('Error deleting association:', err);
    res.status(500).json({ error: 'Failed to delete association' });
  }
});

// Get variants filtered by pattern (for dynamic form dropdowns)
app.get('/api/patterns/:id/variants-for-association', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT 
        v.id,
        v.name,
        v.use_when,
        v.notes,
        v.technique_id,
        v.goal_id,
        v.concept_id,
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
    console.error('Error fetching variants for pattern:', err);
    res.status(500).json({ error: 'Failed to fetch variants for pattern' });
  }
});

// Get association summary for analytics
app.get('/api/associations/summary', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_associations,
        COUNT(DISTINCT problem_id) as problems_with_associations,
        COUNT(DISTINCT pattern_id) as unique_patterns_used,
        COUNT(DISTINCT variant_id) as unique_variants_used,
        COUNT(CASE WHEN is_primary = true THEN 1 END) as primary_associations
      FROM problem_associations
    `);
    
    const patternStats = await pool.query(`
      SELECT 
        p.name as pattern_name,
        COUNT(pa.id) as usage_count
      FROM patterns p
      LEFT JOIN problem_associations pa ON p.id = pa.pattern_id
      GROUP BY p.id, p.name
      ORDER BY usage_count DESC
      LIMIT 10
    `);
    
    const variantStats = await pool.query(`
      SELECT 
        v.name as variant_name,
        p.name as pattern_name,
        COUNT(pa.id) as usage_count
      FROM variants v
      LEFT JOIN patterns p ON v.pattern_id = p.id
      LEFT JOIN problem_associations pa ON v.id = pa.variant_id
      GROUP BY v.id, v.name, p.name
      ORDER BY usage_count DESC
      LIMIT 10
    `);
    
    res.json({
      summary: result.rows[0],
      top_patterns: patternStats.rows,
      top_variants: variantStats.rows
    });
  } catch (err) {
    console.error('Error fetching association summary:', err);
    res.status(500).json({ error: 'Failed to fetch association summary' });
  }
});

// Get similar problems for a specific problem
app.get('/api/problems/:id/similar', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT similar_problems 
      FROM problems 
      WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    const similarProblemIds = result.rows[0].similar_problems || [];
    
    if (similarProblemIds.length === 0) {
      return res.json([]);
    }

    // Get the actual problem details for similar problems
    const similarProblems = await pool.query(`
      SELECT id, problem_id, title, concept, difficulty, acceptance_rate, popularity, solved, leetcode_link, notes, solution
      FROM problems 
      WHERE id = ANY($1)
      ORDER BY popularity DESC NULLS LAST, id ASC
    `, [similarProblemIds]);

    res.json(similarProblems.rows);
  } catch (err) {
    console.error('Error fetching similar problems:', err);
    res.status(500).json({ error: 'Failed to fetch similar problems' });
  }
});

// Add a problem to similar problems list
app.post('/api/problems/:id/similar', async (req, res) => {
  try {
    const { id } = req.params;
    const { similarProblemId } = req.body;
    
    if (!similarProblemId) {
      return res.status(400).json({ error: 'similarProblemId is required' });
    }

    // Check if the problem exists
    const problemCheck = await pool.query(`
      SELECT id FROM problems WHERE id = $1
    `, [id]);

    if (problemCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    // Check if the similar problem exists
    const similarProblemCheck = await pool.query(`
      SELECT id FROM problems WHERE id = $1
    `, [similarProblemId]);

    if (similarProblemCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Similar problem not found' });
    }

    // Add the similar problem ID to the array (avoid duplicates)
    const result = await pool.query(`
      UPDATE problems 
      SET similar_problems = array_append(similar_problems, $1),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 
        AND NOT ($1 = ANY(similar_problems))
      RETURNING similar_problems
    `, [similarProblemId, id]);

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Problem is already in similar problems list' });
    }

    res.json({ 
      message: 'Similar problem added successfully',
      similar_problems: result.rows[0].similar_problems
    });
  } catch (err) {
    console.error('Error adding similar problem:', err);
    res.status(500).json({ error: 'Failed to add similar problem' });
  }
});

// Remove a problem from similar problems list
app.delete('/api/problems/:id/similar/:similarId', async (req, res) => {
  try {
    const { id, similarId } = req.params;
    
    const result = await pool.query(`
      UPDATE problems 
      SET similar_problems = array_remove(similar_problems, $1),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING similar_problems
    `, [similarId, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    res.json({ 
      message: 'Similar problem removed successfully',
      similar_problems: result.rows[0].similar_problems
    });
  } catch (err) {
    console.error('Error removing similar problem:', err);
    res.status(500).json({ error: 'Failed to remove similar problem' });
  }
});

// Update similar problems list (replace entire array)
app.put('/api/problems/:id/similar', async (req, res) => {
  try {
    const { id } = req.params;
    const { similarProblems } = req.body;
    
    if (!Array.isArray(similarProblems)) {
      return res.status(400).json({ error: 'similarProblems must be an array' });
    }

    // Validate that all similar problem IDs exist
    if (similarProblems.length > 0) {
      const validationResult = await pool.query(`
        SELECT id FROM problems WHERE id = ANY($1)
      `, [similarProblems]);
      
      if (validationResult.rows.length !== similarProblems.length) {
        return res.status(400).json({ error: 'One or more similar problem IDs do not exist' });
      }
    }

    const result = await pool.query(`
      UPDATE problems 
      SET similar_problems = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING similar_problems
    `, [similarProblems, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    res.json({ 
      message: 'Similar problems updated successfully',
      similar_problems: result.rows[0].similar_problems
    });
  } catch (err) {
    console.error('Error updating similar problems:', err);
    res.status(500).json({ error: 'Failed to update similar problems' });
  }
});

// Add similar problems with bilateral transitive closure
app.post('/api/problems/:id/similar/transitive', async (req, res) => {
  try {
    const { id } = req.params;
    const { similarProblemId } = req.body;
    
    if (!similarProblemId) {
      return res.status(400).json({ error: 'similarProblemId is required' });
    }

    // Check if both problems exist
    const problemCheck = await pool.query(`
      SELECT id, similar_problems FROM problems WHERE id = $1
    `, [id]);

    if (problemCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    const similarProblemCheck = await pool.query(`
      SELECT id, similar_problems FROM problems WHERE id = $1
    `, [similarProblemId]);

    if (similarProblemCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Similar problem not found' });
    }

    const problem1 = problemCheck.rows[0];
    const problem2 = similarProblemCheck.rows[0];

    // Get all current similar problems for both problems
    const problem1Similar = problem1.similar_problems || [];
    const problem2Similar = problem2.similar_problems || [];

    // Create sets to avoid duplicates
    const problem1NewSimilar = new Set([...problem1Similar, similarProblemId]);
    const problem2NewSimilar = new Set([...problem2Similar, id]);

    // Add transitive relationships
    // Add all of problem2's similar problems to problem1 (except problem1 itself)
    problem2Similar.forEach(similarId => {
      if (similarId !== id) {
        problem1NewSimilar.add(similarId);
      }
    });

    // Add all of problem1's similar problems to problem2 (except problem2 itself)
    problem1Similar.forEach(similarId => {
      if (similarId !== similarProblemId) {
        problem2NewSimilar.add(similarId);
      }
    });

    // For each of problem2's similar problems, add problem1 to their similar list
    for (const similarId of problem2Similar) {
      if (similarId !== id) {
        await pool.query(`
          UPDATE problems 
          SET similar_problems = array_append(similar_problems, $1),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $2 
            AND NOT ($1 = ANY(similar_problems))
        `, [id, similarId]);
      }
    }

    // For each of problem1's similar problems, add problem2 to their similar list
    for (const similarId of problem1Similar) {
      if (similarId !== similarProblemId) {
        await pool.query(`
          UPDATE problems 
          SET similar_problems = array_append(similar_problems, $1),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $2 
            AND NOT ($1 = ANY(similar_problems))
        `, [similarProblemId, similarId]);
      }
    }

    // Update problem1 with all its new similar problems
    const problem1Result = await pool.query(`
      UPDATE problems 
      SET similar_problems = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING similar_problems
    `, [Array.from(problem1NewSimilar), id]);

    // Update problem2 with all its new similar problems
    const problem2Result = await pool.query(`
      UPDATE problems 
      SET similar_problems = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING similar_problems
    `, [Array.from(problem2NewSimilar), similarProblemId]);

    res.json({ 
      message: 'Similar problems added with transitive closure successfully',
      problem1_similar_problems: problem1Result.rows[0].similar_problems,
      problem2_similar_problems: problem2Result.rows[0].similar_problems,
      added_relationships: {
        problem1_id: id,
        problem2_id: similarProblemId,
        transitive_additions: {
          to_problem1: problem2Similar.filter(id => id !== id),
          to_problem2: problem1Similar.filter(id => id !== similarProblemId)
        }
      }
    });
  } catch (err) {
    console.error('Error adding similar problems with transitive closure:', err);
    res.status(500).json({ error: 'Failed to add similar problems with transitive closure' });
  }
});

// Remove similar problems with bilateral transitive closure
app.delete('/api/problems/:id/similar/transitive/:similarId', async (req, res) => {
  try {
    const { id, similarId } = req.params;
    const problemIdInt = parseInt(id);
    const similarIdInt = parseInt(similarId);
    
    // Check if both problems exist
    const problemCheck = await pool.query(`
      SELECT id, similar_problems FROM problems WHERE id = $1
    `, [problemIdInt]);

    if (problemCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    const similarProblemCheck = await pool.query(`
      SELECT id, similar_problems FROM problems WHERE id = $1
    `, [similarIdInt]);

    if (similarProblemCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Similar problem not found' });
    }

    const problem1 = problemCheck.rows[0];
    const problem2 = similarProblemCheck.rows[0];

    // Get all current similar problems for both problems
    const problem1Similar = problem1.similar_problems || [];
    const problem2Similar = problem2.similar_problems || [];

    // Check if the relationship exists
    if (!problem1Similar.includes(similarIdInt) || !problem2Similar.includes(problemIdInt)) {
      return res.status(400).json({ error: 'Similar relationship does not exist' });
    }

    // Find common similar problems (these are the problems that need to have their relationships updated)
    const commonSimilar = problem1Similar.filter(id1 => 
      problem2Similar.includes(id1) && id1 !== problemIdInt && id1 !== similarIdInt
    );

    console.log(`🔧 Removing relationship between ${problemIdInt} and ${similarIdInt}`);
    console.log(`📋 Problem ${problemIdInt} similar list:`, problem1Similar);
    console.log(`📋 Problem ${similarIdInt} similar list:`, problem2Similar);
    console.log(`📋 Common similar problems:`, commonSimilar);

    // Remove the direct relationship
    const problem1NewSimilar = problem1Similar.filter(id1 => id1 !== similarIdInt);
    const problem2NewSimilar = problem2Similar.filter(id2 => id2 !== problemIdInt);

    // For each common similar problem, we need to:
    // 1. Remove problem1 from commonId's similar list
    // 2. Remove problem2 from commonId's similar list
    // 3. Remove the relationship between problem2 and commonId (from both sides)
    for (const commonId of commonSimilar) {
      // Get the common problem's current similar list
      const commonProblemResult = await pool.query(`
        SELECT similar_problems FROM problems WHERE id = $1
      `, [commonId]);
      
      if (commonProblemResult.rows.length > 0) {
        const commonSimilarList = commonProblemResult.rows[0].similar_problems || [];
        
        // Remove both problem1 and problem2 from commonId's similar list
        const updatedCommonList = commonSimilarList.filter(
          pid => pid !== problemIdInt && pid !== similarIdInt
        );
        
        await pool.query(`
          UPDATE problems 
          SET similar_problems = $1,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [updatedCommonList, commonId]);
        
        console.log(`✅ Updated problem ${commonId}: removed ${problemIdInt} and ${similarIdInt}`);
      }
      
      // Also remove commonId from problem2's list (breaking the link between problem2 and common problems)
      const indexInProblem2 = problem2NewSimilar.indexOf(commonId);
      if (indexInProblem2 !== -1) {
        problem2NewSimilar.splice(indexInProblem2, 1);
        console.log(`✅ Removed ${commonId} from problem ${similarIdInt}'s similar list`);
      }
    }

    // Update problem1 with its new similar problems (without the removed one)
    const problem1Result = await pool.query(`
      UPDATE problems 
      SET similar_problems = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING similar_problems
    `, [problem1NewSimilar, problemIdInt]);

    // Update problem2 with its new similar problems (without the removed one and without common problems)
    const problem2Result = await pool.query(`
      UPDATE problems 
      SET similar_problems = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING similar_problems
    `, [problem2NewSimilar, similarIdInt]);

    console.log(`✅ Final problem ${problemIdInt} similar list:`, problem1Result.rows[0].similar_problems);
    console.log(`✅ Final problem ${similarIdInt} similar list:`, problem2Result.rows[0].similar_problems);

    res.json({ 
      message: 'Similar problems removed with transitive closure successfully',
      problem1_similar_problems: problem1Result.rows[0].similar_problems,
      problem2_similar_problems: problem2Result.rows[0].similar_problems,
      removed_relationships: {
        problem1_id: problemIdInt,
        problem2_id: similarIdInt,
        transitive_removals: {
          common_similar_problems: commonSimilar,
          removed_from_common: commonSimilar.map(commonId => ({
            problem_id: commonId,
            removed_problem1: problemIdInt,
            removed_problem2: similarIdInt
          }))
        }
      }
    });
  } catch (err) {
    console.error('Error removing similar problems with transitive closure:', err);
    res.status(500).json({ error: 'Failed to remove similar problems with transitive closure' });
  }
});

// Add a new problem
app.post('/api/problems', async (req, res) => {
  try {
    const { 
      problem_id, 
      title, 
      concept, 
      concept_id, 
      difficulty, 
      acceptance_rate, 
      popularity, 
      leetcode_link 
    } = req.body;

    // Validate required fields
    if (!title || !concept || !difficulty) {
      return res.status(400).json({ error: 'Title, concept, and difficulty are required' });
    }

    // Validate difficulty
    if (!['easy', 'medium', 'hard'].includes(difficulty.toLowerCase())) {
      return res.status(400).json({ error: 'Difficulty must be easy, medium, or hard' });
    }

    // Check if problem with same title already exists
    const existingProblem = await pool.query(
      'SELECT id FROM problems WHERE title = $1',
      [title]
    );

    if (existingProblem.rows.length > 0) {
      return res.status(400).json({ error: 'A problem with this title already exists' });
    }

    // Insert the new problem
    const result = await pool.query(`
      INSERT INTO problems (
        problem_id, title, concept, difficulty, 
        acceptance_rate, popularity, leetcode_link, solved, 
        notes, solution, similar_problems, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `, [
      problem_id || null,
      title,
      concept,
      difficulty.toLowerCase(),
      acceptance_rate || null,
      popularity || null,
      leetcode_link || null,
      false, // solved
      null, // notes
      null, // solution
      '{}' // similar_problems (empty array)
    ]);

    res.status(201).json({
      message: 'Problem added successfully',
      problem: result.rows[0]
    });

  } catch (err) {
    console.error('Error adding problem:', err);
    res.status(500).json({ error: 'Failed to add problem' });
  }
});

// Calendar API Endpoints

// Get calendar events for a date range
app.get('/api/calendar/events', async (req, res) => {
  try {
    const { start_date, end_date, event_types, include_archived = 'false' } = req.query;
    
    if (!start_date || !end_date) {
      return res.status(400).json({ 
        error: 'start_date and end_date are required',
        example: '/api/calendar/events?start_date=2025-01-01&end_date=2025-01-31'
      });
    }
    
    // Parse event types if provided
    let eventTypesArray = null;
    if (event_types) {
      eventTypesArray = event_types.split(',').map(type => type.trim());
    }
    
    const result = await pool.query(`
      SELECT * FROM get_calendar_events($1, $2, $3, $4)
    `, [start_date, end_date, eventTypesArray, include_archived === 'true']);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching calendar events:', err);
    res.status(500).json({ error: 'Failed to fetch calendar events' });
  }
});

// Get events for a specific day
app.get('/api/calendar/day/:date', async (req, res) => {
  try {
    const { date } = req.params;
    
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ 
        error: 'Invalid date format. Use YYYY-MM-DD',
        example: '/api/calendar/day/2025-01-15'
      });
    }
    
    const result = await pool.query(`
      SELECT * FROM get_events_for_day($1)
    `, [date]);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching day events:', err);
    res.status(500).json({ error: 'Failed to fetch day events' });
  }
});

// Get calendar statistics for a date range
app.get('/api/calendar/stats', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    if (!start_date || !end_date) {
      return res.status(400).json({ 
        error: 'start_date and end_date are required',
        example: '/api/calendar/stats?start_date=2025-01-01&end_date=2025-01-31'
      });
    }
    
    const result = await pool.query(`
      SELECT * FROM get_calendar_stats($1, $2)
    `, [start_date, end_date]);
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching calendar stats:', err);
    res.status(500).json({ error: 'Failed to fetch calendar statistics' });
  }
});

// Get overdue tasks
app.get('/api/calendar/overdue-tasks', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM get_overdue_tasks()
    `);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching overdue tasks:', err);
    res.status(500).json({ error: 'Failed to fetch overdue tasks' });
  }
});

// Get upcoming tasks (next 7 days)
app.get('/api/calendar/upcoming-tasks', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM upcoming_tasks
    `);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching upcoming tasks:', err);
    res.status(500).json({ error: 'Failed to fetch upcoming tasks' });
  }
});

// Practice session history endpoint removed - problems now appear in solved problems panel

// Get monthly calendar overview
app.get('/api/calendar/monthly-overview', async (req, res) => {
  try {
    const { months = 12 } = req.query;
    
    const result = await pool.query(`
      SELECT * FROM calendar_monthly_overview
      LIMIT $1
    `, [parseInt(months)]);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching monthly overview:', err);
    res.status(500).json({ error: 'Failed to fetch monthly overview' });
  }
});

// Calendar Event Management Endpoints (CRUD)

// Create a new calendar event
app.post('/api/calendar/events', async (req, res) => {
  try {
    const {
      event_type,
      title,
      description,
      event_date,
      event_time,
      duration_minutes,
      all_day = false,
      task_status = 'pending',
      due_date,
      priority = 'medium',
      note_content,
      is_pinned = false,
      problem_id,
      time_spent_minutes,
      was_successful,
      content_html,
      parent_event_id,
      tags,
      color,
      reminder_minutes_before
    } = req.body;

    // Validate required fields
    if (!event_type || !title || !event_date) {
      return res.status(400).json({
        error: 'event_type, title, and event_date are required'
      });
    }

    // Validate event_type
    const validEventTypes = ['task', 'note', 'solved_problem', 'reminder'];
    if (!validEventTypes.includes(event_type)) {
      return res.status(400).json({
        error: `event_type must be one of: ${validEventTypes.join(', ')}`
      });
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(event_date)) {
      return res.status(400).json({
        error: 'event_date must be in YYYY-MM-DD format'
      });
    }

    // Type-specific validations
    if (event_type === 'note' && !note_content) {
      return res.status(400).json({
        error: 'note_content is required for note events'
      });
    }

    if (event_type === 'solved_problem' && !problem_id) {
      return res.status(400).json({
        error: 'problem_id is required for solved_problem events'
      });
    }

    const result = await pool.query(`
      INSERT INTO calendar_events (
        event_type, title, description, event_date, event_time, duration_minutes,
        all_day, task_status, due_date, priority, note_content, is_pinned,
        problem_id, time_spent_minutes, was_successful, content_html,
        parent_event_id, tags, color, reminder_minutes_before
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
      ) RETURNING *
    `, [
      event_type, title, description, event_date, event_time, duration_minutes,
      all_day, task_status, due_date, priority, note_content, is_pinned,
      problem_id, time_spent_minutes, was_successful, content_html,
      parent_event_id, tags, color, reminder_minutes_before
    ]);

    res.status(201).json({
      message: 'Calendar event created successfully',
      event: result.rows[0]
    });

  } catch (err) {
    console.error('Error creating calendar event:', err);
    if (err.code === '23503') {
      res.status(400).json({ error: 'Referenced problem_id or parent_event_id does not exist' });
    } else if (err.code === '23514') {
      res.status(400).json({ error: 'Constraint violation: check your input values' });
    } else {
      res.status(500).json({ error: 'Failed to create calendar event' });
    }
  }
});

// Update a calendar event
app.put('/api/calendar/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      event_type,
      title,
      description,
      event_date,
      event_time,
      duration_minutes,
      all_day,
      task_status,
      due_date,
      completed_date,
      priority,
      note_content,
      is_pinned,
      problem_id,
      time_spent_minutes,
      was_successful,
      content_html,
      parent_event_id,
      tags,
      color,
      is_archived,
      reminder_minutes_before,
      is_visible
    } = req.body;

    // Check if event exists
    const existingEvent = await pool.query('SELECT * FROM calendar_events WHERE id = $1', [id]);
    if (existingEvent.rows.length === 0) {
      return res.status(404).json({ error: 'Calendar event not found' });
    }

    // Validate event_type if provided
    if (event_type) {
      const validEventTypes = ['task', 'note', 'solved_problem', 'reminder'];
      if (!validEventTypes.includes(event_type)) {
        return res.status(400).json({
          error: `event_type must be one of: ${validEventTypes.join(', ')}`
        });
      }
    }

    // Validate date format if provided
    if (event_date && !/^\d{4}-\d{2}-\d{2}$/.test(event_date)) {
      return res.status(400).json({
        error: 'event_date must be in YYYY-MM-DD format'
      });
    }

    // Handle task completion
    const finalCompletedDate = task_status === 'completed' && !completed_date 
      ? new Date().toISOString() 
      : completed_date;

    const result = await pool.query(`
      UPDATE calendar_events SET
        event_type = COALESCE($2, event_type),
        title = COALESCE($3, title),
        description = COALESCE($4, description),
        event_date = COALESCE($5, event_date),
        event_time = COALESCE($6, event_time),
        duration_minutes = COALESCE($7, duration_minutes),
        all_day = COALESCE($8, all_day),
        task_status = COALESCE($9, task_status),
        due_date = COALESCE($10, due_date),
        completed_date = COALESCE($11, completed_date),
        priority = COALESCE($12, priority),
        note_content = COALESCE($13, note_content),
        is_pinned = COALESCE($14, is_pinned),
        problem_id = COALESCE($15, problem_id),
        time_spent_minutes = COALESCE($16, time_spent_minutes),
        was_successful = COALESCE($17, was_successful),
        content_html = COALESCE($18, content_html),
        parent_event_id = COALESCE($19, parent_event_id),
        tags = COALESCE($20, tags),
        color = COALESCE($21, color),
        is_archived = COALESCE($22, is_archived),
        reminder_minutes_before = COALESCE($23, reminder_minutes_before),
        is_visible = COALESCE($24, is_visible),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [
      id, event_type, title, description, event_date, event_time, duration_minutes,
      all_day, task_status, due_date, finalCompletedDate, priority, note_content, is_pinned,
      problem_id, time_spent_minutes, was_successful, content_html,
      parent_event_id, tags, color, is_archived, reminder_minutes_before, is_visible
    ]);

    res.json({
      message: 'Calendar event updated successfully',
      event: result.rows[0]
    });

  } catch (err) {
    console.error('Error updating calendar event:', err);
    if (err.code === '23503') {
      res.status(400).json({ error: 'Referenced problem_id or parent_event_id does not exist' });
    } else if (err.code === '23514') {
      res.status(400).json({ error: 'Constraint violation: check your input values' });
    } else {
      res.status(500).json({ error: 'Failed to update calendar event' });
    }
  }
});

// Delete a calendar event
app.delete('/api/calendar/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { soft_delete = 'false' } = req.query;

    // Check if event exists
    const existingEvent = await pool.query('SELECT * FROM calendar_events WHERE id = $1', [id]);
    if (existingEvent.rows.length === 0) {
      return res.status(404).json({ error: 'Calendar event not found' });
    }

    if (soft_delete === 'true') {
      // Soft delete - mark as archived
      const result = await pool.query(`
        UPDATE calendar_events 
        SET is_archived = true, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `, [id]);

      res.json({
        message: 'Calendar event archived successfully',
        event: result.rows[0]
      });
    } else {
      // Hard delete
      await pool.query('DELETE FROM calendar_events WHERE id = $1', [id]);
      
      res.json({
        message: 'Calendar event deleted successfully',
        deleted_id: parseInt(id)
      });
    }

  } catch (err) {
    console.error('Error deleting calendar event:', err);
    res.status(500).json({ error: 'Failed to delete calendar event' });
  }
});

// Get calendar events with filtering
app.get('/api/calendar/events/filter', async (req, res) => {
  try {
    const {
      event_type,
      task_status,
      priority,
      is_archived = 'false',
      is_visible = 'true',
      problem_id,
      start_date,
      end_date,
      limit = 100,
      offset = 0
    } = req.query;

    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    // Build dynamic WHERE clause
    if (event_type) {
      whereConditions.push(`ce.event_type = $${paramIndex}`);
      queryParams.push(event_type);
      paramIndex++;
    }

    if (task_status) {
      whereConditions.push(`ce.task_status = $${paramIndex}`);
      queryParams.push(task_status);
      paramIndex++;
    }

    if (priority) {
      whereConditions.push(`ce.priority = $${paramIndex}`);
      queryParams.push(priority);
      paramIndex++;
    }

    if (problem_id) {
      whereConditions.push(`ce.problem_id = $${paramIndex}`);
      queryParams.push(parseInt(problem_id));
      paramIndex++;
    }

    if (start_date) {
      whereConditions.push(`ce.event_date >= $${paramIndex}`);
      queryParams.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      whereConditions.push(`ce.event_date <= $${paramIndex}`);
      queryParams.push(end_date);
      paramIndex++;
    }

    whereConditions.push(`ce.is_archived = $${paramIndex}`);
    queryParams.push(is_archived === 'true');
    paramIndex++;

    whereConditions.push(`ce.is_visible = $${paramIndex}`);
    queryParams.push(is_visible === 'true');
    paramIndex++;

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const query = `
      SELECT ce.*, p.title as problem_title, p.difficulty as problem_difficulty
      FROM calendar_events ce
      LEFT JOIN problems p ON ce.problem_id = p.id
      ${whereClause}
      ORDER BY ce.event_date DESC, ce.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, queryParams);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM calendar_events ce
      LEFT JOIN problems p ON ce.problem_id = p.id
      ${whereClause}
    `;

    const countResult = await pool.query(countQuery, queryParams.slice(0, -2)); // Remove limit and offset

    res.json({
      events: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        limit: parseInt(limit),
        offset: parseInt(offset),
        has_more: parseInt(offset) + parseInt(limit) < parseInt(countResult.rows[0].total)
      }
    });

  } catch (err) {
    console.error('Error filtering calendar events:', err);
    res.status(500).json({ error: 'Failed to filter calendar events' });
  }
});

// Practice session creation endpoint removed - problems now appear in solved problems panel when marked as solved

// Get practice session statistics
// Practice session statistics endpoint removed
// app.get('/api/calendar/practice-stats', async (req, res) => {
  try {
    const { 
      start_date, 
      end_date, 
      problem_id,
      group_by = 'day' // day, week, month
    } = req.query;

    let dateFilter = '';
    let joinedDateFilter = ''; // For queries with table joins
    let params = [];
    let paramIndex = 1;

    if (start_date) {
      dateFilter += ` AND event_date >= $${paramIndex}`;
      joinedDateFilter += ` AND ce.event_date >= $${paramIndex}`;
      params.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      dateFilter += ` AND event_date <= $${paramIndex}`;
      joinedDateFilter += ` AND ce.event_date <= $${paramIndex}`;
      params.push(end_date);
      paramIndex++;
    }

    if (problem_id) {
      dateFilter += ` AND problem_id = $${paramIndex}`;
      joinedDateFilter += ` AND ce.problem_id = $${paramIndex}`;
      params.push(parseInt(problem_id));
      paramIndex++;
    }

    // Get overall statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_sessions,
        COUNT(CASE WHEN was_successful = true THEN 1 END) as successful_sessions,
        COUNT(CASE WHEN was_successful = false THEN 1 END) as failed_sessions,
        ROUND(
          COUNT(CASE WHEN was_successful = true THEN 1 END) * 100.0 / COUNT(*), 2
        ) as success_rate,
        COALESCE(SUM(time_spent_minutes), 0) as total_time_minutes,
        COALESCE(AVG(time_spent_minutes), 0) as avg_time_per_session,
        COUNT(DISTINCT problem_id) as unique_problems_practiced,
        COUNT(DISTINCT event_date) as active_days
      FROM calendar_events 
      WHERE event_type = 'solved_problem' 
        AND is_archived = false
        ${dateFilter}
    `;

    const statsResult = await pool.query(statsQuery, params);

    // Get time-based breakdown
    let groupByClause;
    switch (group_by) {
      case 'week':
        groupByClause = "DATE_TRUNC('week', event_date)";
        break;
      case 'month':
        groupByClause = "DATE_TRUNC('month', event_date)";
        break;
      default:
        groupByClause = 'event_date';
    }

    const timeBreakdownQuery = `
      SELECT 
        ${groupByClause} as period,
        COUNT(*) as sessions,
        COUNT(CASE WHEN was_successful = true THEN 1 END) as successful,
        COALESCE(SUM(time_spent_minutes), 0) as total_time
      FROM calendar_events 
      WHERE event_type = 'solved_problem' 
        AND is_archived = false
        ${dateFilter}
      GROUP BY ${groupByClause}
      ORDER BY period DESC
      LIMIT 30
    `;

    const timeBreakdownResult = await pool.query(timeBreakdownQuery, params);

    // Get problem-wise statistics
    const problemStatsQuery = `
      SELECT 
        p.id,
        p.title,
        p.difficulty,
        COUNT(ce.id) as session_count,
        COUNT(CASE WHEN ce.was_successful = true THEN 1 END) as successful_count,
        COALESCE(SUM(ce.time_spent_minutes), 0) as total_time,
        MAX(ce.event_date) as last_practiced
      FROM problems p
      INNER JOIN calendar_events ce ON p.id = ce.problem_id
      WHERE ce.event_type = 'solved_problem' 
        AND ce.is_archived = false
        ${joinedDateFilter}
      GROUP BY p.id, p.title, p.difficulty
      ORDER BY session_count DESC, last_practiced DESC
      LIMIT 20
    `;

    const problemStatsResult = await pool.query(problemStatsQuery, params);

    res.json({
      overall_stats: statsResult.rows[0],
      time_breakdown: timeBreakdownResult.rows,
      problem_stats: problemStatsResult.rows,
      filters: {
        start_date,
        end_date,
        problem_id,
        group_by
      }
    });

  } catch (err) {
    console.error('Error fetching practice stats:', err);
    res.status(500).json({ error: 'Failed to fetch practice statistics' });
  }
});

// Bulk operations for calendar events
app.post('/api/calendar/events/bulk', async (req, res) => {
  try {
    const { action, event_ids, updates } = req.body;

    if (!action || !event_ids || !Array.isArray(event_ids)) {
      return res.status(400).json({
        error: 'action and event_ids array are required'
      });
    }

    const validActions = ['archive', 'unarchive', 'delete', 'update'];
    if (!validActions.includes(action)) {
      return res.status(400).json({
        error: `action must be one of: ${validActions.join(', ')}`
      });
    }

    let result;
    const placeholders = event_ids.map((_, index) => `$${index + 1}`).join(',');

    switch (action) {
      case 'archive':
        result = await pool.query(`
          UPDATE calendar_events 
          SET is_archived = true, updated_at = CURRENT_TIMESTAMP
          WHERE id IN (${placeholders})
          RETURNING id, title, is_archived
        `, event_ids);
        break;

      case 'unarchive':
        result = await pool.query(`
          UPDATE calendar_events 
          SET is_archived = false, updated_at = CURRENT_TIMESTAMP
          WHERE id IN (${placeholders})
          RETURNING id, title, is_archived
        `, event_ids);
        break;

      case 'delete':
        result = await pool.query(`
          DELETE FROM calendar_events 
          WHERE id IN (${placeholders})
          RETURNING id, title
        `, event_ids);
        break;

      case 'update':
        if (!updates || typeof updates !== 'object') {
          return res.status(400).json({
            error: 'updates object is required for update action'
          });
        }

        // Build dynamic update query
        const updateFields = Object.keys(updates)
          .filter(key => updates[key] !== undefined)
          .map((key, index) => `${key} = $${event_ids.length + index + 1}`)
          .join(', ');

        if (updateFields.length === 0) {
          return res.status(400).json({ error: 'No valid update fields provided' });
        }

        const updateValues = Object.keys(updates)
          .filter(key => updates[key] !== undefined)
          .map(key => updates[key]);

        result = await pool.query(`
          UPDATE calendar_events 
          SET ${updateFields}, updated_at = CURRENT_TIMESTAMP
          WHERE id IN (${placeholders})
          RETURNING id, title
        `, [...event_ids, ...updateValues]);
        break;
    }

    res.json({
      message: `Bulk ${action} completed successfully`,
      affected_events: result.rows,
      count: result.rows.length
    });

  } catch (err) {
    console.error('Error in bulk calendar operation:', err);
    res.status(500).json({ error: 'Failed to perform bulk operation' });
  }
});

// Day Notes API Endpoints
app.get('/api/calendar/day-notes/:date', async (req, res) => {
  try {
    const { date } = req.params;
    
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }

    const result = await pool.query(`
      SELECT notes FROM day_notes WHERE date = $1
    `, [date]);

    res.json({ 
      notes: result.rows.length > 0 ? result.rows[0].notes : '' 
    });
  } catch (error) {
    console.error('Error fetching day notes:', error);
    res.status(500).json({ error: 'Failed to fetch day notes' });
  }
});

app.put('/api/calendar/day-notes/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const { notes } = req.body;
    
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }

    // Validate notes
    if (typeof notes !== 'string') {
      return res.status(400).json({ error: 'Notes must be a string' });
    }

    // Upsert day notes
    const result = await pool.query(`
      INSERT INTO day_notes (date, notes, created_at, updated_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (date) 
      DO UPDATE SET 
        notes = EXCLUDED.notes,
        updated_at = CURRENT_TIMESTAMP
      RETURNING date, notes
    `, [date, notes]);

    res.json({ 
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error saving day notes:', error);
    res.status(500).json({ error: 'Failed to save day notes' });
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
