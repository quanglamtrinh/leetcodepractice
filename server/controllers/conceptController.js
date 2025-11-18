const pool = require('../config/database');

// Get all concepts
exports.getAllConcepts = async (req, res) => {
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
};

// Create new concept
exports.createConcept = async (req, res) => {
  try {
    const { concept_id, name } = req.body;
    
    if (!concept_id || !name) {
      return res.status(400).json({ error: 'concept_id and name are required' });
    }
    
    const result = await pool.query(
      'INSERT INTO concepts (concept_id, name) VALUES ($1, $2) RETURNING *',
      [concept_id, name]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating concept:', err);
    if (err.code === '23505') {
      res.status(409).json({ error: 'Concept with this ID already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create concept' });
    }
  }
};

// Get legacy concepts (for backward compatibility)
exports.getLegacyConcepts = async (req, res) => {
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
};
