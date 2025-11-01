import React, { useState, useEffect, useCallback } from 'react';
import ProblemsList from './ProblemsList';
import Modal from './Modal';
import TaskForm from './TaskForm';
import EventForm from './EventForm';
import NoteForm from './NoteForm';
import DayNotesEditor from './DayNotesEditor';
import { DayDetails, Problem, Task, Event, Note } from '../../types/calendar';
import { calendarService } from '../../services/calendarService';
import { formatDateToISO, formatDateForDisplay, isToday } from '../../utils/dateUtils';
import './DayDetailView.css';

interface DayDetailViewProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onClose: () => void;
  onProblemSelect?: (problem: Problem) => void;
}

const DayDetailView: React.FC<DayDetailViewProps> = ({
  selectedDate,
  onDateChange,
  onClose,
  onProblemSelect
}) => {
  const [dayDetails, setDayDetails] = useState<DayDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState<boolean>(false);
  const [expandedSections, setExpandedSections] = useState<{
    tasks: boolean;
    events: boolean;
    notes: boolean;
    sessions: boolean;
  }>({
    tasks: true,
    events: true,
    notes: true,
    sessions: true
  });

  // Modal states
  const [modals, setModals] = useState({
    taskForm: false,
    eventForm: false,
    noteForm: false
  });
  const [editingItem, setEditingItem] = useState<{
    type: 'task' | 'event' | 'note';
    item: Task | Event | Note;
  } | null>(null);
  const [formLoading, setFormLoading] = useState<boolean>(false);

  // Load day details for the selected date
  const loadDayDetails = useCallback(async (showTransition = false) => {
    if (showTransition) {
      setTransitioning(true);
    } else {
      setLoading(true);
    }
    setError(null);
    
    try {
      const details = await calendarService.getDayDetails(selectedDate);
      setDayDetails(details);
    } catch (err) {
      console.error('Error loading day details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load day details');
    } finally {
      if (showTransition) {
        setTransitioning(false);
      } else {
        setLoading(false);
      }
    }
  }, [selectedDate]);

  // Load data when selected date changes
  useEffect(() => {
    loadDayDetails(dayDetails !== null); // Show transition if we already have data
  }, [loadDayDetails]);

  // Navigation handlers
  const handlePreviousDay = () => {
    const previousDay = new Date(selectedDate);
    previousDay.setDate(previousDay.getDate() - 1);
    
    // Update URL and browser history
    const dateStr = formatDateToISO(previousDay);
    const url = new URL(window.location.href);
    url.searchParams.set('date', dateStr);
    window.history.pushState({ date: dateStr }, '', url.toString());
    
    onDateChange(previousDay);
  };

  const handleNextDay = () => {
    const nextDay = new Date(selectedDate);
    nextDay.setDate(nextDay.getDate() + 1);
    
    // Update URL and browser history
    const dateStr = formatDateToISO(nextDay);
    const url = new URL(window.location.href);
    url.searchParams.set('date', dateStr);
    window.history.pushState({ date: dateStr }, '', url.toString());
    
    onDateChange(nextDay);
  };

  // Keyboard navigation and browser history
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle keyboard shortcuts if not typing in an input or contenteditable element
      if (
        event.target instanceof HTMLInputElement || 
        event.target instanceof HTMLTextAreaElement ||
        (event.target instanceof HTMLElement && event.target.contentEditable === 'true') ||
        (event.target instanceof HTMLElement && event.target.closest('[contenteditable="true"]'))
      ) {
        return;
      }

      if (event.key === 'ArrowLeft' || event.key === 'h') {
        event.preventDefault();
        handlePreviousDay();
      } else if (event.key === 'ArrowRight' || event.key === 'l') {
        event.preventDefault();
        handleNextDay();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      } else if (event.key === 'Home') {
        event.preventDefault();
        const today = new Date();
        const dateStr = formatDateToISO(today);
        const url = new URL(window.location.href);
        url.searchParams.set('date', dateStr);
        window.history.pushState({ date: dateStr }, '', url.toString());
        onDateChange(today);
      }
    };

    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.date) {
        const newDate = new Date(event.state.date);
        onDateChange(newDate);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('popstate', handlePopState);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [selectedDate, onClose, onDateChange]);

  // Handle problem click - navigate to problem detail view
  const handleProblemClick = (problem: Problem) => {
    if (onProblemSelect) {
      onProblemSelect(problem);
    } else {
      // Fallback: open problem URL in new tab if available
      if (problem.url) {
        window.open(problem.url, '_blank', 'noopener,noreferrer');
      } else {
        console.log('Navigate to problem:', problem);
      }
    }
  };

  // Section toggle handlers
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Task handlers
  const handleTaskToggle = async (taskId: number, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
      await calendarService.updateEvent(taskId, { status: newStatus as any });
      // Reload day details to reflect changes
      loadDayDetails(false);
    } catch (err) {
      console.error('Error updating task:', err);
    }
  };

  // Modal handlers
  const openModal = (type: 'taskForm' | 'eventForm' | 'noteForm') => {
    setModals(prev => ({ ...prev, [type]: true }));
    setEditingItem(null);
  };

  const closeModal = (type: 'taskForm' | 'eventForm' | 'noteForm') => {
    setModals(prev => ({ ...prev, [type]: false }));
    setEditingItem(null);
    setFormLoading(false);
  };

  const handleEditTask = (taskId: number) => {
    const task = dayDetails?.tasks.find(t => t.id === taskId);
    if (task) {
      setEditingItem({ type: 'task', item: task });
      openModal('taskForm');
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await calendarService.deleteEvent(taskId);
        // Reload day details to reflect changes
        loadDayDetails(false);
      } catch (err) {
        console.error('Error deleting task:', err);
      }
    }
  };

  // Event handlers
  const handleEditEvent = (eventId: number) => {
    const event = dayDetails?.events.find(e => e.id === eventId && e.event_type === 'reminder') as Event;
    if (event) {
      setEditingItem({ type: 'event', item: event });
      openModal('eventForm');
    }
  };

  const handleDeleteEvent = async (eventId: number) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        await calendarService.deleteEvent(eventId);
        // Reload day details to reflect changes
        loadDayDetails(false);
      } catch (err) {
        console.error('Error deleting event:', err);
      }
    }
  };

  // Note handlers
  const handleEditNote = (noteId: number) => {
    const note = dayDetails?.notes.find(n => n.id === noteId);
    if (note) {
      setEditingItem({ type: 'note', item: note });
      openModal('noteForm');
    }
  };

  const handleDeleteNote = async (noteId: number) => {
    if (window.confirm('Are you sure you want to delete this note?')) {
      try {
        await calendarService.deleteEvent(noteId);
        // Reload day details to reflect changes
        loadDayDetails(false);
      } catch (err) {
        console.error('Error deleting note:', err);
      }
    }
  };



  // Add item handlers
  const handleAddTask = () => {
    openModal('taskForm');
  };

  const handleAddEvent = () => {
    openModal('eventForm');
  };

  const handleAddNote = () => {
    openModal('noteForm');
  };

  // Form submission handlers
  const handleTaskSubmit = async (taskData: any) => {
    setFormLoading(true);
    try {
      if (editingItem && editingItem.type === 'task') {
        await calendarService.updateEvent(editingItem.item.id, taskData);
      } else {
        await calendarService.createTask(taskData);
      }
      closeModal('taskForm');
      loadDayDetails(false);
    } catch (error) {
      console.error('Error saving task:', error);
    } finally {
      setFormLoading(false);
    }
  };

  const handleEventSubmit = async (eventData: any) => {
    setFormLoading(true);
    try {
      if (editingItem && editingItem.type === 'event') {
        await calendarService.updateEvent(editingItem.item.id, eventData);
      } else {
        await calendarService.createCalendarEvent(eventData);
      }
      closeModal('eventForm');
      loadDayDetails(false);
    } catch (error) {
      console.error('Error saving event:', error);
    } finally {
      setFormLoading(false);
    }
  };

  const handleNoteSubmit = async (noteData: any) => {
    setFormLoading(true);
    try {
      if (editingItem && editingItem.type === 'note') {
        await calendarService.updateEvent(editingItem.item.id, noteData);
      } else {
        await calendarService.createNote(noteData);
      }
      closeModal('noteForm');
      loadDayDetails(false);
    } catch (error) {
      console.error('Error saving note:', error);
    } finally {
      setFormLoading(false);
    }
  };

  const formattedDate = formatDateForDisplay(selectedDate);
  const isSelectedDateToday = isToday(selectedDate);

  // Day notes are now handled by the DayNotesEditor component

  return (
    <div className="day-detail-view-fullscreen">
      {/* Header */}
      <div className="day-detail-header">
        <div className="day-detail-header-left">
          <button 
            className="back-button"
            onClick={onClose}
            title="Back to Calendar"
          >
            ← Back to Calendar
          </button>
        </div>
        
        <div className="day-detail-header-center">
          <h1 className="day-detail-date">
            {formattedDate}
            {isSelectedDateToday && <span className="today-badge">Today</span>}
          </h1>
        </div>
        
        <div className="day-detail-header-right">
          <div className="day-navigation">
            <button 
              className="nav-button"
              onClick={handlePreviousDay}
              title="Previous Day (← or H)"
            >
              ←
            </button>
            <button 
              className="nav-button"
              onClick={handleNextDay}
              title="Next Day (→ or L)"
            >
              →
            </button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="day-detail-loading">
          <div className="loading-spinner"></div>
          <p>Loading day details...</p>
        </div>
      )}

      {/* Error State */}
      {error && !dayDetails && (
        <div className="day-detail-error">
          <div className="error-icon">⚠️</div>
          <h3>Failed to load day details</h3>
          <p>{error}</p>
          <button 
            className="retry-button"
            onClick={() => loadDayDetails(false)}
          >
            Try Again
          </button>
        </div>
      )}

      {/* Transition Loading Overlay */}
      {transitioning && (
        <div className="day-detail-transition-overlay">
          <div className="loading-spinner small"></div>
        </div>
      )}

      {/* Main Content - Two Panel Layout (like ProblemDetailView) */}
      {dayDetails && (
        <div className={`day-detail-content-panels ${transitioning ? 'transitioning' : ''}`}>
          {/* Left Panel - Activities (Solved Problems, Tasks, Events) */}
          <div className="day-detail-left-panel">
            {/* Solved Problems Section */}
            <div className="activity-section">
              <div className="section-header">
                <h3>🎯 Solved Problems ({dayDetails.solvedProblems.length})</h3>
              </div>
              <div className="section-content">
                {dayDetails.solvedProblems.length > 0 ? (
                  <ProblemsList
                    problems={dayDetails.solvedProblems}
                    onProblemClick={handleProblemClick}
                  />
                ) : (
                  <div className="empty-section">
                    <p>No problems solved on this day</p>
                  </div>
                )}
              </div>
            </div>

            {/* Tasks Section */}
            <div className="activity-section">
              <div className="section-header" onClick={() => toggleSection('tasks')}>
                <h3>
                  <span className={`section-toggle ${expandedSections.tasks ? 'expanded' : ''}`}>
                    ▶
                  </span>
                  📋 Tasks ({dayDetails.tasks.length})
                </h3>
                <button 
                  className="add-button" 
                  title="Add Task"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddTask();
                  }}
                >
                  + Add Task
                </button>
              </div>
              {expandedSections.tasks && (
                <div className="section-content">
                  {dayDetails.tasks.length > 0 ? (
                    <div className="tasks-list">
                      {dayDetails.tasks.map((task) => (
                        <div key={task.id} className={`task-item ${task.status}`}>
                          <div className="task-checkbox">
                            <input 
                              type="checkbox" 
                              checked={task.status === 'completed'}
                              onChange={() => handleTaskToggle(task.id, task.status)}
                            />
                          </div>
                          <div className="task-content">
                            <div className="task-title">{task.title}</div>
                            {task.description && (
                              <div className="task-description">{task.description}</div>
                            )}
                            <div className="task-meta">
                              <span className={`priority-badge ${task.priority}`}>
                                {task.priority}
                              </span>
                              <span className={`status-badge ${task.status}`}>
                                {task.status}
                              </span>
                              {task.status === 'overdue' && (
                                <span className="overdue-indicator">⚠️ Overdue</span>
                              )}
                            </div>
                          </div>
                          <div className="task-actions">
                            <button 
                              className="edit-button" 
                              title="Edit Task"
                              onClick={() => handleEditTask(task.id)}
                            >
                              ✏️
                            </button>
                            <button 
                              className="delete-button" 
                              title="Delete Task"
                              onClick={() => handleDeleteTask(task.id)}
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-section">
                      <p>No tasks for this day</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Events Section */}
            <div className="activity-section">
              <div className="section-header" onClick={() => toggleSection('events')}>
                <h3>
                  <span className={`section-toggle ${expandedSections.events ? 'expanded' : ''}`}>
                    ▶
                  </span>
                  📅 Events ({dayDetails.events.filter(e => e.event_type === 'reminder').length})
                </h3>
                <button 
                  className="add-button" 
                  title="Add Event"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddEvent();
                  }}
                >
                  + Add Event
                </button>
              </div>
              {expandedSections.events && (
                <div className="section-content">
                  {dayDetails.events.filter(e => e.event_type === 'reminder').length > 0 ? (
                    <div className="events-list">
                      {dayDetails.events
                        .filter(e => e.event_type === 'reminder')
                        .map((event) => (
                          <div key={event.id} className="event-item">
                            <div className="event-time">
                              {event.start_time && (
                                <span>
                                  {event.start_time}
                                  {event.end_time && ` - ${event.end_time}`}
                                </span>
                              )}
                            </div>
                            <div className="event-content">
                              <div className="event-title">{event.title}</div>
                              {event.description && (
                                <div className="event-description">{event.description}</div>
                              )}
                            </div>
                            <div className="event-actions">
                              <button 
                                className="edit-button" 
                                title="Edit Event"
                                onClick={() => handleEditEvent(event.id)}
                              >
                                ✏️
                              </button>
                              <button 
                                className="delete-button" 
                                title="Delete Event"
                                onClick={() => handleDeleteEvent(event.id)}
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="empty-section">
                      <p>No events for this day</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Practice Sessions Section */}
            {dayDetails.practiceSessions.length > 0 && (
              <div className="activity-section">
                <div className="section-header" onClick={() => toggleSection('sessions')}>
                  <h3>
                    <span className={`section-toggle ${expandedSections.sessions ? 'expanded' : ''}`}>
                      ▶
                    </span>
                    🎯 Practice Sessions ({dayDetails.practiceSessions.length})
                  </h3>
                </div>
                {expandedSections.sessions && (
                  <div className="section-content">
                    <div className="sessions-list">
                      {dayDetails.practiceSessions.map((session) => (
                        <div key={session.id} className="session-item">
                          <div className="session-content">
                            <div className="session-title">{session.title}</div>
                            <div className="session-meta">
                              {session.time_spent && (
                                <span className="time-spent">
                                  ⏱️ {session.time_spent} min
                                </span>
                              )}
                              {session.success_rate !== undefined && (
                                <span className="success-rate">
                                  📊 {session.success_rate}% success
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Panel - Day Notes (with slash commands) */}
          <div className="day-detail-right-panel">
            <div className="notes-panel-content">
              <DayNotesEditor
                selectedDate={selectedDate}
                className="day-notes-editor"
                autoSaveDelay={1000}
              />
            </div>
          </div>
        </div>
      )}

      {/* Task Form Modal */}
      <Modal
        isOpen={modals.taskForm}
        onClose={() => closeModal('taskForm')}
        title={editingItem?.type === 'task' ? 'Edit Task' : 'Create Task'}
      >
        <TaskForm
          task={editingItem?.type === 'task' ? editingItem.item as Task : undefined}
          date={selectedDate}
          onSubmit={handleTaskSubmit}
          onCancel={() => closeModal('taskForm')}
          loading={formLoading}
        />
      </Modal>

      {/* Event Form Modal */}
      <Modal
        isOpen={modals.eventForm}
        onClose={() => closeModal('eventForm')}
        title={editingItem?.type === 'event' ? 'Edit Event' : 'Create Event'}
      >
        <EventForm
          event={editingItem?.type === 'event' ? editingItem.item as Event : undefined}
          date={selectedDate}
          onSubmit={handleEventSubmit}
          onCancel={() => closeModal('eventForm')}
          loading={formLoading}
        />
      </Modal>

      {/* Note Form Modal */}
      <Modal
        isOpen={modals.noteForm}
        onClose={() => closeModal('noteForm')}
        title={editingItem?.type === 'note' ? 'Edit Note' : 'Create Note'}
      >
        <NoteForm
          note={editingItem?.type === 'note' ? editingItem.item as Note : undefined}
          date={selectedDate}
          onSubmit={handleNoteSubmit}
          onCancel={() => closeModal('noteForm')}
          loading={formLoading}
        />
      </Modal>
    </div>
  );
};

export default DayDetailView;