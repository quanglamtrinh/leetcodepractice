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

// Get solved problems
exports.getSolvedProblems = asyncHandler(async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM problems WHERE solved = true ORDER BY updated_at DESC'
  );
  res.json(result.rows);
});

// Get similar problems
exports.getSimilarProblems = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const result = await pool.query(
    `SELECT p.* FROM problems p
     WHERE p.id = ANY(
       SELECT unnest(similar_problems) FROM problems WHERE id = $1
     )
     ORDER BY p.title`,
    [id]
  );
  
  res.json(result.rows);
});

// Get review history
exports.getReviewHistory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const result = await pool.query(
    `SELECT * FROM review_history 
     WHERE problem_id = $1 
     ORDER BY review_date DESC`,
    [id]
  );
  
  res.json(result.rows);
});

// Add similar problem
exports.addSimilarProblem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { problemId } = req.body;
  
  if (!problemId) {
    throw ApiError.badRequest('problemId is required');
  }
  
  // Add bidirectional relationship
  await pool.query(
    `UPDATE problems 
     SET similar_problems = array_append(similar_problems, $2)
     WHERE id = $1 AND NOT ($2 = ANY(similar_problems))`,
    [id, problemId]
  );
  
  await pool.query(
    `UPDATE problems 
     SET similar_problems = array_append(similar_problems, $2)
     WHERE id = $1 AND NOT ($2 = ANY(similar_problems))`,
    [problemId, id]
  );
  
  res.json({ success: true, message: 'Similar problem added' });
});

// Remove similar problem
exports.removeSimilarProblem = asyncHandler(async (req, res) => {
  const { id, similarId } = req.params;
  
  // Remove bidirectional relationship
  await pool.query(
    `UPDATE problems 
     SET similar_problems = array_remove(similar_problems, $2)
     WHERE id = $1`,
    [id, parseInt(similarId)]
  );
  
  await pool.query(
    `UPDATE problems 
     SET similar_problems = array_remove(similar_problems, $2)
     WHERE id = $1`,
    [parseInt(similarId), id]
  );
  
  res.json({ success: true, message: 'Similar problem removed' });
});

// Update problem solution
exports.updateSolution = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { solution } = req.body;
  
  const result = await pool.query(
    'UPDATE problems SET solution = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
    [solution, id]
  );

  if (result.rows.length === 0) {
    throw ApiError.notFound('Problem not found');
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
