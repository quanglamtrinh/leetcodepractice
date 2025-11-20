const pool = require('../config/database');

// ============================================
// CALENDAR NOTES ENDPOINTS
// ============================================

// Get day notes content (legacy endpoint for backward compatibility)
// Returns a single note content string for the date
exports.getDayNotesContent = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { date } = req.params;
    
    const result = await pool.query(`
      SELECT content FROM calendar_notes
      WHERE user_id = $1 AND note_date = $2
      ORDER BY created_at DESC
      LIMIT 1
    `, [userId, date]);
    
    const notes = result.rows.length > 0 ? result.rows[0].content : '';
    res.json({ notes });
  } catch (err) {
    console.error('Error fetching day notes content:', err);
    res.status(500).json({ error: 'Failed to fetch day notes content' });
  }
};

// Update day notes content (legacy endpoint for backward compatibility)
// Creates or updates a single note for the date
exports.updateDayNotesContent = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { date } = req.params;
    const { notes } = req.body;
    
    if (notes === undefined) {
      return res.status(400).json({ error: 'notes field is required' });
    }
    
    // Check if note exists for this date
    const existingNote = await pool.query(`
      SELECT id FROM calendar_notes
      WHERE user_id = $1 AND note_date = $2
      ORDER BY created_at DESC
      LIMIT 1
    `, [userId, date]);
    
    let result;
    if (existingNote.rows.length > 0) {
      // Update existing note
      result = await pool.query(`
        UPDATE calendar_notes
        SET content = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2 AND user_id = $3
        RETURNING *
      `, [notes, existingNote.rows[0].id, userId]);
    } else {
      // Create new note
      result = await pool.query(`
        INSERT INTO calendar_notes (user_id, note_date, content)
        VALUES ($1, $2, $3)
        RETURNING *
      `, [userId, date, notes]);
    }
    
    res.json({ notes: result.rows[0].content });
  } catch (err) {
    console.error('Error updating day notes content:', err);
    res.status(500).json({ error: 'Failed to update day notes content' });
  }
};

// Create calendar note for specific date
exports.createNote = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { note_date, content } = req.body;
    
    if (!note_date || !content) {
      return res.status(400).json({ error: 'note_date and content are required' });
    }
    
    const result = await pool.query(`
      INSERT INTO calendar_notes (user_id, note_date, content)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [userId, note_date, content]);
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating calendar note:', err);
    res.status(500).json({ error: 'Failed to create calendar note' });
  }
};

// Get user's notes for specific date
exports.getNotesByDate = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { date } = req.params;
    
    const result = await pool.query(`
      SELECT * FROM calendar_notes
      WHERE user_id = $1 AND note_date = $2
      ORDER BY created_at DESC
    `, [userId, date]);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching calendar notes:', err);
    res.status(500).json({ error: 'Failed to fetch calendar notes' });
  }
};

// Update calendar note
exports.updateNote = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { content, note_date } = req.body;
    
    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (content !== undefined) {
      updates.push(`content = $${paramCount}`);
      values.push(content);
      paramCount++;
    }
    
    if (note_date !== undefined) {
      updates.push(`note_date = $${paramCount}`);
      values.push(note_date);
      paramCount++;
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(userId, id);
    
    const result = await pool.query(`
      UPDATE calendar_notes
      SET ${updates.join(', ')}
      WHERE user_id = $${paramCount} AND id = $${paramCount + 1}
      RETURNING *
    `, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found or access denied' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating calendar note:', err);
    res.status(500).json({ error: 'Failed to update calendar note' });
  }
};

// Delete calendar note
exports.deleteNote = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    
    const result = await pool.query(`
      DELETE FROM calendar_notes
      WHERE user_id = $1 AND id = $2
      RETURNING id
    `, [userId, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found or access denied' });
    }
    
    res.json({ message: 'Note deleted successfully', id: result.rows[0].id });
  } catch (err) {
    console.error('Error deleting calendar note:', err);
    res.status(500).json({ error: 'Failed to delete calendar note' });
  }
};

// ============================================
// CALENDAR TASKS ENDPOINTS
// ============================================

// Create calendar task for specific date
exports.createTask = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { task_date, title, description } = req.body;
    
    if (!task_date || !title) {
      return res.status(400).json({ error: 'task_date and title are required' });
    }
    
    const result = await pool.query(`
      INSERT INTO calendar_tasks (user_id, task_date, title, description)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [userId, task_date, title, description || null]);
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating calendar task:', err);
    res.status(500).json({ error: 'Failed to create calendar task' });
  }
};

