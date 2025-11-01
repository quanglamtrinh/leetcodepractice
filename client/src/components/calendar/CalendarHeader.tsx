import React, { useState, useRef, useEffect } from 'react';
import { CalendarView } from '../../types/calendar';
import { 
  formatDateForDisplay, 
  getNextPeriod, 
  getPreviousPeriod,
  isToday,
  formatDateToISO,
  getStartOfWeek,
  getEndOfWeek
} from '../../utils/dateUtils';

interface CalendarHeaderProps {
  currentDate: Date;
  view: CalendarView;
  onDateChange: (date: Date) => void;
  onViewChange: (view: CalendarView) => void;
  onTodayClick: () => void;
  onDateJump?: (date: Date) => void;
}

const CalendarHeader: React.FC<CalendarHeaderProps> = React.memo(({
  currentDate,
  view,
  onDateChange,
  onViewChange,
  onTodayClick,
  onDateJump
}) => {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateInputValue, setDateInputValue] = useState('');
  const datePickerRef = useRef<HTMLDivElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Close date picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false);
      }
    };

    if (showDatePicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDatePicker]);

  // Focus date input when picker opens
  useEffect(() => {
    if (showDatePicker && dateInputRef.current) {
      dateInputRef.current.focus();
    }
  }, [showDatePicker]);
  const handlePrevious = () => {
    const previousDate = getPreviousPeriod(view, currentDate);
    onDateChange(previousDate);
  };

  const handleNext = () => {
    const nextDate = getNextPeriod(view, currentDate);
    onDateChange(nextDate);
  };

  const getDisplayTitle = (): string => {
    switch (view) {
      case 'month':
        return currentDate.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long' 
        });
      case 'week':
        const weekStart = new Date(currentDate);
        weekStart.setDate(currentDate.getDate() - currentDate.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        
        if (weekStart.getMonth() === weekEnd.getMonth()) {
          return `${weekStart.toLocaleDateString('en-US', { 
            month: 'long', 
            day: 'numeric' 
          })} - ${weekEnd.getDate()}, ${weekStart.getFullYear()}`;
        } else {
          return `${weekStart.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
          })} - ${weekEnd.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
          })}, ${weekStart.getFullYear()}`;
        }
      case 'day':
        return formatDateForDisplay(currentDate);
      default:
        return formatDateForDisplay(currentDate);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        handlePrevious();
        break;
      case 'ArrowRight':
        event.preventDefault();
        handleNext();
        break;
      case 'Home':
        event.preventDefault();
        onTodayClick();
        break;
      case '1':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          onViewChange('day');
        }
        break;
      case '2':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          onViewChange('week');
        }
        break;
      case '3':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          onViewChange('month');
        }
        break;
    }
  };

  const isTodayVisible = (): boolean => {
    return isToday(currentDate);
  };

  const handleDatePickerToggle = () => {
    setShowDatePicker(!showDatePicker);
    if (!showDatePicker) {
      setDateInputValue(formatDateToISO(currentDate));
    }
  };

  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateInputValue(e.target.value);
  };

  const handleDateInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (dateInputValue) {
      try {
        const newDate = new Date(dateInputValue + 'T00:00:00');
        if (!isNaN(newDate.getTime())) {
          if (onDateJump) {
            onDateJump(newDate);
          } else {
            onDateChange(newDate);
          }
          setShowDatePicker(false);
        }
      } catch (error) {
        console.error('Invalid date:', error);
      }
    }
  };

  const getBreadcrumbPath = (): Array<{ label: string; onClick?: () => void }> => {
    const year = currentDate.getFullYear();
    const month = currentDate.toLocaleDateString('en-US', { month: 'long' });
    const day = currentDate.getDate();

    switch (view) {
      case 'day':
        return [
          { 
            label: year.toString(), 
            onClick: () => {
              const yearStart = new Date(year, 0, 1);
              onViewChange('month');
              onDateChange(yearStart);
            }
          },
          { 
            label: month, 
            onClick: () => {
              const monthStart = new Date(year, currentDate.getMonth(), 1);
              onViewChange('month');
              onDateChange(monthStart);
            }
          },
          { label: day.toString() }
        ];
      case 'week':
        const weekStart = getStartOfWeek(currentDate);
        const weekEnd = getEndOfWeek(currentDate);
        const weekLabel = `Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        return [
          { 
            label: year.toString(), 
            onClick: () => {
              const yearStart = new Date(year, 0, 1);
              onViewChange('month');
              onDateChange(yearStart);
            }
          },
          { 
            label: month, 
            onClick: () => {
              const monthStart = new Date(year, currentDate.getMonth(), 1);
              onViewChange('month');
              onDateChange(monthStart);
            }
          },
          { label: weekLabel }
        ];
      case 'month':
        return [
          { 
            label: year.toString(), 
            onClick: () => {
              // Could implement year view in the future
            }
          },
          { label: month }
        ];
      default:
        return [{ label: formatDateForDisplay(currentDate) }];
    }
  };

  const breadcrumbPath = getBreadcrumbPath();

  return (
    <div 
      className="calendar-header" 
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="calendar-header-left">
        <div className="calendar-navigation">
          <button 
            className="nav-button prev-button"
            onClick={handlePrevious}
            title={`Previous ${view}`}
            aria-label={`Go to previous ${view}`}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M10.5 3.5L6 8l4.5 4.5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          
          <button 
            className="nav-button next-button"
            onClick={handleNext}
            title={`Next ${view}`}
            aria-label={`Go to next ${view}`}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M5.5 3.5L10 8l-4.5 4.5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        
        <div className="calendar-title-section">
          <div className="calendar-title">
            <h1 
              className="title-clickable"
              onClick={handleDatePickerToggle}
              title="Click to jump to specific date"
            >
              {getDisplayTitle()}
            </h1>
          </div>
          
          {/* Breadcrumb Navigation */}
          <nav className="breadcrumb-nav" aria-label="Calendar navigation breadcrumb">
            <ol className="breadcrumb-list">
              {breadcrumbPath.map((crumb, index) => (
                <li key={index} className="breadcrumb-item">
                  {crumb.onClick ? (
                    <button 
                      className="breadcrumb-link"
                      onClick={crumb.onClick}
                      title={`Navigate to ${crumb.label}`}
                    >
                      {crumb.label}
                    </button>
                  ) : (
                    <span className="breadcrumb-current">{crumb.label}</span>
                  )}
                  {index < breadcrumbPath.length - 1 && (
                    <span className="breadcrumb-separator" aria-hidden="true">›</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        </div>
      </div>
      
      <div className="calendar-header-center">
        <button 
          className={`today-button ${isTodayVisible() ? 'active' : ''}`}
          onClick={onTodayClick}
          title="Go to today (Home key)"
          aria-label="Go to today"
        >
          Today
        </button>
        
        {/* Date Picker */}
        <div className="date-picker-container" ref={datePickerRef}>
          <button 
            className="date-picker-toggle"
            onClick={handleDatePickerToggle}
            title="Jump to specific date"
            aria-label="Open date picker"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3.5 0v1h9V0h1v1H15v14H1V1h1.5V0h1zM2 2v12h12V2H2zm2 2h1v1H4V4zm2 0h1v1H6V4zm2 0h1v1H8V4zm2 0h1v1h-1V4zm2 0h1v1h-1V4zM4 6h1v1H4V6zm2 0h1v1H6V6zm2 0h1v1H8V6zm2 0h1v1h-1V6zm2 0h1v1h-1V6zM4 8h1v1H4V8zm2 0h1v1H6V8zm2 0h1v1H8V8zm2 0h1v1h-1V8zm2 0h1v1h-1V8zM4 10h1v1H4v-1zm2 0h1v1H6v-1zm2 0h1v1H8v-1zm2 0h1v1h-1v-1zm2 0h1v1h-1v-1z"/>
            </svg>
          </button>
          
          {showDatePicker && (
            <div className="date-picker-dropdown">
              <form onSubmit={handleDateInputSubmit} className="date-picker-form">
                <label htmlFor="date-input" className="date-picker-label">
                  Jump to date:
                </label>
                <input
                  ref={dateInputRef}
                  id="date-input"
                  type="date"
                  value={dateInputValue}
                  onChange={handleDateInputChange}
                  className="date-picker-input"
                  aria-label="Select date to navigate to"
                />
                <div className="date-picker-actions">
                  <button 
                    type="submit" 
                    className="date-picker-go"
                    disabled={!dateInputValue}
                  >
                    Go
                  </button>
                  <button 
                    type="button" 
                    className="date-picker-cancel"
                    onClick={() => setShowDatePicker(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
      
      <div className="calendar-header-right">
        <div className="view-selector">
          <button 
            className={`view-button ${view === 'day' ? 'active' : ''}`}
            onClick={() => onViewChange('day')}
            title="Day view (Ctrl+1)"
            aria-label="Switch to day view"
          >
            Day
          </button>
          <button 
            className={`view-button ${view === 'week' ? 'active' : ''}`}
            onClick={() => onViewChange('week')}
            title="Week view (Ctrl+2)"
            aria-label="Switch to week view"
          >
            Week
          </button>
          <button 
            className={`view-button ${view === 'month' ? 'active' : ''}`}
            onClick={() => onViewChange('month')}
            title="Month view (Ctrl+3)"
            aria-label="Switch to month view"
          >
            Month
          </button>
        </div>
      </div>
      
      {/* Enhanced Keyboard shortcuts help */}
      <div className="keyboard-shortcuts-container">
        <button 
          className="keyboard-shortcuts-hint" 
          title="View keyboard shortcuts"
          aria-label="View keyboard shortcuts"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M14 5H2V3h12v2zM2 7h12v2H2V7zm0 4h12v2H2v-2z"/>
          </svg>
        </button>
        
        <div className="shortcuts-tooltip">
          <div className="shortcuts-content">
            <h4>Keyboard Shortcuts</h4>
            <div className="shortcuts-list">
              <div className="shortcut-item">
                <kbd>←</kbd><kbd>→</kbd>
                <span>Navigate periods</span>
              </div>
              <div className="shortcut-item">
                <kbd>Home</kbd>
                <span>Go to today</span>
              </div>
              <div className="shortcut-item">
                <kbd>Ctrl</kbd><kbd>1</kbd>
                <span>Day view</span>
              </div>
              <div className="shortcut-item">
                <kbd>Ctrl</kbd><kbd>2</kbd>
                <span>Week view</span>
              </div>
              <div className="shortcut-item">
                <kbd>Ctrl</kbd><kbd>3</kbd>
                <span>Month view</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

CalendarHeader.displayName = 'CalendarHeader';

export default CalendarHeader;