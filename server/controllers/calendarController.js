const pool = require('../config/database');

// Get calendar events
exports.getEvents = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    let query = 'SELECT * FROM calendar_events WHERE archived = false';
    const params = [];
    
    if (start_date && end_date) {
      query += ' AND event_date BETWEEN $1 AND $2';
      params.push(start_date, end_date);
    }
    
    query += ' ORDER BY event_date DESC, created_at DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching events:', err);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
};

// Create calendar event
exports.createEvent = async (req, res) => {
  try {
    const { event_type, event_date, problem_id, title, description } = req.body;
    
    if (!event_type || !event_date) {
      return res.status(400).json({ error: 'event_type and event_date are required' });
    }
    
    const result = await pool.query(`
      INSERT INTO calendar_events (event_type, event_date, problem_id, title, description)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [event_type, event_date, problem_id || null, title || null, description || null]);
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating event:', err);
    res.status(500).json({ error: 'Failed to create event' });
  }
};

// Update calendar event
exports.updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, event_date } = req.body;
    
    const result = await pool.query(`
      UPDATE calendar_events
      SET title = COALESCE($1, title),
          description = COALESCE($2, description),
          event_date = COALESCE($3, event_date)
      WHERE id = $4
      RETURNING *
    `, [title, description, event_date, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating event:', err);
    res.status(500).json({ error: 'Failed to update event' });
  }
};

// Delete calendar event
exports.deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'UPDATE calendar_events SET archived = true WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    res.json({ message: 'Event archived successfully' });
  } catch (err) {
    console.error('Error deleting event:', err);
    res.status(500).json({ error: 'Failed to delete event' });
  }
};
