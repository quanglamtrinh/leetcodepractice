const express = require('express');
const router = express.Router();
const problemController = require('../controllers/problemController');

// GET /api/problems - Get all problems
router.get('/', problemController.getAllProblems);

// GET /api/problems/:id - Get problem by ID
router.get('/:id', problemController.getProblemById);

// GET /api/problems/:id/similar - Get similar problems
router.get('/:id/similar', problemController.getSimilarProblems);

// GET /api/problems/:id/review-history - Get review history
router.get('/:id/review-history', problemController.getReviewHistory);

// POST /api/problems/:id/similar/transitive - Add similar problem
router.post('/:id/similar/transitive', problemController.addSimilarProblem);

// DELETE /api/problems/:id/similar/transitive/:similarId - Remove similar problem
router.delete('/:id/similar/transitive/:similarId', problemController.removeSimilarProblem);

// PUT /api/problems/:id/notes - Update notes
router.put('/:id/notes', problemController.updateNotes);

// PUT /api/problems/:id/progress - Update progress
router.put('/:id/progress', problemController.updateProgress);

module.exports = router;
