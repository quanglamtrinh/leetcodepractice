import React, { useMemo } from 'react';
import { CalendarEvent, Problem } from '../../types/calendar';
import { 
  getWeekDates, 
  getStartOfWeek, 
  formatDateForDisplay,
  formatDateShort,
  formatTimeForDisplay,
  isToday,
  isSameDay
} from '../../utils/dateUtils';

interface CalendarWeekViewProps {
  currentDate: Date;
  selectedDate?: Date;
  events: CalendarEvent[];
  problems: Problem[];
  onDateSelect: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
}

const CalendarWeekView: React.FC<CalendarWeekViewProps> = React.memo(({
  currentDate,
  selectedDate,
  events,
  problems,
  onDateSelect,
  onEventClick
}) => {
  // Generate time slots (24 hours)
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 0; hour < 24; hour++) {
      slots.push({
        hour,
        time: `${hour.toString().padStart(2, '0')}:00`,
        displayTime: hour === 0 ? '12:00 AM' : 
                   hour < 12 ? `${hour}:00 AM` : 
                   hour === 12 ? '12:00 PM' : 
                   `${hour - 12}:00 PM`
      });
    }
    return slots;
  }, []);

  // Get week dates
  const weekDates = useMemo(() => {
    return getWeekDates(getStartOfWeek(currentDate));
  }, [currentDate]);

  // Week day names
  const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Group events and problems by date and time
  const getEventsForDateTime = (date: Date, hour: number): CalendarEvent[] => {
    const dateStr = date.toISOString().split('T')[0];
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

  const getProblemsForDate = (date: Date): Problem[] => {
    const dateStr = date.toISOString().split('T')[0];
    return problems.filter(problem => 
      problem.solved && problem.solved_date === dateStr
    );
  };

  const getAllDayEventsForDate = (date: Date): CalendarEvent[] => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(event => 
      event.date === dateStr && !event.start_time
    );
  };

  const handleDateClick = (date: Date) => {
    onDateSelect(date);
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
        case 'solved_problem': return '🎯';
        default: return '📅';
      }
    };

    const getEventClass = (event: CalendarEvent) => {
      let className = `week-event ${event.event_type}`;
      if (event.status) {
        className += ` ${event.status}`;
      }
      if (event.priority) {
        className += ` priority-${event.priority}`;
      }
      return className;
    };

    return (
      <div
        key={event.id}
        className={getEventClass(event)}
        onClick={(e) => handleEventClick(event, e)}
        title={`${event.title}${event.description ? ` - ${event.description}` : ''}`}
      >
        <span className="event-icon">{getEventIcon(event.event_type)}</span>
        <span className="event-title">{event.title}</span>
        {event.start_time && event.end_time && (
          <span className="event-time">
            {formatTimeForDisplay(event.start_time)} - {formatTimeForDisplay(event.end_time)}
          </span>
        )}
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
        className="week-problem"
        title={`${problem.title} - ${problem.difficulty} - ${problem.concept}`}
      >
        <span className={getDifficultyClass(problem.difficulty)}>
          {problem.difficulty.charAt(0)}
        </span>
        <span className="problem-title">{problem.title}</span>
      </div>
    );
  };

  return (
    <div className="calendar-week-view">
      {/* Week Header with Dates */}
      <div className="week-header">
        <div className="time-column-header">
          <span className="week-range">
            {formatDateShort(weekDates[0])} - {formatDateShort(weekDates[6])}
          </span>
        </div>
        {weekDates.map((date, index) => {
          const dayProblems = getProblemsForDate(date);
          const allDayEvents = getAllDayEventsForDate(date);
          const isSelectedDate = selectedDate && isSameDay(date, selectedDate);
          const isTodayDate = isToday(date);
          
          return (
            <div
              key={date.toISOString()}
              className={`week-day-header ${isTodayDate ? 'today' : ''} ${isSelectedDate ? 'selected' : ''}`}
              onClick={() => handleDateClick(date)}
            >
              <div className="day-info">
                <div className="day-name">{weekDays[index]}</div>
                <div className="day-number">{date.getDate()}</div>
                {isTodayDate && <div className="today-indicator">●</div>}
              </div>
              
              {/* All-day events and problems */}
              <div className="all-day-section">
                {dayProblems.length > 0 && (
                  <div className="problems-summary">
                    <span className="problems-count">✅ {dayProblems.length}</span>
                  </div>
                )}
                
                {allDayEvents.map(event => (
                  <div key={event.id} className="all-day-event">
                    {renderEventItem(event)}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Time Grid */}
      <div className="week-time-grid">
        {timeSlots.map(slot => (
          <div key={slot.hour} className="time-row">
            {/* Time Label */}
            <div className="time-label">
              <span className="time-text">{slot.displayTime}</span>
            </div>
            
            {/* Day Columns */}
            {weekDates.map(date => {
              const hourEvents = getEventsForDateTime(date, slot.hour);
              const isSelectedDate = selectedDate && isSameDay(date, selectedDate);
              const isTodayDate = isToday(date);
              
              return (
                <div
                  key={`${date.toISOString()}-${slot.hour}`}
                  className={`time-slot ${isTodayDate ? 'today' : ''} ${isSelectedDate ? 'selected' : ''}`}
                  onClick={() => handleDateClick(date)}
                >
                  {hourEvents.map(event => renderEventItem(event))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
});

CalendarWeekView.displayName = 'CalendarWeekView';

export default CalendarWeekView;