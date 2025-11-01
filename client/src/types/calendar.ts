// Calendar feature type definitions

export type CalendarView = 'month' | 'week' | 'day';

export type EventType = 'task' | 'note' | 'practice_session' | 'reminder';

export type TaskStatus = 'pending' | 'completed' | 'overdue';

export type Priority = 'low' | 'medium' | 'high';

export interface CalendarEvent {
  id: number;
  title: string;
  description?: string;
  date: string; // ISO date string (YYYY-MM-DD)
  event_type: EventType;
  start_time?: string; // HH:MM format
  end_time?: string; // HH:MM format
  status?: TaskStatus;
  priority?: Priority;
  problem_id?: number;
  time_spent?: number; // in minutes
  success_rate?: number; // 0-100
  created_at: string;
  updated_at: string;
}

export interface Task extends CalendarEvent {
  event_type: 'task';
  status: TaskStatus;
  priority: Priority;
}

export interface Note extends CalendarEvent {
  event_type: 'note';
}

export interface PracticeSession extends CalendarEvent {
  event_type: 'practice_session';
  problem_id: number;
  time_spent: number;
  success_rate: number;
}

export interface Event extends CalendarEvent {
  event_type: 'reminder';
  start_time: string;
  end_time?: string;
}

export interface Problem {
  id: number;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  concept: string;
  solved: boolean;
  solved_date?: string;
  url?: string;
}

export interface CalendarData {
  startDate: string;
  endDate: string;
  events: CalendarEvent[];
  problems: Problem[];
}

export interface DayDetails {
  date: string;
  events: CalendarEvent[];
  solvedProblems: Problem[];
  tasks: Task[];
  notes: Note[];
  practiceSessions: PracticeSession[];
  dayNotes?: string; // Rich text notes for the entire day
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface CalendarStats {
  totalEvents: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  totalPracticeSessions: number;
  totalTimeSpent: number; // in minutes
}

// Request/Response types for API
export interface CreateEventRequest {
  title: string;
  description?: string;
  date: string;
  event_type: EventType;
  start_time?: string;
  end_time?: string;
  priority?: Priority;
  problem_id?: number;
}

export interface UpdateEventRequest extends Partial<CreateEventRequest> {
  status?: TaskStatus;
}

export interface CalendarApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}