// Get user's tasks for specific date
exports.getTasksByDate = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { date } = req.params;
    
    const result = await pool.query(`
      SELECT * FROM calendar_tasks
      WHERE user_id = $1 AND task_date = $2
      ORDER BY created_at ASC
    `, [userId, date]);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching calendar tasks:', err);
    res.status(500).json({ error: 'Failed to fetch calendar tasks' });
  }
};

// Update calendar task
exports.updateTask = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { title, description, task_date, completed } = req.body;
    
    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (title !== undefined) {
      updates.push(`title = $${paramCount}`);
      values.push(title);
      paramCount++;
    }
    
    if (description !== undefined) {
      updates.push(`description = $${paramCount}`);
      values.push(description);
      paramCount++;
    }
    
    if (task_date !== undefined) {
      updates.push(`task_date = $${paramCount}`);
      values.push(task_date);
      paramCount++;
    }
    
    if (completed !== undefined) {
      updates.push(`completed = $${paramCount}`);
      values.push(completed);
      paramCount++;
      
      if (completed) {
        updates.push(`completed_at = CURRENT_TIMESTAMP`);
      } else {
        updates.push(`completed_at = NULL`);
      }
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(userId, id);
    
    const result = await pool.query(`
      UPDATE calendar_tasks
      SET ${updates.join(', ')}
      WHERE user_id = $${paramCount} AND id = $${paramCount + 1}
      RETURNING *
    `, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found or access denied' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating calendar task:', err);
    res.status(500).json({ error: 'Failed to update calendar task' });
  }
};

// Mark task as complete
exports.completeTask = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    
    const result = await pool.query(`
      UPDATE calendar_tasks
      SET completed = true,
          completed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND id = $2
      RETURNING *
    `, [userId, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found or access denied' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error completing calendar task:', err);
    res.status(500).json({ error: 'Failed to complete calendar task' });
  }
};

// Delete calendar task
exports.deleteTask = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    
    const result = await pool.query(`
      DELETE FROM calendar_tasks
      WHERE user_id = $1 AND id = $2
      RETURNING id
    `, [userId, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found or access denied' });
    }
    
    res.json({ message: 'Task deleted successfully', id: result.rows[0].id });
  } catch (err) {
    console.error('Error deleting calendar task:', err);
    res.status(500).json({ error: 'Failed to delete calendar task' });
  }
};

// ============================================
// CALENDAR EVENTS ENDPOINTS
// ============================================

