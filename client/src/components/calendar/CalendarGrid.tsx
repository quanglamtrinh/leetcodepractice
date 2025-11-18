import React from 'react';
import CalendarCell from './CalendarCell';
import CalendarWeekView from './CalendarWeekView';
import CalendarDayView from './CalendarDayView';
import { CalendarEvent, Problem, CalendarView } from '../../types/calendar';
import { 
  getMonthCalendarDates, 
  getWeekDates, 
  getStartOfWeek,
  formatDateForDisplay 
} from '../../utils/dateUtils';

interface CalendarGridProps {
  currentDate: Date;
  selectedDate?: Date;
  view: CalendarView;
  events: CalendarEvent[];
  problems: Problem[];
  onDateSelect: (date: Date) => void;
  onViewChange?: (view: CalendarView) => void;
  onDateChange?: (date: Date) => void;
}

const CalendarGrid: React.FC<CalendarGridProps> = React.memo(({
  currentDate,
  selectedDate,
  view,
  events,
  problems,
  onDateSelect,
  onViewChange,
  onDateChange
}) => {
  const [isTransitioning, setIsTransitioning] = React.useState(false);
  const [previousView, setPreviousView] = React.useState<CalendarView>(view);

  // Handle view transitions
  React.useEffect(() => {
    if (view !== previousView) {
      setIsTransitioning(true);
      const timer = setTimeout(() => {
        setIsTransitioning(false);
        setPreviousView(view);
      }, 300); // Match CSS transition duration
      
      return () => clearTimeout(timer);
    }
  }, [view, previousView]);
  // Get dates to display based on view
  const getDatesToDisplay = (): Date[] => {
    switch (view) {
      case 'month':
        return getMonthCalendarDates(currentDate);
      case 'week':
        return getWeekDates(getStartOfWeek(currentDate));
      case 'day':
        return [currentDate];
      default:
        return getMonthCalendarDates(currentDate);
    }
  };

  const dates = getDatesToDisplay();
  
  // Group events and problems by date
  const getEventsForDate = (date: Date): CalendarEvent[] => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(event => event.date === dateStr);
  };

  const getProblemsForDate = (date: Date): Problem[] => {
    const dateStr = date.toISOString().split('T')[0];
    return problems.filter(problem => 
      problem.solved && problem.solved_date === dateStr
    );
  };

  // Week day headers
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const renderMonthView = () => (
    <div className="calendar-grid month-view">
      {/* Week day headers */}
      <div className="calendar-week-header">
        {weekDays.map(day => (
          <div key={day} className="calendar-day-header">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar cells */}
      <div className="calendar-cells">
        {dates.map(date => (
          <CalendarCell
            key={date.toISOString()}
            date={date}
            currentMonth={currentDate}
            selectedDate={selectedDate}
            events={getEventsForDate(date)}
            solvedProblems={getProblemsForDate(date)}
            onClick={onDateSelect}
          />
        ))}
      </div>
    </div>
  );

  const renderWeekView = () => (
    <CalendarWeekView
      currentDate={currentDate}
      selectedDate={selectedDate}
      events={events}
      problems={problems}
      onDateSelect={onDateSelect}
    />
  );

  const renderDayView = () => (
    <CalendarDayView
      currentDate={currentDate}
      selectedDate={selectedDate}
      events={events}
      problems={problems}
      onDateSelect={onDateSelect}
      onDateChange={onDateChange}
    />
  );

  const renderGrid = () => {
    switch (view) {
      case 'month':
        return renderMonthView();
      case 'week':
        return renderWeekView();
      case 'day':
        return renderDayView();
      default:
        return renderMonthView();
    }
  };

  return (
    <div className={`calendar-grid-container ${isTransitioning ? 'transitioning' : ''}`}>
      <div className={`calendar-view-wrapper view-${view}`}>
        {renderGrid()}
      </div>
      
      {/* Loading overlay during transitions */}
      {isTransitioning && (
        <div className="view-transition-overlay">
          <div className="transition-spinner"></div>
        </div>
      )}
    </div>
  );
});

CalendarGrid.displayName = 'CalendarGrid';

export default CalendarGrid;