const express = require('express');
const router = express.Router();
const conceptController = require('../controllers/conceptController');

router.get('/', conceptController.getAllConcepts);
router.get('/legacy', conceptController.getLegacyConcepts);
router.post('/', conceptController.createConcept);

module.exports = router;
