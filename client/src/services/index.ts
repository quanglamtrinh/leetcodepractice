// Spaced Repetition Services - Main export file
import { ReviewScheduler } from './reviewScheduler';
import { ForgettingRecoveryEngine } from './forgettingRecoveryEngine';
import { IntensiveRecoveryManager } from './intensiveRecoveryManager';
import { ReviewService } from './reviewService';
import { api } from './api';

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

export default SpacedRepetition;