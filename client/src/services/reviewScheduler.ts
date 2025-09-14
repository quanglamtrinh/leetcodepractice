// Review Scheduler Service - Manages spaced repetition schedule progression
import { api } from './api';

export interface ReviewStage {
  stage: number;
  intervalDays: number;
  description: string;
}

export interface ReviewScheduleResult {
  nextReviewDate: Date;
  reviewStage: number;
  intervalDays: number;
  message: string;
}

export interface CustomReviewOptions {
  customDate?: Date;
  skipStageProgression?: boolean;
  resetToStage?: number;
}

export class ReviewScheduler {
  // Standard spaced repetition intervals (1→3→7→14→30→60→120→240 days)
  private static readonly STANDARD_INTERVALS: ReviewStage[] = [
    { stage: 1, intervalDays: 1, description: 'Next day - Initial consolidation' },
    { stage: 2, intervalDays: 3, description: 'Day 3 - Critical memory cliff' },
    { stage: 3, intervalDays: 7, description: 'Week 1 - Short-term retention test' },
    { stage: 4, intervalDays: 14, description: 'Week 2 - Medium-term retention' },
    { stage: 5, intervalDays: 30, description: 'Month 1 - Long-term memory formation' },
    { stage: 6, intervalDays: 60, description: 'Month 2 - Deep long-term retention' },
    { stage: 7, intervalDays: 120, description: 'Month 4 - Permanent memory test' },
    { stage: 8, intervalDays: 240, description: 'Month 8 - Master level retention' }
  ];

  /**
   * Calculate the next review date based on current stage and result
   */
  public static calculateNextReviewDate(
    currentStage: number, 
    result: 'remembered' | 'forgot',
    options?: CustomReviewOptions
  ): ReviewScheduleResult {
    // Handle custom date override
    if (options?.customDate) {
      return {
        nextReviewDate: options.customDate,
        reviewStage: options.resetToStage || currentStage,
        intervalDays: this.calculateDaysFromNow(options.customDate),
        message: `Custom review date set for ${options.customDate.toDateString()}`
      };
    }

    // Handle stage reset
    if (options?.resetToStage) {
      const targetStage = Math.max(1, Math.min(options.resetToStage, this.STANDARD_INTERVALS.length));
      const interval = this.getStandardInterval(targetStage);
      const nextDate = this.addDaysToDate(new Date(), interval.intervalDays);
      
      return {
        nextReviewDate: nextDate,
        reviewStage: targetStage,
        intervalDays: interval.intervalDays,
        message: `Reset to stage ${targetStage} (${interval.description})`
      };
    }

    if (result === 'forgot') {
      // Forgetting is handled by ForgettingRecoveryEngine
      // This method should not be called directly for forgetting events
      throw new Error('Forgetting events should be handled by ForgettingRecoveryEngine');
    }

    // Normal progression for 'remembered' result
    const nextStage = options?.skipStageProgression ? currentStage : Math.min(currentStage + 1, this.STANDARD_INTERVALS.length);
    const interval = this.getStandardInterval(nextStage);
    const nextDate = this.addDaysToDate(new Date(), interval.intervalDays);

    return {
      nextReviewDate: nextDate,
      reviewStage: nextStage,
      intervalDays: interval.intervalDays,
      message: `Advanced to stage ${nextStage} - next review in ${interval.intervalDays} days`
    };
  }

  /**
   * Get the standard interval for a given stage
   */
  public static getStandardInterval(stage: number): ReviewStage {
    const clampedStage = Math.max(1, Math.min(stage, this.STANDARD_INTERVALS.length));
    return this.STANDARD_INTERVALS[clampedStage - 1];
  }

  /**
   * Get all standard intervals
   */
  public static getStandardIntervals(): ReviewStage[] {
    return [...this.STANDARD_INTERVALS];
  }

  /**
   * Schedule initial review for a newly solved problem
   */
  public static async scheduleInitialReview(problemId: number): Promise<ReviewScheduleResult> {
    try {
      // Call the database function to schedule initial review
      const response = await api.request<{
        scheduled_date: string;
        review_stage: number;
        message: string;
      }>('/api/reviews/schedule-initial', {
        method: 'POST',
        body: JSON.stringify({ problem_id: problemId })
      });

      return {
        nextReviewDate: new Date(response.scheduled_date),
        reviewStage: response.review_stage,
        intervalDays: 1, // Initial review is always 1 day
        message: response.message
      };
    } catch (error) {
      // Fallback to local calculation if API fails
      console.warn('API call failed, using local calculation:', error);
      
      const nextDate = this.addDaysToDate(new Date(), 1);
      return {
        nextReviewDate: nextDate,
        reviewStage: 1,
        intervalDays: 1,
        message: 'Initial review scheduled for tomorrow (offline mode)'
      };
    }
  }

  /**
   * Calculate custom review date based on user preferences
   */
  public static calculateCustomReviewDate(
    baseDate: Date,
    customIntervalDays: number,
    stage?: number
  ): ReviewScheduleResult {
    const nextDate = this.addDaysToDate(baseDate, customIntervalDays);
    const targetStage = stage || 1;

    return {
      nextReviewDate: nextDate,
      reviewStage: targetStage,
      intervalDays: customIntervalDays,
      message: `Custom interval: ${customIntervalDays} days from ${baseDate.toDateString()}`
    };
  }

  /**
   * Validate if a stage number is valid
   */
  public static isValidStage(stage: number): boolean {
    return stage >= 1 && stage <= this.STANDARD_INTERVALS.length;
  }

  /**
   * Get the maximum stage number
   */
  public static getMaxStage(): number {
    return this.STANDARD_INTERVALS.length;
  }

  /**
   * Calculate days between now and a target date
   */
  private static calculateDaysFromNow(targetDate: Date): number {
    const now = new Date();
    const diffTime = targetDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Add days to a date and return new date
   */
  private static addDaysToDate(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * Get stage progression path for display purposes
   */
  public static getProgressionPath(currentStage: number): ReviewStage[] {
    const maxStage = Math.min(currentStage + 3, this.STANDARD_INTERVALS.length);
    return this.STANDARD_INTERVALS.slice(currentStage - 1, maxStage);
  }

  /**
   * Estimate time to mastery (reaching final stage)
   */
  public static estimateTimeToMastery(currentStage: number): number {
    if (currentStage >= this.STANDARD_INTERVALS.length) {
      return 0; // Already mastered
    }

    // Sum remaining intervals
    return this.STANDARD_INTERVALS
      .slice(currentStage)
      .reduce((total, stage) => total + stage.intervalDays, 0);
  }
}