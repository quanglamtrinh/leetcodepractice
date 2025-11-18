const express = require('express');
const router = express.Router();
const patternController = require('../controllers/patternController');

router.get('/', patternController.getAllPatterns);
router.get('/:id', patternController.getPatternById);
router.get('/:id/variants', patternController.getPatternVariants);
router.post('/', patternController.createPattern);
router.put('/:id', patternController.updatePattern);

module.exports = router;
