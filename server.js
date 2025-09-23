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
