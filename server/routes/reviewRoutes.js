const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');

router.get('/due-today', reviewController.getDueProblems);
router.get('/solved', reviewController.getSolvedProblems);
router.get('/:problemId/history', reviewController.getReviewHistory);
router.post('/:problemId/session', reviewController.addReviewSession);

module.exports = router;
