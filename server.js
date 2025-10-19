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
    
    // Check if both problems exist
    const problemCheck = await pool.query(`
      SELECT id, similar_problems FROM problems WHERE id = $1
    `, [id]);

    if (problemCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    const similarProblemCheck = await pool.query(`
      SELECT id, similar_problems FROM problems WHERE id = $1
    `, [similarId]);

    if (similarProblemCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Similar problem not found' });
    }

    const problem1 = problemCheck.rows[0];
    const problem2 = similarProblemCheck.rows[0];

    // Get all current similar problems for both problems
    const problem1Similar = problem1.similar_problems || [];
    const problem2Similar = problem2.similar_problems || [];

    // Check if the relationship exists
    if (!problem1Similar.includes(parseInt(similarId)) || !problem2Similar.includes(parseInt(id))) {
      return res.status(400).json({ error: 'Similar relationship does not exist' });
    }

    // Find common similar problems between the two problems
    const commonSimilar = problem1Similar.filter(id1 => 
      problem2Similar.includes(id1) && id1 !== parseInt(id) && id1 !== parseInt(similarId)
    );

    // Remove the direct relationship
    const problem1NewSimilar = problem1Similar.filter(id1 => id1 !== parseInt(similarId));
    const problem2NewSimilar = problem2Similar.filter(id2 => id2 !== parseInt(id));

    // For each common similar problem, remove the other problem from their similar list
    // This breaks the transitive relationship
    for (const commonId of commonSimilar) {
      // Remove problem1 from commonId's similar list
      await pool.query(`
        UPDATE problems 
        SET similar_problems = array_remove(similar_problems, $1),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [id, commonId]);

      // Remove problem2 from commonId's similar list
      await pool.query(`
        UPDATE problems 
        SET similar_problems = array_remove(similar_problems, $1),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [similarId, commonId]);
    }

    // Update problem1 with its new similar problems (without the removed one)
    const problem1Result = await pool.query(`
      UPDATE problems 
      SET similar_problems = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING similar_problems
    `, [problem1NewSimilar, id]);

    // Update problem2 with its new similar problems (without the removed one)
    const problem2Result = await pool.query(`
      UPDATE problems 
      SET similar_problems = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING similar_problems
    `, [problem2NewSimilar, similarId]);

    res.json({ 
      message: 'Similar problems removed with transitive closure successfully',
      problem1_similar_problems: problem1Result.rows[0].similar_problems,
      problem2_similar_problems: problem2Result.rows[0].similar_problems,
      removed_relationships: {
        problem1_id: id,
        problem2_id: similarId,
        transitive_removals: {
          common_similar_problems: commonSimilar,
          removed_from_common: commonSimilar.map(commonId => ({
            problem_id: commonId,
            removed_problem1: id,
            removed_problem2: similarId
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
