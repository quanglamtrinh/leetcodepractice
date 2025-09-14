// Review Service - Main service that integrates all spaced repetition functionality
import { ReviewScheduler, ReviewScheduleResult, CustomReviewOptions } from './reviewScheduler';
import { ForgettingRecoveryEngine, RecoveryPlan, ForgettingEventData } from './forgettingRecoveryEngine';
import { IntensiveRecoveryManager, IntensiveReviewResult, CycleStatus } from './intensiveRecoveryManager';
import { api } from './api';

export interface ReviewAction {
  problemId: number;
  result: 'remembered' | 'forgot';
  timeSpent?: number;
  confusionNotes?: string;
  specificMistakes?: string[];
  customNextDate?: Date;
}

export interface ReviewResult {
  success: boolean;
  nextReviewDate: Date;
  message: string;
  intensiveRecovery?: boolean;
  recoveryPlan?: RecoveryPlan;
  cycleStatus?: CycleStatus;
}

export interface DailyReviewItem {
  problemId: number;
  problemTitle: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  reviewType: 'NORMAL_REVIEW' | 'INTENSIVE_RECOVERY';
  priority: 1 | 2 | 3 | 4 | 5;
  daysOverdue: number;
  lastReviewDate: Date;
  timesForotten: number;
  patternNames: string;
  leetcodeLink?: string;
}

export interface ReviewStatistics {
  totalProblemsInRotation: number;
  problemsDueToday: number;
  overdueProblems: number;
  intensiveRecoveryProblems: number;
  reviewStreak: number;
  weeklyCompletionRate: number;
  monthlyCompletionRate: number;
  forgettingRateByStage: Record<number, number>;
  averageRecoveryTime: number;
}

