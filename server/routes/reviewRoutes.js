const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { authenticateToken } = require('../middleware/auth');

// All review routes require authentication
router.get('/due-today', authenticateToken, reviewController.getDueProblems);
router.get('/solved', authenticateToken, reviewController.getSolvedProblems);
router.get('/:problemId/history', authenticateToken, reviewController.getReviewHistory);
router.post('/:problemId/session', authenticateToken, reviewController.addReviewSession);

module.exports = router;
