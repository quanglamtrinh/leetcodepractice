const express = require('express');
const router = express.Router();
const problemController = require('../controllers/problemController');

// GET /api/problems - Get all problems
router.get('/', problemController.getAllProblems);

// GET /api/problems/:id - Get problem by ID
router.get('/:id', problemController.getProblemById);

// PUT /api/problems/:id/notes - Update notes
router.put('/:id/notes', problemController.updateNotes);

// PUT /api/problems/:id/progress - Update progress
router.put('/:id/progress', problemController.updateProgress);

module.exports = router;
