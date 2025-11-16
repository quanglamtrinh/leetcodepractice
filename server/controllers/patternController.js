const pool = require('../config/database');

// Get all patterns
exports.getAllPatterns = async (req, res) => {
  try {
    const { concept_id } = req.query;
    
    let query = `
      SELECT 
        p.id, p.name, p.description, p.template_id, p.concept_id, p.created_at,
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
};

// Get pattern by ID
exports.getPatternById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT 
        p.id, p.name, p.description, p.template_id, p.concept_id, p.created_at,
        c.name as concept_name,
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
};

// Create new pattern
exports.createPattern = async (req, res) => {
  try {
    const { name, description, template_id, concept_id } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }
    
    const result = await pool.query(
      'INSERT INTO patterns (name, description, template_id, concept_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, description || null, template_id || null, concept_id || null]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating pattern:', err);
    res.status(500).json({ error: 'Failed to create pattern' });
  }
};

// Update pattern
exports.updatePattern = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, template_id, concept_id } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }
    
    const result = await pool.query(
      'UPDATE patterns SET name = $1, description = $2, template_id = $3, concept_id = $4 WHERE id = $5 RETURNING *',
      [name, description || null, template_id || null, concept_id || null, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pattern not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating pattern:', err);
    res.status(500).json({ error: 'Failed to update pattern' });
  }
};

// Get variants for a pattern
exports.getPatternVariants = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT 
        v.id, v.name, v.use_when, v.notes, v.pattern_id,
        t.name as technique_name,
        g.name as goal_name
      FROM variants v
      LEFT JOIN techniques t ON v.technique_id = t.id
      LEFT JOIN goals g ON v.goal_id = g.id
      WHERE v.pattern_id = $1
      ORDER BY v.name
    `, [id]);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching pattern variants:', err);
    res.status(500).json({ error: 'Failed to fetch pattern variants' });
  }
};
