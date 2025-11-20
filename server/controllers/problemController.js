const pool = require('../config/database');
const asyncHandler = require('../middleware/asyncHandler');
const ApiError = require('../utils/ApiError');

// Get all problems
exports.getAllProblems = asyncHandler(async (req, res) => {
  const { sortBy = 'concept' } = req.query;
  const userId = req.user.userId;
  
  let orderBy = 'p.concept, p.title';
  if (sortBy === 'popularity') {
    orderBy = 'p.popularity DESC NULLS LAST, p.concept, p.title';
  } else if (sortBy === 'difficulty') {
    orderBy = 'p.difficulty, p.concept, p.title';
  } else if (sortBy === 'acceptance') {
    orderBy = 'p.acceptance_rate DESC NULLS LAST, p.concept, p.title';
  }
  
  const result = await pool.query(`
    SELECT 
      p.id, p.title, p.difficulty, p.concept, p.leetcode_link, p.popularity, p.acceptance_rate,
      p.similar_problems, p.solution, p.created_at, p.updated_at,
      up.solved,
      up.solved_at,
      up.notes
    FROM problems p
    LEFT JOIN user_progress up ON p.id = up.problem_id AND up.user_id = $1
    ORDER BY ${orderBy}
  `, [userId]);
  
  res.json(result.rows);
});

// Get problems by concept
exports.getProblemsByConcept = asyncHandler(async (req, res) => {
  const { concept } = req.params;
  const userId = req.user.userId;
  const { sortBy = 'title' } = req.query;
  
  let orderBy = 'p.title';
  if (sortBy === 'popularity') {
    orderBy = 'p.popularity DESC NULLS LAST, p.title';
  } else if (sortBy === 'difficulty') {
    orderBy = 'p.difficulty, p.title';
  } else if (sortBy === 'acceptance') {
    orderBy = 'p.acceptance_rate DESC NULLS LAST, p.title';
  }
  
  const result = await pool.query(`
    SELECT 
      p.id, p.title, p.difficulty, p.concept, p.leetcode_link, p.popularity, p.acceptance_rate,
      p.similar_problems, p.solution, p.created_at, p.updated_at,
      up.solved,
      up.solved_at,
      up.notes
    FROM problems p
    LEFT JOIN user_progress up ON p.id = up.problem_id AND up.user_id = $1
    WHERE p.concept = $2
    ORDER BY ${orderBy}
  `, [userId, concept]);
  
  res.json(result.rows);
});

// Get problem by ID
exports.getProblemById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;
  
  const result = await pool.query(`
    SELECT 
      p.id, p.title, p.difficulty, p.concept, p.leetcode_link, p.popularity, p.acceptance_rate,
      p.similar_problems, p.solution, p.created_at, p.updated_at,
      up.solved,
      up.solved_at,
      up.notes
    FROM problems p
    LEFT JOIN user_progress up ON p.id = up.problem_id AND up.user_id = $1
    WHERE p.id = $2
  `, [userId, id]);
  
  if (result.rows.length === 0) {
    throw ApiError.notFound('Problem not found');
  }
  
  res.json(result.rows[0]);
});

// Update problem notes
exports.updateNotes = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { notes } = req.body;
  const userId = req.user.userId;
  
  // Verify problem exists
  const problemCheck = await pool.query('SELECT id FROM problems WHERE id = $1', [id]);
  if (problemCheck.rows.length === 0) {
    throw ApiError.notFound('Problem not found');
  }
  
  // Upsert user_progress with notes
  const result = await pool.query(`
    INSERT INTO user_progress (user_id, problem_id, notes, updated_at)
    VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
    ON CONFLICT (user_id, problem_id)
    DO UPDATE SET 
      notes = EXCLUDED.notes,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `, [userId, id, notes]);

  res.json(result.rows[0]);
});

// Update problem progress
exports.updateProgress = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { solved, notes, solution } = req.body;
  const userId = req.user.userId;
  
  if (typeof solved !== 'boolean') {
    throw ApiError.badRequest('solved must be a boolean');
  }

  // Verify problem exists
  const problemCheck = await pool.query('SELECT id FROM problems WHERE id = $1', [id]);
  if (problemCheck.rows.length === 0) {
    throw ApiError.notFound('Problem not found');
  }

  const solutionValue = solution && solution.trim() !== '' ? parseInt(solution) : null;
  
  // Upsert user_progress with solved status, notes, and solved_at timestamp
  const result = await pool.query(`
    INSERT INTO user_progress (user_id, problem_id, solved, solved_at, notes, updated_at)
    VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
    ON CONFLICT (user_id, problem_id)
    DO UPDATE SET 
      solved = EXCLUDED.solved,
      solved_at = EXCLUDED.solved_at,
      notes = EXCLUDED.notes,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `, [userId, id, solved, solved ? new Date() : null, notes]);

  // Update solution in problems table (shared across users)
  if (solutionValue !== null) {
    await pool.query(
      'UPDATE problems SET solution = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [solutionValue, id]
    );
  }

  // Handle review history
  if (solved) {
    await pool.query('SELECT add_review_session($1, $2, $3, $4, $5)', [id, 'remembered', notes || 'Initial solve', null, userId]);
  } else {
    await pool.query('DELETE FROM review_history WHERE problem_id = $1 AND user_id = $2', [id, userId]);
  }

  // Return combined data
  const problemData = await pool.query(`
    SELECT 
      p.id, p.title, p.difficulty, p.concept, p.leetcode_link, p.popularity, p.acceptance_rate,
      p.similar_problems, p.solution, p.created_at, p.updated_at,
      up.solved,
      up.solved_at,
      up.notes
    FROM problems p
    LEFT JOIN user_progress up ON p.id = up.problem_id AND up.user_id = $1
    WHERE p.id = $2
  `, [userId, id]);

  res.json(problemData.rows[0]);
});

// Get solved problems
exports.getSolvedProblems = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  
  const result = await pool.query(`
    SELECT 
      p.id, p.title, p.difficulty, p.concept, p.leetcode_link, p.popularity, p.acceptance_rate,
      p.similar_problems, p.solution, p.created_at, p.updated_at,
      up.solved,
      up.solved_at,
      up.notes
    FROM problems p
    INNER JOIN user_progress up ON p.id = up.problem_id AND up.user_id = $1
    WHERE up.solved = true 
    ORDER BY up.updated_at DESC
  `, [userId]);
  
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
  const userId = req.user.userId;
  
  const result = await pool.query(
    `SELECT * FROM review_history 
     WHERE problem_id = $1 AND user_id = $2
     ORDER BY review_date DESC`,
    [id, userId]
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
