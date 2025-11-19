const express = require('express');
const router = express.Router();
const problemController = require('../controllers/problemController');
const { authenticateToken } = require('../middleware/auth');

// GET /api/problems - Get all problems
router.get('/', authenticateToken, problemController.getAllProblems);

// GET /api/problems/concept/:concept - Get problems by concept
router.get('/concept/:concept', authenticateToken, problemController.getProblemsByConcept);

// GET /api/problems/:id - Get problem by ID
router.get('/:id', authenticateToken, problemController.getProblemById);

// GET /api/problems/:id/similar - Get similar problems
router.get('/:id/similar', authenticateToken, problemController.getSimilarProblems);

// GET /api/problems/:id/review-history - Get review history
router.get('/:id/review-history', authenticateToken, problemController.getReviewHistory);

// POST /api/problems/:id/similar/transitive - Add similar problem
router.post('/:id/similar/transitive', authenticateToken, problemController.addSimilarProblem);

// DELETE /api/problems/:id/similar/transitive/:similarId - Remove similar problem
router.delete('/:id/similar/transitive/:similarId', authenticateToken, problemController.removeSimilarProblem);

// PUT /api/problems/:id/notes - Update notes
router.put('/:id/notes', authenticateToken, problemController.updateNotes);

// PUT /api/problems/:id/solution - Update solution
router.put('/:id/solution', authenticateToken, problemController.updateSolution);

// PUT /api/problems/:id/progress - Update progress
router.put('/:id/progress', authenticateToken, problemController.updateProgress);

module.exports = router;
