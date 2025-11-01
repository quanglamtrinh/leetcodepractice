import React, { useMemo } from 'react';
import { CalendarEvent, Problem } from '../../types/calendar';
import { 
  formatDateForDisplay,
  formatTimeForDisplay,
  isToday,
  getNextDay,
  getPreviousDay
} from '../../utils/dateUtils';

interface CalendarDayViewProps {
  currentDate: Date;
  selectedDate?: Date;
  events: CalendarEvent[];
  problems: Problem[];
  onDateSelect: (date: Date) => void;
  onDateChange?: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
}

const CalendarDayView: React.FC<CalendarDayViewProps> = React.memo(({
  currentDate,
  selectedDate,
  events,
  problems,
  onDateSelect,
  onDateChange,
  onEventClick
}) => {
  // Generate hourly time slots (24 hours)
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 0; hour < 24; hour++) {
      slots.push({
        hour,
        time: `${hour.toString().padStart(2, '0')}:00`,
        displayTime: hour === 0 ? '12:00 AM' : 
                   hour < 12 ? `${hour}:00 AM` : 
                   hour === 12 ? '12:00 PM' : 
                   `${hour - 12}:00 PM`,
        shortTime: hour === 0 ? '12a' : 
                  hour < 12 ? `${hour}a` : 
                  hour === 12 ? '12p' : 
                  `${hour - 12}p`
      });
    }
    return slots;
  }, []);

  // Get current time for highlighting current hour
  const currentHour = useMemo(() => {
    if (isToday(currentDate)) {
      return new Date().getHours();
    }
    return -1;
  }, [currentDate]);

  // Group events and problems by hour
  const getEventsForHour = (hour: number): CalendarEvent[] => {
    const dateStr = currentDate.toISOString().split('T')[0];
    return events.filter(event => {
      if (event.date !== dateStr) return false;
      
      if (event.start_time) {
        const eventHour = parseInt(event.start_time.split(':')[0]);
        return eventHour === hour;
      }
      
      // Events without specific time show in the first hour (00:00)
      return hour === 0;
    });
  };

  const getProblemsForDate = (): Problem[] => {
    const dateStr = currentDate.toISOString().split('T')[0];
    return problems.filter(problem => 
      problem.solved && problem.solved_date === dateStr
    );
  };

  const getAllDayEvents = (): CalendarEvent[] => {
    const dateStr = currentDate.toISOString().split('T')[0];
    return events.filter(event => 
      event.date === dateStr && !event.start_time
    );
  };

  const handlePreviousDay = () => {
    const prevDay = getPreviousDay(currentDate);
    if (onDateChange) {
      onDateChange(prevDay);
    }
  };

  const handleNextDay = () => {
    const nextDay = getNextDay(currentDate);
    if (onDateChange) {
      onDateChange(nextDay);
    }
  };

  const handleHourClick = (hour: number) => {
    // Could be used to create events at specific times
    console.log(`Clicked hour: ${hour}`);
  };

  const handleEventClick = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEventClick) {
      onEventClick(event);
    }
  };

  const renderEventItem = (event: CalendarEvent) => {
    const getEventIcon = (type: string) => {
      switch (type) {
        case 'task': return '📋';
        case 'note': return '📝';
        case 'reminder': return '📅';
        case 'practice_session': return '💻';
        default: return '📅';
      }
    };

    const getEventClass = (event: CalendarEvent) => {
      let className = `day-event ${event.event_type}`;
      if (event.status) {
        className += ` ${event.status}`;
      }
      if (event.priority) {
        className += ` priority-${event.priority}`;
      }
      return className;
    };

    const getDuration = (event: CalendarEvent) => {
      if (event.start_time && event.end_time) {
        const start = new Date(`2000-01-01T${event.start_time}`);
        const end = new Date(`2000-01-01T${event.end_time}`);
        const diffMs = end.getTime() - start.getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));
        
        if (diffMins < 60) {
          return `${diffMins}m`;
        } else {
          const hours = Math.floor(diffMins / 60);
          const mins = diffMins % 60;
          return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
        }
      }
      return null;
    };

    return (
      <div
        key={event.id}
        className={getEventClass(event)}
        onClick={(e) => handleEventClick(event, e)}
        title={`${event.title}${event.description ? ` - ${event.description}` : ''}`}
      >
        <div className="event-header">
          <span className="event-icon">{getEventIcon(event.event_type)}</span>
          <span className="event-title">{event.title}</span>
          {event.priority === 'high' && (
            <span className="priority-indicator">!</span>
          )}
        </div>
        
        {event.description && (
          <div className="event-description">{event.description}</div>
        )}
        
        <div className="event-meta">
          {event.start_time && event.end_time && (
            <span className="event-time">
              {formatTimeForDisplay(event.start_time)} - {formatTimeForDisplay(event.end_time)}
            </span>
          )}
          {getDuration(event) && (
            <span className="event-duration">({getDuration(event)})</span>
          )}
        </div>
      </div>
    );
  };

  const renderProblemItem = (problem: Problem) => {
    const getDifficultyClass = (difficulty: string) => {
      return `problem-badge ${difficulty.toLowerCase()}`;
    };

    return (
      <div
        key={problem.id}
        className="day-problem"
        title={`${problem.title} - ${problem.difficulty} - ${problem.concept}`}
      >
        <span className={getDifficultyClass(problem.difficulty)}>
          {problem.difficulty}
        </span>
        <div className="problem-info">
          <div className="problem-title">{problem.title}</div>
          <div className="problem-concept">{problem.concept}</div>
        </div>
      </div>
    );
  };

  const dayProblems = getProblemsForDate();
  const allDayEvents = getAllDayEvents();
  const isTodayDate = isToday(currentDate);

  return (
    <div className="calendar-day-view">
      {/* Day Header */}
      <div className="day-view-header">
        <div className="day-navigation">
          <button 
            className="nav-button prev"
            onClick={handlePreviousDay}
            title="Previous day"
            aria-label="Previous day"
          >
            ←
          </button>
          
          <div className="day-title">
            <h2>{formatDateForDisplay(currentDate)}</h2>
            {isTodayDate && <span className="today-badge">Today</span>}
          </div>
          
          <button 
            className="nav-button next"
            onClick={handleNextDay}
            title="Next day"
            aria-label="Next day"
          >
            →
          </button>
        </div>
      </div>

      {/* All-day Section */}
      {(dayProblems.length > 0 || allDayEvents.length > 0) && (
        <div className="all-day-section">
          <div className="all-day-header">
            <span className="all-day-label">All Day</span>
          </div>
          
          <div className="all-day-content">
            {/* Solved Problems */}
            {dayProblems.length > 0 && (
              <div className="problems-section">
                <div className="section-title">
                  Solved Problems ({dayProblems.length})
                </div>
                <div className="problems-grid">
                  {dayProblems.map(problem => renderProblemItem(problem))}
                </div>
              </div>
            )}
            
            {/* All-day Events */}
            {allDayEvents.length > 0 && (
              <div className="all-day-events">
                {allDayEvents.map(event => renderEventItem(event))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Time Grid */}
      <div className="day-time-grid">
        {timeSlots.map(slot => {
          const hourEvents = getEventsForHour(slot.hour);
          const isCurrentHour = slot.hour === currentHour;
          
          return (
            <div 
              key={slot.hour} 
              className={`time-slot ${isCurrentHour ? 'current-hour' : ''}`}
            >
              {/* Time Label */}
              <div className="time-label">
                <span className="time-text">{slot.displayTime}</span>
                <span className="time-short">{slot.shortTime}</span>
              </div>
              
              {/* Hour Content */}
              <div 
                className="hour-content"
                onClick={() => handleHourClick(slot.hour)}
              >
                {hourEvents.map(event => renderEventItem(event))}
                
                {/* Current time indicator */}
                {isCurrentHour && (
                  <div 
                    className="current-time-line"
                    style={{
                      top: `${(new Date().getMinutes() / 60) * 100}%`
                    }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

CalendarDayView.displayName = 'CalendarDayView';

export default CalendarDayView;