// Create calendar event with time validation
exports.createEvent = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { event_date, title, description, start_time, end_time } = req.body;
    
    console.log('📅 Create event request:', { event_date, title, start_time, end_time, body: req.body });
    
    if (!event_date || !title) {
      console.log('❌ Missing required fields:', { event_date, title });
      return res.status(400).json({ 
        error: 'event_date and title are required' 
      });
    }
    
    // Validate that end_time > start_time (only if both are provided)
    if (start_time && end_time && end_time <= start_time) {
      return res.status(400).json({ 
        error: 'end_time must be after start_time' 
      });
    }
    
    const result = await pool.query(`
      INSERT INTO calendar_events (user_id, event_date, title, description, start_time, end_time)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [userId, event_date, title, description || null, start_time || null, end_time || null]);
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating calendar event:', err);
    
    // Handle CHECK constraint violation
    if (err.message && err.message.includes('end_time > start_time')) {
      return res.status(400).json({ error: 'end_time must be after start_time' });
    }
    
    res.status(500).json({ error: 'Failed to create calendar event' });
  }
};

// Get user's events (with optional date range query params)
exports.getEvents = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { start_date, end_date, event_types } = req.query;
    
    let query = `SELECT * FROM calendar_events WHERE user_id = $1`;
    const params = [userId];
    let paramCount = 1;
    
    if (start_date && end_date) {
      paramCount++;
      query += ` AND event_date BETWEEN $${paramCount}`;
      params.push(start_date);
      paramCount++;
      query += ` AND $${paramCount}`;
      params.push(end_date);
    }
    
    query += ` ORDER BY event_date ASC, start_time ASC`;
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching calendar events:', err);
    res.status(500).json({ error: 'Failed to fetch calendar events' });
  }
};

// Get user's events for specific date
exports.getEventsByDate = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { date } = req.params;
    
    const result = await pool.query(`
      SELECT * FROM calendar_events
      WHERE user_id = $1 AND event_date = $2
      ORDER BY start_time ASC
    `, [userId, date]);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching calendar events:', err);
    res.status(500).json({ error: 'Failed to fetch calendar events' });
  }
};

// Update calendar event
exports.updateEvent = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { title, description, event_date, start_time, end_time } = req.body;
    
    // If both times are provided, validate them
    if (start_time !== undefined && end_time !== undefined && end_time <= start_time) {
      return res.status(400).json({ error: 'end_time must be after start_time' });
    }
    
    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (title !== undefined) {
      updates.push(`title = $${paramCount}`);
      values.push(title);
      paramCount++;
    }
    
    if (description !== undefined) {
      updates.push(`description = $${paramCount}`);
      values.push(description);
      paramCount++;
    }
    
    if (event_date !== undefined) {
      updates.push(`event_date = $${paramCount}`);
      values.push(event_date);
      paramCount++;
    }
    
    if (start_time !== undefined) {
      updates.push(`start_time = $${paramCount}`);
      values.push(start_time);
      paramCount++;
    }
    
    if (end_time !== undefined) {
      updates.push(`end_time = $${paramCount}`);
      values.push(end_time);
      paramCount++;
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(userId, id);
    
    const result = await pool.query(`
      UPDATE calendar_events
      SET ${updates.join(', ')}
      WHERE user_id = $${paramCount} AND id = $${paramCount + 1}
      RETURNING *
    `, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found or access denied' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating calendar event:', err);
    
    // Handle CHECK constraint violation
    if (err.message && err.message.includes('end_time > start_time')) {
      return res.status(400).json({ error: 'end_time must be after start_time' });
    }
    
    res.status(500).json({ error: 'Failed to update calendar event' });
  }
};

// Delete calendar event
exports.deleteEvent = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    
    const result = await pool.query(`
      DELETE FROM calendar_events
      WHERE user_id = $1 AND id = $2
      RETURNING id
    `, [userId, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found or access denied' });
    }
    
    res.json({ message: 'Event deleted successfully', id: result.rows[0].id });
  } catch (err) {
    console.error('Error deleting calendar event:', err);
    res.status(500).json({ error: 'Failed to delete calendar event' });
  }
};

// ============================================
// UNIFIED CALENDAR VIEW ENDPOINTS
// ============================================

// Get all calendar items for a specific date
exports.getCalendarByDate = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { date } = req.params;
    
    // Fetch notes
    const notesResult = await pool.query(`
      SELECT * FROM calendar_notes
      WHERE user_id = $1 AND note_date = $2
      ORDER BY created_at DESC
    `, [userId, date]);
    
    // Fetch tasks
    const tasksResult = await pool.query(`
      SELECT * FROM calendar_tasks
      WHERE user_id = $1 AND task_date = $2
      ORDER BY created_at ASC
    `, [userId, date]);
    
    // Fetch events
    const eventsResult = await pool.query(`
      SELECT * FROM calendar_events
      WHERE user_id = $1 AND event_date = $2
      ORDER BY start_time ASC
    `, [userId, date]);
    
    res.json({
      date,
      notes: notesResult.rows,
      tasks: tasksResult.rows,
      events: eventsResult.rows
    });
  } catch (err) {
    console.error('Error fetching calendar data:', err);
    res.status(500).json({ error: 'Failed to fetch calendar data' });
  }
};

// Get calendar items for a date range
exports.getCalendarByRange = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { start_date, end_date } = req.query;
    
    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'start_date and end_date are required' });
    }
    
    // Fetch notes
    const notesResult = await pool.query(`
      SELECT * FROM calendar_notes
      WHERE user_id = $1 AND note_date BETWEEN $2 AND $3
      ORDER BY note_date DESC, created_at DESC
    `, [userId, start_date, end_date]);
    
    // Fetch tasks
    const tasksResult = await pool.query(`
      SELECT * FROM calendar_tasks
      WHERE user_id = $1 AND task_date BETWEEN $2 AND $3
      ORDER BY task_date ASC, created_at ASC
    `, [userId, start_date, end_date]);
    
    // Fetch events
    const eventsResult = await pool.query(`
      SELECT * FROM calendar_events
      WHERE user_id = $1 AND event_date BETWEEN $2 AND $3
      ORDER BY event_date ASC, start_time ASC
    `, [userId, start_date, end_date]);
    
    res.json({
      start_date,
      end_date,
      notes: notesResult.rows,
      tasks: tasksResult.rows,
      events: eventsResult.rows
    });
  } catch (err) {
    console.error('Error fetching calendar range data:', err);
    res.status(500).json({ error: 'Failed to fetch calendar range data' });
  }
};

// ============================================
// ADDITIONAL CALENDAR ENDPOINTS
// ============================================

// Get calendar stats for a date range
exports.getCalendarStats = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { start_date, end_date } = req.query;
    
    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'start_date and end_date are required' });
    }
    
    const result = await pool.query(`
      SELECT 
        COUNT(DISTINCT CASE WHEN cn.id IS NOT NULL THEN cn.note_date END) as days_with_notes,
        COUNT(ct.id) as total_tasks,
        COUNT(CASE WHEN ct.completed = true THEN 1 END) as completed_tasks,
        COUNT(ce.id) as total_events
      FROM (
        SELECT generate_series($2::date, $3::date, '1 day'::interval)::date as date
      ) dates
      LEFT JOIN calendar_notes cn ON cn.user_id = $1 AND cn.note_date = dates.date
      LEFT JOIN calendar_tasks ct ON ct.user_id = $1 AND ct.task_date = dates.date
      LEFT JOIN calendar_events ce ON ce.user_id = $1 AND ce.event_date = dates.date
    `, [userId, start_date, end_date]);
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching calendar stats:', err);
    res.status(500).json({ error: 'Failed to fetch calendar stats' });
  }
};

// Get overdue tasks
exports.getOverdueTasks = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const result = await pool.query(`
      SELECT * FROM calendar_tasks
      WHERE user_id = $1 
        AND completed = false 
        AND task_date < CURRENT_DATE
      ORDER BY task_date ASC
    `, [userId]);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching overdue tasks:', err);
    res.status(500).json({ error: 'Failed to fetch overdue tasks' });
  }
};

// Get upcoming tasks
exports.getUpcomingTasks = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { days = 7 } = req.query;
    
    const result = await pool.query(`
      SELECT * FROM calendar_tasks
      WHERE user_id = $1 
        AND completed = false 
        AND task_date BETWEEN CURRENT_DATE AND CURRENT_DATE + $2::integer
      ORDER BY task_date ASC
    `, [userId, days]);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching upcoming tasks:', err);
    res.status(500).json({ error: 'Failed to fetch upcoming tasks' });
  }
};

// Search/filter events
exports.filterEvents = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { search, start_date, end_date, event_types } = req.query;
    
    let query = `
      SELECT * FROM calendar_events
      WHERE user_id = $1
    `;
    const params = [userId];
    let paramCount = 1;
    
    if (search) {
      paramCount++;
      query += ` AND (title ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }
    
    if (start_date && end_date) {
      paramCount++;
      query += ` AND event_date BETWEEN $${paramCount}`;
      params.push(start_date);
      paramCount++;
      query += ` AND $${paramCount}`;
      params.push(end_date);
    }
    
    query += ` ORDER BY event_date ASC, start_time ASC`;
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error filtering events:', err);
    res.status(500).json({ error: 'Failed to filter events' });
  }
};