export class ReviewService {
  /**
   * Submit a review result and handle the appropriate scheduling
   */
  public static async submitReview(action: ReviewAction): Promise<ReviewResult> {
    try {
      // Validate input
      const validation = this.validateReviewAction(action);
      if (!validation.isValid) {
        throw new Error(`Invalid review action: ${validation.errors.join(', ')}`);
      }

      if (action.result === 'forgot') {
        return await this.handleForgettingEvent(action);
      } else {
        return await this.handleRememberedEvent(action);
      }
    } catch (error) {
      console.error('Failed to submit review:', error);
      return {
        success: false,
        nextReviewDate: new Date(),
        message: `Failed to submit review: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get the daily review queue with prioritized problems
   */
  public static async getDailyReviewQueue(targetDate?: Date): Promise<DailyReviewItem[]> {
    try {
      const response = await api.reviews.getDueToday();
      
      return response.map((item: any) => ({
        problemId: item.problem_id,
        problemTitle: item.problem_title,
        difficulty: item.difficulty,
        reviewType: item.review_type,
        priority: item.priority,
        daysOverdue: item.days_overdue,
        lastReviewDate: new Date(item.last_review_date),
        timesForotten: item.times_forgotten,
        patternNames: item.pattern_names || '',
        leetcodeLink: item.leetcode_link || ''
      }));
    } catch (error) {
      console.warn('Failed to get daily review queue:', error);
      return [];
    }
  }

  /**
   * Automatically schedule initial review when a problem is marked as solved
   */
  public static async scheduleInitialReview(problemId: number): Promise<ReviewScheduleResult> {
    try {
      return await ReviewScheduler.scheduleInitialReview(problemId);
    } catch (error) {
      console.error('Failed to schedule initial review:', error);
      throw new Error('Failed to schedule initial review');
    }
  }

  /**
   * Get review history for a specific problem
   */
  public static async getReviewHistory(problemId: number): Promise<any> {
    try {
      return await api.reviews.getReviewHistory(problemId);
    } catch (error) {
      console.warn('Failed to get review history:', error);
      return null;
    }
  }

  /**
   * Calculate custom review date
   */
  public static calculateCustomReviewDate(
    baseDate: Date,
    customIntervalDays: number,
    stage?: number
  ): ReviewScheduleResult {
    return ReviewScheduler.calculateCustomReviewDate(baseDate, customIntervalDays, stage);
  }

  /**
   * Get review statistics and analytics
   */
  public static async getReviewStatistics(): Promise<ReviewStatistics> {
    try {
      // This would typically call a dedicated statistics endpoint
      // For now, we'll calculate basic stats from available data
      const dueToday = await this.getDailyReviewQueue();
      const recoveryStats = await IntensiveRecoveryManager.getRecoveryStatistics();

      const totalProblemsInRotation = dueToday.length + recoveryStats.totalActiveProblems;
      const problemsDueToday = dueToday.filter(p => p.daysOverdue >= 0).length;
      const overdueProblems = dueToday.filter(p => p.daysOverdue > 0).length;
      const intensiveRecoveryProblems = recoveryStats.totalActiveProblems;

      return {
        totalProblemsInRotation,
        problemsDueToday,
        overdueProblems,
        intensiveRecoveryProblems,
        reviewStreak: 0, // Would need to calculate from review history
        weeklyCompletionRate: 0, // Would need to calculate from review history
        monthlyCompletionRate: 0, // Would need to calculate from review history
        forgettingRateByStage: {}, // Would need to calculate from review history
        averageRecoveryTime: recoveryStats.totalRecoveryDays / Math.max(1, recoveryStats.totalActiveProblems)
      };
    } catch (error) {
      console.warn('Failed to get review statistics:', error);
      return {
        totalProblemsInRotation: 0,
        problemsDueToday: 0,
        overdueProblems: 0,
        intensiveRecoveryProblems: 0,
        reviewStreak: 0,
        weeklyCompletionRate: 0,
        monthlyCompletionRate: 0,
        forgettingRateByStage: {},
        averageRecoveryTime: 0
      };
    }
  }

  /**
   * Check if a problem is in intensive recovery
   */
  public static async isInIntensiveRecovery(problemId: number): Promise<boolean> {
    return await IntensiveRecoveryManager.isInIntensiveRecovery(problemId);
  }

  /**
   * Get next review date for a problem
   */
  public static async getNextReviewDate(problemId: number): Promise<Date | null> {
    try {
      // Check if in intensive recovery first
      const intensiveDate = await IntensiveRecoveryManager.getNextIntensiveReviewDate(problemId);
      if (intensiveDate) {
        return intensiveDate;
      }

      // Otherwise get from review history
      const history = await this.getReviewHistory(problemId);
      if (history && history.next_review_date) {
        return new Date(history.next_review_date);
      }

      return null;
    } catch (error) {
      console.warn('Failed to get next review date:', error);
      return null;
    }
  }

  /**
   * Handle a forgetting event
   */
  private static async handleForgettingEvent(action: ReviewAction): Promise<ReviewResult> {
    // Check if already in intensive recovery
    const isInRecovery = await IntensiveRecoveryManager.isInIntensiveRecovery(action.problemId);

    if (isInRecovery) {
      // Process as intensive recovery failure
      const intensiveResult = await IntensiveRecoveryManager.processIntensiveReview(
        action.problemId,
        'forgot',
        action.confusionNotes,
        action.timeSpent
      );

      return {
        success: true,
        nextReviewDate: intensiveResult.cycleStatus.nextReviewDate,
        message: intensiveResult.cycleStatus.status,
        intensiveRecovery: true,
        cycleStatus: intensiveResult.cycleStatus
      };
    } else {
      // Handle as new forgetting event
      const forgettingData: ForgettingEventData = {
        problemId: action.problemId,
        forgottenStage: 1, // Would need to get current stage from review history
        timeSpent: action.timeSpent,
        confusionNotes: action.confusionNotes,
        specificMistakes: action.specificMistakes
      };

      const recoveryPlan = await ForgettingRecoveryEngine.handleForgettingEvent(forgettingData);

      // Create intensive recovery cycle
      await IntensiveRecoveryManager.createRecoveryCycle(
        action.problemId,
        recoveryPlan.intensiveReviewsNeeded,
        1 // Daily cycles
      );

      return {
        success: true,
        nextReviewDate: recoveryPlan.nextReviewDate,
        message: recoveryPlan.recoveryPlan,
        intensiveRecovery: true,
        recoveryPlan
      };
    }
  }

  /**
   * Handle a remembered event
   */
  private static async handleRememberedEvent(action: ReviewAction): Promise<ReviewResult> {
    // Check if in intensive recovery
    const isInRecovery = await IntensiveRecoveryManager.isInIntensiveRecovery(action.problemId);

    if (isInRecovery) {
      // Process as intensive recovery success
      const intensiveResult = await IntensiveRecoveryManager.processIntensiveReview(
        action.problemId,
        'remembered',
        action.confusionNotes,
        action.timeSpent
      );

      return {
        success: true,
        nextReviewDate: intensiveResult.cycleStatus.nextReviewDate,
        message: intensiveResult.cycleStatus.status,
        intensiveRecovery: intensiveResult.cycleStatus.cyclesRemaining > 0,
        cycleStatus: intensiveResult.cycleStatus
      };
    } else {
      // Handle as normal spaced repetition progression
      const currentStage = 1; // Would need to get from review history
      const options: CustomReviewOptions | undefined = action.customNextDate 
        ? { customDate: action.customNextDate }
        : undefined;

      const scheduleResult = ReviewScheduler.calculateNextReviewDate(
        currentStage,
        'remembered',
        options
      );

      // Submit to API
      await api.reviews.submitReview({
        problem_id: action.problemId,
        result: 'remembered',
        time_spent: action.timeSpent,
        notes: action.confusionNotes
      });

      return {
        success: true,
        nextReviewDate: scheduleResult.nextReviewDate,
        message: scheduleResult.message,
        intensiveRecovery: false
      };
    }
  }

  /**
   * Validate review action input
   */
  private static validateReviewAction(action: ReviewAction): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!action.problemId || action.problemId <= 0) {
      errors.push('Valid problem ID is required');
    }

    if (!['remembered', 'forgot'].includes(action.result)) {
      errors.push('Result must be either "remembered" or "forgot"');
    }

    if (action.timeSpent !== undefined && (action.timeSpent < 0 || action.timeSpent > 300)) {
      errors.push('Time spent must be between 0 and 300 minutes');
    }

    if (action.customNextDate && action.customNextDate <= new Date()) {
      errors.push('Custom next date must be in the future');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get recommended study time for a review
   */
  public static getRecommendedStudyTime(
    reviewType: 'NORMAL_REVIEW' | 'INTENSIVE_RECOVERY',
    priority: number,
    timesForotten: number
  ): number {
    if (reviewType === 'INTENSIVE_RECOVERY') {
      return IntensiveRecoveryManager.getRecommendedStudyTime(timesForotten, priority);
    }

    // Normal review recommendations
    const baseTime = 10; // minutes
    const priorityMultiplier = (6 - priority) * 0.5; // Higher priority = more time
    const forgettingMultiplier = Math.min(timesForotten * 0.3, 1.5); // Cap at 1.5x

    return Math.round(baseTime * (1 + priorityMultiplier + forgettingMultiplier));
  }

  /**
   * Get study recommendations for a problem
   */
  public static getStudyRecommendations(
    timesForotten: number,
    currentStage: number,
    specificMistakes?: string[]
  ): string[] {
    return ForgettingRecoveryEngine.getStudyRecommendations(
      timesForotten,
      currentStage,
      specificMistakes
    );
  }
}