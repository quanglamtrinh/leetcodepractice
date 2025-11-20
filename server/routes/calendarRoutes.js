const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const calendarController = require('../controllers/calendarController');

// All calendar routes require authentication
router.use(authenticateToken);

// ============================================
// CALENDAR NOTES ROUTES
// ============================================

// Legacy route for day notes (for backward compatibility)
// GET /api/calendar/day-notes/:date - Get notes content for specific date
router.get('/day-notes/:date', calendarController.getDayNotesContent);

// PUT /api/calendar/day-notes/:date - Update notes content for specific date
router.put('/day-notes/:date', calendarController.updateDayNotesContent);

// POST /api/calendar/notes - Create calendar note
router.post('/notes', calendarController.createNote);

// GET /api/calendar/notes/:date - Get notes for specific date
router.get('/notes/:date', calendarController.getNotesByDate);

// PUT /api/calendar/notes/:id - Update calendar note
router.put('/notes/:id', calendarController.updateNote);

// DELETE /api/calendar/notes/:id - Delete calendar note
router.delete('/notes/:id', calendarController.deleteNote);

// ============================================
// CALENDAR TASKS ROUTES
// ============================================

// POST /api/calendar/tasks - Create calendar task
router.post('/tasks', calendarController.createTask);

// GET /api/calendar/tasks/:date - Get tasks for specific date
router.get('/tasks/:date', calendarController.getTasksByDate);

// PUT /api/calendar/tasks/:id - Update calendar task
router.put('/tasks/:id', calendarController.updateTask);

// PUT /api/calendar/tasks/:id/complete - Mark task as complete
router.put('/tasks/:id/complete', calendarController.completeTask);

// DELETE /api/calendar/tasks/:id - Delete calendar task
router.delete('/tasks/:id', calendarController.deleteTask);

// ============================================
// CALENDAR EVENTS ROUTES
// ============================================

// POST /api/calendar/events - Create calendar event
router.post('/events', calendarController.createEvent);

// GET /api/calendar/events - Get events (with query params for date range)
router.get('/events', calendarController.getEvents);

// GET /api/calendar/events/:date - Get events for specific date
router.get('/events/:date', calendarController.getEventsByDate);

// PUT /api/calendar/events/:id - Update calendar event
router.put('/events/:id', calendarController.updateEvent);

// DELETE /api/calendar/events/:id - Delete calendar event
router.delete('/events/:id', calendarController.deleteEvent);

// ============================================
// UNIFIED CALENDAR VIEW ROUTES
// ============================================

// GET /api/calendar/stats - Get calendar statistics
router.get('/stats', calendarController.getCalendarStats);

// GET /api/calendar/overdue-tasks - Get overdue tasks
router.get('/overdue-tasks', calendarController.getOverdueTasks);

// GET /api/calendar/upcoming-tasks - Get upcoming tasks
router.get('/upcoming-tasks', calendarController.getUpcomingTasks);

// GET /api/calendar/events/filter - Search/filter events
router.get('/events/filter', calendarController.filterEvents);

// GET /api/calendar/range - Get calendar items for date range
router.get('/range', calendarController.getCalendarByRange);

// GET /api/calendar/day/:date - Get all calendar items for specific date (alias)
router.get('/day/:date', calendarController.getCalendarByDate);

// GET /api/calendar/:date - Get all calendar items for specific date
router.get('/:date', calendarController.getCalendarByDate);

module.exports = router;
