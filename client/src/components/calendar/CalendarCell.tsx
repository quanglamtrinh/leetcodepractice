import React, { useState, useRef } from 'react';
import { CalendarEvent, Problem } from '../../types/calendar';
import { 
  isToday, 
  isSameDay, 
  isCurrentMonth,
  isPastDate 
} from '../../utils/dateUtils';
import CalendarCellTooltip from './CalendarCellTooltip';

interface CalendarCellProps {
  date: Date;
  currentMonth: Date;
  selectedDate?: Date;
  events: CalendarEvent[];
  solvedProblems: Problem[];
  onClick: (date: Date) => void;
  className?: string;
}

const CalendarCell: React.FC<CalendarCellProps> = ({
  date,
  currentMonth,
  selectedDate,
  events,
  solvedProblems,
  onClick,
  className = ''
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const cellRef = useRef<HTMLDivElement>(null);
  const isCurrentMonthDate = isCurrentMonth(date, currentMonth);
  const isTodayDate = isToday(date);
  const isSelected = selectedDate && isSameDay(date, selectedDate);
  const isPast = isPastDate(date);
  
  // Count different types of events
  const tasks = events.filter(e => e.event_type === 'task');
  const notes = events.filter(e => e.event_type === 'note');
  const calendarEvents = events.filter(e => e.event_type === 'reminder');
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const overdueTasks = tasks.filter(t => t.status === 'overdue');
  
  // Count problems by difficulty
  const easyProblems = solvedProblems.filter(p => p.difficulty === 'Easy');
  const mediumProblems = solvedProblems.filter(p => p.difficulty === 'Medium');
  const hardProblems = solvedProblems.filter(p => p.difficulty === 'Hard');
  
  const hasEvents = events.length > 0 || solvedProblems.length > 0;

  const cellClasses = [
    'calendar-cell',
    className,
    !isCurrentMonthDate && 'other-month',
    isTodayDate && 'today',
    isSelected && 'selected',
    hasEvents && 'has-events',
    overdueTasks.length > 0 && 'has-overdue',
    solvedProblems.length > 0 && 'has-problems',
    isPast && 'past-date'
  ].filter(Boolean).join(' ');

  const handleClick = () => {
    onClick(date);
  };

  const handleMouseEnter = () => {
    if (hasEvents && cellRef.current) {
      const rect = cellRef.current.getBoundingClientRect();
      setTooltipPosition({
        x: rect.left + rect.width / 2,
        y: rect.top
      });
      setShowTooltip(true);
    }
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  return (
    <>
      <div 
        ref={cellRef}
        className={cellClasses} 
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="calendar-cell-header">
          <span className="calendar-cell-date">
            {date.getDate()}
          </span>
          {isTodayDate && (
            <span className="today-indicator" title="Today">
              •
            </span>
          )}
        </div>
      
      <div className="calendar-cell-content">
        {/* Solved Problems Indicators */}
        {solvedProblems.length > 0 && (
          <div className="problems-indicators">
            {easyProblems.length > 0 && (
              <div className="problem-indicator easy" title={`${easyProblems.length} Easy problems`}>
                <span className="problem-count">{easyProblems.length}</span>
              </div>
            )}
            {mediumProblems.length > 0 && (
              <div className="problem-indicator medium" title={`${mediumProblems.length} Medium problems`}>
                <span className="problem-count">{mediumProblems.length}</span>
              </div>
            )}
            {hardProblems.length > 0 && (
              <div className="problem-indicator hard" title={`${hardProblems.length} Hard problems`}>
                <span className="problem-count">{hardProblems.length}</span>
              </div>
            )}
          </div>
        )}
        
        {/* Event Indicators */}
        <div className="event-indicators">
          {/* Task Indicators */}
          {pendingTasks.length > 0 && (
            <div className="event-indicator task pending" title={`${pendingTasks.length} pending tasks`}>
              <span className="indicator-icon">📋</span>
              <span className="indicator-count">{pendingTasks.length}</span>
            </div>
          )}
          
          {completedTasks.length > 0 && (
            <div className="event-indicator task completed" title={`${completedTasks.length} completed tasks`}>
              <span className="indicator-icon">✅</span>
              <span className="indicator-count">{completedTasks.length}</span>
            </div>
          )}
          
          {overdueTasks.length > 0 && (
            <div className="event-indicator task overdue" title={`${overdueTasks.length} overdue tasks`}>
              <span className="indicator-icon">⚠️</span>
              <span className="indicator-count">{overdueTasks.length}</span>
            </div>
          )}
          
          {/* Notes Indicator */}
          {notes.length > 0 && (
            <div className="event-indicator note" title={`${notes.length} notes`}>
              <span className="indicator-icon">📝</span>
              <span className="indicator-count">{notes.length}</span>
            </div>
          )}
          
          {/* Calendar Events Indicator */}
          {calendarEvents.length > 0 && (
            <div className="event-indicator event" title={`${calendarEvents.length} events`}>
              <span className="indicator-icon">📅</span>
              <span className="indicator-count">{calendarEvents.length}</span>
            </div>
          )}
        </div>
        
        {/* Summary indicator for mobile/small cells */}
        {hasEvents && (
          <div className="summary-indicator">
            <span className="summary-dot"></span>
          </div>
        )}
      </div>
      </div>
      
      <CalendarCellTooltip
        date={date}
        events={events}
        solvedProblems={solvedProblems}
        isVisible={showTooltip}
        position={tooltipPosition}
      />
    </>
  );
};

export default CalendarCell;