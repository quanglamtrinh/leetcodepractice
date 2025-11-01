import React, { useState } from 'react';
import { CalendarView } from '../../types/calendar';

interface CalendarControlsProps {
  currentDate: Date;
  view: CalendarView;
  onDateJump?: (date: Date) => void;
  onAddEvent?: () => void;
  onRefresh?: () => void;
  showAddButton?: boolean;
  showRefreshButton?: boolean;
  showDatePicker?: boolean;
}

const CalendarControls: React.FC<CalendarControlsProps> = React.memo(({
  currentDate,
  view,
  onDateJump,
  onAddEvent,
  onRefresh,
  showAddButton = true,
  showRefreshButton = true,
  showDatePicker = true
}) => {
  const [showDateInput, setShowDateInput] = useState(false);
  const [dateInputValue, setDateInputValue] = useState('');

  const handleDateInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (dateInputValue && onDateJump) {
      try {
        const newDate = new Date(dateInputValue);
        if (!isNaN(newDate.getTime())) {
          onDateJump(newDate);
          setShowDateInput(false);
          setDateInputValue('');
        }
      } catch (error) {
        console.error('Invalid date:', error);
      }
    }
  };

  const handleDatePickerClick = () => {
    if (showDatePicker) {
      setShowDateInput(!showDateInput);
      if (!showDateInput) {
        // Pre-fill with current date
        const currentDateStr = currentDate.toISOString().split('T')[0];
        setDateInputValue(currentDateStr);
      }
    }
  };

  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateInputValue(e.target.value);
  };

  const handleDateInputBlur = () => {
    // Hide date input after a short delay to allow for form submission
    setTimeout(() => {
      setShowDateInput(false);
      setDateInputValue('');
    }, 200);
  };

  return (
    <div className="calendar-controls">
      <div className="calendar-controls-left">
        {showDatePicker && (
          <div className="date-picker-container">
            {!showDateInput ? (
              <button 
                className="date-picker-button"
                onClick={handleDatePickerClick}
                title="Jump to specific date"
                aria-label="Jump to specific date"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M3.5 0v1h9V0h1v1H15v14H1V1h1.5V0h1zM2 2v12h12V2H2zm2 2h1v1H4V4zm2 0h1v1H6V4zm2 0h1v1H8V4zm2 0h1v1h-1V4zm2 0h1v1h-1V4zM4 6h1v1H4V6zm2 0h1v1H6V6zm2 0h1v1H8V6zm2 0h1v1h-1V6zm2 0h1v1h-1V6zM4 8h1v1H4V8zm2 0h1v1H6V8zm2 0h1v1H8V8zm2 0h1v1h-1V8zm2 0h1v1h-1V8zM4 10h1v1H4v-1zm2 0h1v1H6v-1zm2 0h1v1H8v-1zm2 0h1v1h-1v-1zm2 0h1v1h-1v-1z"/>
                </svg>
                Jump to Date
              </button>
            ) : (
              <form onSubmit={handleDateInputSubmit} className="date-input-form">
                <input
                  type="date"
                  value={dateInputValue}
                  onChange={handleDateInputChange}
                  onBlur={handleDateInputBlur}
                  className="date-input"
                  autoFocus
                  aria-label="Select date to jump to"
                />
                <button 
                  type="submit" 
                  className="date-input-submit"
                  title="Go to selected date"
                >
                  Go
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      <div className="calendar-controls-right">
        {showRefreshButton && (
          <button 
            className="control-button refresh-button"
            onClick={onRefresh}
            title="Refresh calendar data"
            aria-label="Refresh calendar data"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
              <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
            </svg>
            Refresh
          </button>
        )}

        {showAddButton && (
          <button 
            className="control-button add-button primary"
            onClick={onAddEvent}
            title="Add new event"
            aria-label="Add new event"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0a.5.5 0 0 1 .5.5v7h7a.5.5 0 0 1 0 1h-7v7a.5.5 0 0 1-1 0v-7h-7a.5.5 0 0 1 0-1h7v-7A.5.5 0 0 1 8 0z"/>
            </svg>
            Add Event
          </button>
        )}
      </div>
    </div>
  );
});

CalendarControls.displayName = 'CalendarControls';

export default CalendarControls;