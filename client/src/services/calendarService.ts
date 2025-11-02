// Calendar service for managing calendar data and operations

import { 
  CalendarEvent, 
  CalendarData, 
  DayDetails, 
  CreateEventRequest, 
  UpdateEventRequest,
  CalendarStats,
  CalendarView,
  Task,
  Note,
  SolvedProblem,
  Event,
  Problem
} from '../types/calendar';
import { apiRequest, ApiError } from './api';
import { formatDateToISO, getDateRange } from '../utils/dateUtils';

/**
 * Calendar service class for managing calendar operations
 */
export class CalendarService {
  private static instance: CalendarService;
  private cache: Map<string, any> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): CalendarService {
    if (!CalendarService.instance) {
      CalendarService.instance = new CalendarService();
    }
    return CalendarService.instance;
  }

  /**
   * Clear the cache
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cached data or fetch if not available/expired
   */
  private async getCachedData<T>(
    key: string, 
    fetchFn: () => Promise<T>,
    ttl: number = this.cacheTimeout
  ): Promise<T> {
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data;
    }

    const data = await fetchFn();
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });

    return data;
  }

  /**
   * Get calendar data for a date range
   */
  async getCalendarData(startDate: Date, endDate: Date): Promise<CalendarData> {
    const start = formatDateToISO(startDate);
    const end = formatDateToISO(endDate);
    const cacheKey = `calendar-data-${start}-${end}`;

    return this.getCachedData(cacheKey, async () => {
      try {
        // Fetch calendar events
        const eventsResponse = await apiRequest<CalendarEvent[]>(
          `/api/calendar/events?start_date=${start}&end_date=${end}`
        );

        // Fetch all solved problems and filter by date range
        const allProblemsResponse = await apiRequest<Problem[]>('/api/solved');
        const problems = (allProblemsResponse || []).filter(problem => {
          if (!problem.solved_date) return false;
          const solvedDate = problem.solved_date.split('T')[0]; // Get just the date part
          return solvedDate >= start && solvedDate <= end;
        });

        return {
          startDate: start,
          endDate: end,
          events: eventsResponse || [],
          problems: problems
        };
      } catch (error) {
        console.error('Error fetching calendar data:', error);
        // Return empty data structure on error
        return {
          startDate: start,
          endDate: end,
          events: [],
          problems: []
        };
      }
    });
  }

  /**
   * Get calendar data for a specific view and date
   */
  async getCalendarDataForView(view: CalendarView, currentDate: Date): Promise<CalendarData> {
    const dateRange = getDateRange(view, currentDate);
    return this.getCalendarData(dateRange.startDate, dateRange.endDate);
  }

  /**
   * Get detailed data for a specific day
   */
  async getDayDetails(date: Date): Promise<DayDetails> {
    const dateStr = formatDateToISO(date);
    const cacheKey = `day-details-${dateStr}`;

    return this.getCachedData(cacheKey, async () => {
      try {
        // Fetch events for the day
        const eventsResponse = await apiRequest<CalendarEvent[]>(
          `/api/calendar/day/${dateStr}`
        );

        // Fetch all solved problems and filter by date
        const allProblemsResponse = await apiRequest<Problem[]>('/api/solved');
        const problems = (allProblemsResponse || []).filter(problem => {
          if (!problem.solved_date) return false;
          const solvedDate = problem.solved_date.split('T')[0]; // Get just the date part
          return solvedDate === dateStr;
        });

        const events = eventsResponse || [];

        // Separate events by type
        const tasks = events.filter(e => e.event_type === 'task') as Task[];
        const notes = events.filter(e => e.event_type === 'note') as Note[];
        const solvedProblemEvents = events.filter(e => e.event_type === 'solved_problem') as SolvedProblem[];

        // Fetch day notes
        const dayNotes = await this.getDayNotes(date);

        return {
          date: dateStr,
          events: events,
          solvedProblems: problems,
          tasks: tasks,
          notes: notes,
          solvedProblemEvents: solvedProblemEvents,
          dayNotes: dayNotes
        };
      } catch (error) {
        console.error('Error fetching day details:', error);
        // Return empty data structure on error
        return {
          date: dateStr,
          events: [],
          solvedProblems: [],
          tasks: [],
          notes: [],
          solvedProblemEvents: [],
          dayNotes: ''
        };
      }
    });
  }

  /**
   * Get calendar statistics
   */
  async getCalendarStats(): Promise<CalendarStats> {
    const cacheKey = 'calendar-stats';

    return this.getCachedData(cacheKey, async () => {
      try {
        // Get stats for the current month by default
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const start = formatDateToISO(startOfMonth);
        const end = formatDateToISO(endOfMonth);
        
        const response = await apiRequest<CalendarStats>(
          `/api/calendar/stats?start_date=${start}&end_date=${end}`
        );

        return response || {
          totalEvents: 0,
          completedTasks: 0,
          pendingTasks: 0,
          overdueTasks: 0,
          totalPracticeSessions: 0,
          totalTimeSpent: 0
        };
      } catch (error) {
        console.error('Error fetching calendar stats:', error);
        throw error;
      }
    });
  }

  /**
   * Create a new calendar event
   */
  async createEvent(eventData: CreateEventRequest): Promise<CalendarEvent> {
    try {
      // Validate required fields
      if (!eventData.title?.trim()) {
        throw new ApiError('Event title is required', 400);
      }
      if (!eventData.date) {
        throw new ApiError('Event date is required', 400);
      }
      if (!eventData.event_type) {
        throw new ApiError('Event type is required', 400);
      }

      // Map client-side field names to server-side field names
      const serverEventData: any = {
        event_type: eventData.event_type,
        title: eventData.title,
        description: eventData.description,
        event_date: eventData.date, // Map 'date' to 'event_date'
        event_time: eventData.start_time,
        duration_minutes: eventData.end_time ? this.calculateDurationMinutes(eventData.start_time, eventData.end_time) : undefined,
        priority: eventData.priority || 'medium',
        problem_id: eventData.problem_id
      };

      // Add type-specific fields
      if (eventData.event_type === 'note') {
        serverEventData.note_content = eventData.description || eventData.title || 'Empty note';
      }

      const response = await apiRequest<CalendarEvent>(
        '/api/calendar/events',
        {
          method: 'POST',
          body: JSON.stringify(serverEventData)
        }
      );

      // Clear relevant cache entries
      this.clearCacheForDate(eventData.date);

      return response;
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  }

  /**
   * Update an existing calendar event
   */
  async updateEvent(eventId: number, updates: UpdateEventRequest): Promise<CalendarEvent> {
    try {
      // Map client-side field names to server-side field names
      const serverUpdates: any = { ...updates };
      
      if (updates.date) {
        serverUpdates.event_date = updates.date;
        delete serverUpdates.date;
      }
      
      if (updates.start_time) {
        serverUpdates.event_time = updates.start_time;
        delete serverUpdates.start_time;
      }
      
      if (updates.status) {
        serverUpdates.task_status = updates.status;
        delete serverUpdates.status;
      }

      const response = await apiRequest<CalendarEvent>(
        `/api/calendar/events/${eventId}`,
        {
          method: 'PUT',
          body: JSON.stringify(serverUpdates)
        }
      );

      // Clear relevant cache entries
      if (updates.date) {
        this.clearCacheForDate(updates.date);
      }
      this.clearCache(); // Clear all cache for simplicity

      return response;
    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  }

  /**
   * Delete a calendar event
   */
  async deleteEvent(eventId: number): Promise<void> {
    try {
      await apiRequest<void>(
        `/api/calendar/events/${eventId}`,
        {
          method: 'DELETE'
        }
      );

      // Clear all cache since we don't know which date was affected
      this.clearCache();
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  }

  /**
   * Create a task
   */
  async createTask(taskData: Omit<CreateEventRequest, 'event_type'>): Promise<Task> {
    const eventData: CreateEventRequest = {
      ...taskData,
      event_type: 'task'
    };
    return this.createEvent(eventData) as Promise<Task>;
  }

  /**
   * Create a note
   */
  async createNote(noteData: Omit<CreateEventRequest, 'event_type'>): Promise<Note> {
    const eventData: CreateEventRequest = {
      ...noteData,
      event_type: 'note',
      // Ensure notes have a title (required by server)
      title: noteData.title || noteData.description || 'Untitled Note'
    };
    return this.createEvent(eventData) as Promise<Note>;
  }

  /**
   * Create an event
   */
  async createCalendarEvent(eventData: Omit<CreateEventRequest, 'event_type'>): Promise<Event> {
    const data: CreateEventRequest = {
      ...eventData,
      event_type: 'reminder' // Map 'event' to 'reminder' since server doesn't accept 'event'
    };
    return this.createEvent(data) as Promise<Event>;
  }

  /**
   * Mark a task as completed
   */
  async completeTask(taskId: number): Promise<Task> {
    return this.updateEvent(taskId, { status: 'completed' }) as Promise<Task>;
  }

  /**
   * Mark a task as pending
   */
  async uncompleteTask(taskId: number): Promise<Task> {
    return this.updateEvent(taskId, { status: 'pending' }) as Promise<Task>;
  }

  /**
   * Get events by type for a date range
   */
  async getEventsByType(
    eventType: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<CalendarEvent[]> {
    const start = formatDateToISO(startDate);
    const end = formatDateToISO(endDate);
    const cacheKey = `events-${eventType}-${start}-${end}`;

    return this.getCachedData(cacheKey, async () => {
      try {
        const response = await apiRequest<CalendarEvent[]>(
          `/api/calendar/events?event_types=${eventType}&start_date=${start}&end_date=${end}`
        );

        return response || [];
      } catch (error) {
        console.error(`Error fetching ${eventType} events:`, error);
        throw error;
      }
    });
  }

  /**
   * Get overdue tasks
   */
  async getOverdueTasks(): Promise<Task[]> {
    const cacheKey = 'overdue-tasks';

    return this.getCachedData(cacheKey, async () => {
      try {
        const response = await apiRequest<Task[]>(
          '/api/calendar/overdue-tasks'
        );

        return response || [];
      } catch (error) {
        console.error('Error fetching overdue tasks:', error);
        throw error;
      }
    });
  }

  /**
   * Get upcoming events
   */
  async getUpcomingEvents(days: number = 7): Promise<CalendarEvent[]> {
    const cacheKey = `upcoming-events-${days}`;

    return this.getCachedData(cacheKey, async () => {
      try {
        const response = await apiRequest<CalendarEvent[]>(
          `/api/calendar/upcoming-tasks?days=${days}`
        );

        return response || [];
      } catch (error) {
        console.error('Error fetching upcoming events:', error);
        throw error;
      }
    });
  }

  /**
   * Search events by title or description
   */
  async searchEvents(query: string, startDate?: Date, endDate?: Date): Promise<CalendarEvent[]> {
    try {
      // Use the filter endpoint to search by title and description
      let url = `/api/calendar/events/filter?search=${encodeURIComponent(query)}`;
      
      if (startDate) {
        url += `&start_date=${formatDateToISO(startDate)}`;
      }
      if (endDate) {
        url += `&end_date=${formatDateToISO(endDate)}`;
      }

      const response = await apiRequest<CalendarEvent[]>(url);

      return response || [];
    } catch (error) {
      console.error('Error searching events:', error);
      throw error;
    }
  }

  /**
   * Calculate duration in minutes between start and end time
   */
  private calculateDurationMinutes(startTime?: string, endTime?: string): number | undefined {
    if (!startTime || !endTime) return undefined;
    
    try {
      const start = new Date(`2000-01-01T${startTime}`);
      const end = new Date(`2000-01-01T${endTime}`);
      const diffMs = end.getTime() - start.getTime();
      return Math.max(0, Math.floor(diffMs / (1000 * 60)));
    } catch (error) {
      console.error('Error calculating duration:', error);
      return undefined;
    }
  }

  /**
   * Clear cache entries for a specific date
   */
  private clearCacheForDate(date: string): void {
    const keysToDelete: string[] = [];
    
    this.cache.forEach((value, key) => {
      if (key.includes(date) || key.includes('calendar-data') || key.includes('day-details')) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Invalidate cache when problems are solved (called from problem solving workflow)
   */
  public invalidateCacheForProblemSolved(date: Date): void {
    const dateStr = formatDateToISO(date);
    this.clearCacheForDate(dateStr);
    
    // Also clear stats cache
    this.cache.delete('calendar-stats');
  }

  /**
   * Save day notes for a specific date
   */
  public async saveDayNotes(date: Date, notes: string): Promise<void> {
    const dateStr = formatDateToISO(date);
    
    try {
      await apiRequest(`/api/calendar/day-notes/${dateStr}`, {
        method: 'PUT',
        body: JSON.stringify({ notes }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // Invalidate cache for this day
      this.cache.delete(`day-details-${dateStr}`);
      this.cache.delete(`day-notes-${dateStr}`);
      
    } catch (error) {
      console.error('Error saving day notes:', error);
      throw error;
    }
  }

  /**
   * Get day notes for a specific date
   */
  public async getDayNotes(date: Date): Promise<string> {
    const dateStr = formatDateToISO(date);
    const cacheKey = `day-notes-${dateStr}`;
    
    return this.getCachedData(cacheKey, async () => {
      try {
        const response = await apiRequest<{ notes: string }>(`/api/calendar/day-notes/${dateStr}`);
        return response.notes || '';
      } catch (error) {
        console.error('Error fetching day notes:', error);
        return '';
      }
    });
  }
}

// Export singleton instance
export const calendarService = CalendarService.getInstance();

// Export the class for testing
export default CalendarService;