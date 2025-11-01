import React from 'react';
import { CalendarEvent, Problem } from '../../types/calendar';
import { formatTimeForDisplay } from '../../utils/dateUtils';

interface CalendarCellTooltipProps {
  date: Date;
  events: CalendarEvent[];
  solvedProblems: Problem[];
  isVisible: boolean;
  position: { x: number; y: number };
}

const CalendarCellTooltip: React.FC<CalendarCellTooltipProps> = ({
  date,
  events,
  solvedProblems,
  isVisible,
  position
}) => {
  if (!isVisible || (events.length === 0 && solvedProblems.length === 0)) {
    return null;
  }

  const tasks = events.filter(e => e.event_type === 'task');
  const notes = events.filter(e => e.event_type === 'note');
  const calendarEvents = events.filter(e => e.event_type === 'reminder');
  const practiceSessions = events.filter(e => e.event_type === 'practice_session');

  const tooltipStyle: React.CSSProperties = {
    position: 'fixed',
    left: position.x,
    top: position.y,
    zIndex: 1000,
    transform: 'translate(-50%, -100%)',
    marginTop: '-8px'
  };

  return (
    <div className="calendar-cell-tooltip" style={tooltipStyle}>
      <div className="tooltip-content">
        <div className="tooltip-header">
          <strong>{date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric' 
          })}</strong>
        </div>
        
        {solvedProblems.length > 0 && (
          <div className="tooltip-section">
            <div className="tooltip-section-title">
              Solved Problems ({solvedProblems.length})
            </div>
            <div className="tooltip-items">
              {solvedProblems.slice(0, 3).map(problem => (
                <div key={problem.id} className="tooltip-item problem-item">
                  <span className={`difficulty-dot ${problem.difficulty.toLowerCase()}`}></span>
                  <span className="item-title">{problem.title}</span>
                </div>
              ))}
              {solvedProblems.length > 3 && (
                <div className="tooltip-item more-items">
                  +{solvedProblems.length - 3} more problems
                </div>
              )}
            </div>
          </div>
        )}
        
        {tasks.length > 0 && (
          <div className="tooltip-section">
            <div className="tooltip-section-title">
              Tasks ({tasks.length})
            </div>
            <div className="tooltip-items">
              {tasks.slice(0, 3).map(task => (
                <div key={task.id} className={`tooltip-item task-item ${task.status}`}>
                  <span className="status-dot"></span>
                  <span className="item-title">{task.title}</span>
                  {task.priority && task.priority !== 'medium' && (
                    <span className={`priority-badge ${task.priority}`}>
                      {task.priority}
                    </span>
                  )}
                </div>
              ))}
              {tasks.length > 3 && (
                <div className="tooltip-item more-items">
                  +{tasks.length - 3} more tasks
                </div>
              )}
            </div>
          </div>
        )}
        
        {calendarEvents.length > 0 && (
          <div className="tooltip-section">
            <div className="tooltip-section-title">
              Events ({calendarEvents.length})
            </div>
            <div className="tooltip-items">
              {calendarEvents.slice(0, 3).map(event => (
                <div key={event.id} className="tooltip-item event-item">
                  <span className="event-dot"></span>
                  <span className="item-title">{event.title}</span>
                  {event.start_time && (
                    <span className="event-time">
                      {formatTimeForDisplay(event.start_time)}
                    </span>
                  )}
                </div>
              ))}
              {calendarEvents.length > 3 && (
                <div className="tooltip-item more-items">
                  +{calendarEvents.length - 3} more events
                </div>
              )}
            </div>
          </div>
        )}
        
        {notes.length > 0 && (
          <div className="tooltip-section">
            <div className="tooltip-section-title">
              Notes ({notes.length})
            </div>
            <div className="tooltip-items">
              {notes.slice(0, 2).map(note => (
                <div key={note.id} className="tooltip-item note-item">
                  <span className="note-dot"></span>
                  <span className="item-title">{note.title || 'Untitled Note'}</span>
                </div>
              ))}
              {notes.length > 2 && (
                <div className="tooltip-item more-items">
                  +{notes.length - 2} more notes
                </div>
              )}
            </div>
          </div>
        )}
        
        {practiceSessions.length > 0 && (
          <div className="tooltip-section">
            <div className="tooltip-section-title">
              Practice Sessions ({practiceSessions.length})
            </div>
            <div className="tooltip-items">
              {practiceSessions.slice(0, 2).map(session => (
                <div key={session.id} className="tooltip-item session-item">
                  <span className="session-dot"></span>
                  <span className="item-title">{session.title}</span>
                  {session.time_spent && (
                    <span className="session-time">
                      {Math.round(session.time_spent)}m
                    </span>
                  )}
                </div>
              ))}
              {practiceSessions.length > 2 && (
                <div className="tooltip-item more-items">
                  +{practiceSessions.length - 2} more sessions
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      <div className="tooltip-arrow"></div>
    </div>
  );
};

export default CalendarCellTooltip;