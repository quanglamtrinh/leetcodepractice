const express = require('express');
const router = express.Router();
const calendarController = require('../controllers/calendarController');

// Calendar events endpoints
router.get('/events', calendarController.getEvents);
router.post('/events', calendarController.createEvent);
router.put('/events/:id', calendarController.updateEvent);
router.delete('/events/:id', calendarController.deleteEvent);

// Day-specific endpoints
router.get('/day/:date', calendarController.getDayEvents);
router.get('/day-notes/:date', calendarController.getDayNotes);
router.put('/day-notes/:date', calendarController.saveDayNotes);

module.exports = router;
