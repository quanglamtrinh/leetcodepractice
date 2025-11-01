import React, { useState, useEffect, useCallback, useMemo } from 'react';
import CalendarGrid from './calendar/CalendarGrid';
import CalendarHeader from './calendar/CalendarHeader';
import CalendarControls from './calendar/CalendarControls';
import DayDetailView from './calendar/DayDetailView';
import { CalendarView, CalendarData, CalendarEvent, Problem } from '../types/calendar';
import { calendarService } from '../services/calendarService';
import { formatDateToISO } from '../utils/dateUtils';
import '../components/calendar/Calendar.css';

interface CalendarTabProps {
  onDaySelect?: (date: Date) => void;
  onProblemSelect?: (problem: Problem) => void;
  className?: string;
}

const CalendarTab: React.FC<CalendarTabProps> = React.memo(({ 
  onDaySelect,
  onProblemSelect,
  className = ''
}) => {
  // State management
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [view, setView] = useState<CalendarView>('month');
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showDayDetail, setShowDayDetail] = useState<boolean>(false);

  // Load calendar data for current view
  const loadCalendarData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await calendarService.getCalendarDataForView(view, currentDate);
      setCalendarData(data);
    } catch (err) {
      console.error('Error loading calendar data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  }, [view, currentDate]);

  // Load data when view or date changes
  useEffect(() => {
    loadCalendarData();
  }, [loadCalendarData]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts when calendar tab is active and no input is focused
      const activeElement = document.activeElement;
      const isInputFocused = activeElement && (
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA' ||
        (activeElement as HTMLElement).contentEditable === 'true'
      );

      if (isInputFocused) return;

      switch (event.key) {
        case 'ArrowLeft':
          if (event.shiftKey) {
            event.preventDefault();
            const prevDate = new Date(currentDate);
            prevDate.setDate(prevDate.getDate() - 1);
            handleDateChange(prevDate);
          }
          break;
        case 'ArrowRight':
          if (event.shiftKey) {
            event.preventDefault();
            const nextDate = new Date(currentDate);
            nextDate.setDate(nextDate.getDate() + 1);
            handleDateChange(nextDate);
          }
          break;
        case 'ArrowUp':
          if (event.shiftKey) {
            event.preventDefault();
            const prevWeek = new Date(currentDate);
            prevWeek.setDate(prevWeek.getDate() - 7);
            handleDateChange(prevWeek);
          }
          break;
        case 'ArrowDown':
          if (event.shiftKey) {
            event.preventDefault();
            const nextWeek = new Date(currentDate);
            nextWeek.setDate(nextWeek.getDate() + 7);
            handleDateChange(nextWeek);
          }
          break;
        case 't':
        case 'T':
          if (!event.ctrlKey && !event.metaKey) {
            event.preventDefault();
            handleTodayClick();
          }
          break;
        case 'r':
        case 'R':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            handleRefresh();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [currentDate]);

  // Remember user's preferred view in localStorage
  useEffect(() => {
    const savedView = localStorage.getItem('calendar-preferred-view') as CalendarView;
    if (savedView && ['day', 'week', 'month'].includes(savedView)) {
      setView(savedView);
    }
  }, []);

  // Save preferred view to localStorage
  useEffect(() => {
    localStorage.setItem('calendar-preferred-view', view);
  }, [view]);

  // Event handlers
  const handleDateChange = (newDate: Date) => {
    setCurrentDate(newDate);
  };

  const handleViewChange = (newView: CalendarView) => {
    setView(newView);
  };

  const handleTodayClick = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setShowDayDetail(true);
    if (onDaySelect) {
      onDaySelect(date);
    }
  };

  const handleCloseDayDetail = () => {
    setShowDayDetail(false);
    setSelectedDate(undefined);
  };

  const handleDayDetailDateChange = (newDate: Date) => {
    setSelectedDate(newDate);
    setCurrentDate(newDate); // Also update current date to keep calendar in sync
  };

  const handleDateJump = (date: Date) => {
    setCurrentDate(date);
    setSelectedDate(date);
  };

  const handleRefresh = () => {
    // Clear cache and reload data
    calendarService.clearCache();
    loadCalendarData();
  };

  const handleAddEvent = () => {
    // For now, just select today's date to show day detail view
    // In the future, this could open an event creation modal
    const today = new Date();
    setSelectedDate(today);
    if (onDaySelect) {
      onDaySelect(today);
    }
  };

  // Memoize events and problems from calendar data for performance
  const events: CalendarEvent[] = useMemo(() => calendarData?.events || [], [calendarData?.events]);
  const problems: Problem[] = useMemo(() => calendarData?.problems || [], [calendarData?.problems]);

  // Memoize calendar stats to avoid recalculation
  const calendarStats = useMemo(() => {
    if (!calendarData) return null;
    
    return {
      totalEvents: events.length,
      solvedProblems: problems.filter(p => p.solved).length,
      currentView: view.charAt(0).toUpperCase() + view.slice(1)
    };
  }, [events.length, problems, view]);

  // Loading state
  if (loading && !calendarData) {
    return (
      <div className={`calendar-tab loading ${className}`}>
        <div className="calendar-loading">
          <div className="loading-spinner pulse"></div>
          <p>Loading calendar...</p>
          <div className="loading-progress">
            <div className="progress-bar"></div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !calendarData) {
    return (
      <div className={`calendar-tab error ${className}`}>
        <div className="calendar-error">
          <div className="error-icon">⚠️</div>
          <h3>Failed to load calendar</h3>
          <p>{error}</p>
          <button 
            className="retry-button"
            onClick={loadCalendarData}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Show day detail view if a date is selected (full screen like problem detail)
  if (showDayDetail && selectedDate) {
    return (
      <div className="calendar-day-detail-fullscreen">
        <DayDetailView
          selectedDate={selectedDate}
          onDateChange={handleDayDetailDateChange}
          onClose={handleCloseDayDetail}
          onProblemSelect={onProblemSelect}
        />
      </div>
    );
  }

  return (
    <div className={`calendar-tab ${className}`}>
      <div className="calendar-container">
        {/* Calendar Header with navigation and view controls */}
        <CalendarHeader
          currentDate={currentDate}
          view={view}
          onDateChange={handleDateChange}
          onViewChange={handleViewChange}
          onTodayClick={handleTodayClick}
          onDateJump={handleDateJump}
        />

        {/* Calendar Controls for additional actions */}
        <CalendarControls
          currentDate={currentDate}
          view={view}
          onDateJump={handleDateJump}
          onAddEvent={handleAddEvent}
          onRefresh={handleRefresh}
          showAddButton={true}
          showRefreshButton={true}
          showDatePicker={true}
        />

        {/* Loading overlay for data refresh */}
        {loading && calendarData && (
          <div className="calendar-loading-overlay">
            <div className="loading-spinner small"></div>
          </div>
        )}

        {/* Main Calendar Grid */}
        <CalendarGrid
          currentDate={currentDate}
          selectedDate={selectedDate}
          view={view}
          events={events}
          problems={problems}
          onDateSelect={handleDateSelect}
          onViewChange={handleViewChange}
          onDateChange={handleDateChange}
        />

        {/* Error message for refresh failures */}
        {error && calendarData && (
          <div className="calendar-error-banner">
            <span className="error-text">Failed to refresh: {error}</span>
            <button 
              className="dismiss-error"
              onClick={() => setError(null)}
            >
              ✕
            </button>
          </div>
        )}

        {/* Calendar Stats Footer */}
        {calendarStats && (
          <div className="calendar-stats">
            <div className="stat-item">
              <span className="stat-label">Events:</span>
              <span className="stat-value">{calendarStats.totalEvents}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Solved Problems:</span>
              <span className="stat-value">{calendarStats.solvedProblems}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Current View:</span>
              <span className="stat-value">{calendarStats.currentView}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

CalendarTab.displayName = 'CalendarTab';

export default CalendarTab;