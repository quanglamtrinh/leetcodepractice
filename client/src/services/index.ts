// Spaced Repetition Services - Main export file
import { ReviewScheduler } from './reviewScheduler';
import { ForgettingRecoveryEngine } from './forgettingRecoveryEngine';
import { IntensiveRecoveryManager } from './intensiveRecoveryManager';
import { ReviewService } from './reviewService';
import { api } from './api';
import { CalendarService, calendarService } from './calendarService';

export { ReviewScheduler } from './reviewScheduler';
export type { ReviewStage, ReviewScheduleResult, CustomReviewOptions } from './reviewScheduler';

export { ForgettingRecoveryEngine } from './forgettingRecoveryEngine';
export type { 
  ForgettingPattern, 
  RecoveryPlan, 
  ForgettingEventData, 
  ForgettingAnalysis 
} from './forgettingRecoveryEngine';

export { IntensiveRecoveryManager } from './intensiveRecoveryManager';
export type { 
  IntensiveRecoveryCycle, 
  CycleStatus, 
  IntensiveReviewResult, 
  RecoveryProgress 
} from './intensiveRecoveryManager';

export { ReviewService } from './reviewService';
export type { 
  ReviewAction, 
  ReviewResult, 
  DailyReviewItem, 
  ReviewStatistics 
} from './reviewService';

// Re-export API services
export { api, reviewApi } from './api';
export type { ApiResponse, ApiError } from './api';

// Calendar services
export { CalendarService, calendarService } from './calendarService';
export type { 
  CalendarEvent, 
  CalendarData, 
  DayDetails, 
  CreateEventRequest, 
  UpdateEventRequest,
  CalendarStats,
  Task,
  Note,
  PracticeSession,
  Event,
  Problem,
  CalendarView,
  EventType,
  TaskStatus,
  Priority
} from '../types/calendar';

// Convenience exports for common use cases
export const SpacedRepetition = {
  // Main service for most operations
  ReviewService: ReviewService,
  
  // Individual engines for specific needs
  ReviewScheduler: ReviewScheduler,
  ForgettingRecoveryEngine: ForgettingRecoveryEngine,
  IntensiveRecoveryManager: IntensiveRecoveryManager,
  
  // API access
  api: api
};

// Calendar convenience export
export const Calendar = {
  // Main calendar service
  CalendarService: CalendarService,
  service: calendarService,
  
  // API access
  api: api
};

export default SpacedRepetition;