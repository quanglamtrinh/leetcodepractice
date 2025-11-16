const pool = require('../config/database');
const asyncHandler = require('../middleware/asyncHandler');
const ApiError = require('../utils/ApiError');

// Get all problems
exports.getAllProblems = asyncHandler(async (req, res) => {
  const { sortBy = 'concept' } = req.query;
  
  let orderBy = 'concept, title';
  if (sortBy === 'popularity') {
    orderBy = 'popularity DESC NULLS LAST, concept, title';
  } else if (sortBy === 'difficulty') {
    orderBy = 'difficulty, concept, title';
  } else if (sortBy === 'acceptance') {
    orderBy = 'acceptance_rate DESC NULLS LAST, concept, title';
  }
  
  const result = await pool.query(`SELECT * FROM problems ORDER BY ${orderBy}`);
  res.json(result.rows);
});

// Get problem by ID
exports.getProblemById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await pool.query('SELECT * FROM problems WHERE id = $1', [id]);
  
  if (result.rows.length === 0) {
    throw ApiError.notFound('Problem not found');
  }
  
  res.json(result.rows[0]);
});

// Update problem notes
exports.updateNotes = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { notes } = req.body;
  
  const result = await pool.query(
    'UPDATE problems SET notes = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
    [notes, id]
  );

  if (result.rows.length === 0) {
    const error = new Error('Problem not found');
    error.statusCode = 404;
    throw error;
  }

  res.json(result.rows[0]);
});

// Update problem progress
exports.updateProgress = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { solved, notes, solution, solved_date } = req.body;
  
  if (typeof solved !== 'boolean') {
    throw ApiError.badRequest('solved must be a boolean');
  }

  const solutionValue = solution && solution.trim() !== '' ? parseInt(solution) : null;
  
  const result = await pool.query(
    'UPDATE problems SET solved = $1, notes = $2, solution = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
    [solved, notes, solutionValue, id]
  );

  if (result.rows.length === 0) {
    const error = new Error('Problem not found');
    error.statusCode = 404;
    throw error;
  }

  if (solved) {
    await pool.query('SELECT add_review_session($1, $2, $3, NULL)', [id, 'remembered', notes || 'Initial solve']);
  } else {
    await pool.query('DELETE FROM review_history WHERE problem_id = $1', [id]);
  }

  res.json(result.rows[0]);
});

// Get statistics
exports.getStats = asyncHandler(async (req, res) => {
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
});
