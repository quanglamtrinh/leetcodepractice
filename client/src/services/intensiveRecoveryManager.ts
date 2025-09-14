// Intensive Recovery Manager - Manages daily practice cycles for forgotten problems
import { api } from './api';

export interface IntensiveRecoveryCycle {
  id: number;
  problemId: number;
  cyclesRemaining: number;
  cycleIntervalDays: number;
  startedDate: Date;
  completedDate?: Date;
}

export interface CycleStatus {
  status: string;
  cyclesRemaining: number;
  nextReviewDate: Date;
  graduationStatus: string;
  daysUntilNormalCycle: number;
}

export interface IntensiveReviewResult {
  problemId: number;
  result: 'remembered' | 'forgot';
  timeSpent?: number;
  notes?: string;
  cycleStatus: CycleStatus;
}

export interface RecoveryProgress {
  totalCycles: number;
  completedCycles: number;
  remainingCycles: number;
  progressPercentage: number;
  estimatedCompletionDate: Date;
  isOnTrack: boolean;
}

export class IntensiveRecoveryManager {
  /**
   * Process an intensive review result
   */
  public static async processIntensiveReview(
    problemId: number,
    result: 'remembered' | 'forgot',
    notes?: string,
    timeSpent?: number
  ): Promise<IntensiveReviewResult> {
    try {
      // Call the database function to process intensive review
      const response = await api.request<{
        status: string;
        cycles_remaining: number;
        next_review_date: string;
        graduation_status: string;
        days_until_normal_cycle: number;
      }>('/api/reviews/intensive-cycle', {
        method: 'POST',
        body: JSON.stringify({
          problem_id: problemId,
          result,
          notes,
          time_spent: timeSpent
        })
      });

      const cycleStatus: CycleStatus = {
        status: response.status,
        cyclesRemaining: response.cycles_remaining,
        nextReviewDate: new Date(response.next_review_date),
        graduationStatus: response.graduation_status,
        daysUntilNormalCycle: response.days_until_normal_cycle
      };

      return {
        problemId,
        result,
        timeSpent,
        notes,
        cycleStatus
      };
    } catch (error) {
      // Fallback to local calculation if API fails
      console.warn('API call failed, using local calculation:', error);
      return this.calculateLocalCycleStatus(problemId, result, notes, timeSpent);
    }
  }

  /**
   * Get active intensive recovery cycles for a user
   */
  public static async getActiveRecoveryCycles(): Promise<IntensiveRecoveryCycle[]> {
    try {
      const response = await api.request<IntensiveRecoveryCycle[]>('/api/reviews/active-cycles');
      
      return response.map(cycle => ({
        ...cycle,
        startedDate: new Date(cycle.startedDate),
        completedDate: cycle.completedDate ? new Date(cycle.completedDate) : undefined
      }));
    } catch (error) {
      console.warn('Failed to fetch active recovery cycles:', error);
      return [];
    }
  }

  /**
   * Get recovery progress for a specific problem
   */
  public static async getRecoveryProgress(problemId: number): Promise<RecoveryProgress | null> {
    try {
      const cycles = await this.getActiveRecoveryCycles();
      const problemCycle = cycles.find(c => c.problemId === problemId);
      
      if (!problemCycle) {
        return null;
      }

      return this.calculateRecoveryProgress(problemCycle);
    } catch (error) {
      console.warn('Failed to get recovery progress:', error);
      return null;
    }
  }

  /**
   * Create a new intensive recovery cycle (or update existing one)
   */
  public static async createRecoveryCycle(
    problemId: number,
    intensiveReviewCount: number,
    cycleIntervalDays: number = 1
  ): Promise<IntensiveRecoveryCycle> {
    try {
      // Check if there's already an active cycle
      const existingCycles = await this.getActiveRecoveryCycles();
      const existingCycle = existingCycles.find(c => c.problemId === problemId);

      if (existingCycle) {
        console.log(`Updating existing recovery cycle for problem ${problemId}`);
      } else {
        console.log(`Creating new recovery cycle for problem ${problemId}`);
      }

      const response = await api.request<IntensiveRecoveryCycle>('/api/reviews/create-cycle', {
        method: 'POST',
        body: JSON.stringify({
          problem_id: problemId,
          cycles_remaining: intensiveReviewCount,
          cycle_interval_days: cycleIntervalDays
        })
      });

      return {
        ...response,
        startedDate: new Date(response.startedDate),
        completedDate: response.completedDate ? new Date(response.completedDate) : undefined
      };
    } catch (error) {
      console.warn('Failed to create recovery cycle:', error);
      throw new Error('Failed to create intensive recovery cycle');
    }
  }

  /**
   * Complete a recovery cycle (graduate to normal schedule)
   */
  public static async completeRecoveryCycle(problemId: number): Promise<CycleStatus> {
    try {
      const response = await api.request<{
        status: string;
        cycles_remaining: number;
        next_review_date: string;
        graduation_status: string;
        days_until_normal_cycle: number;
      }>('/api/reviews/complete-cycle', {
        method: 'POST',
        body: JSON.stringify({ problem_id: problemId })
      });

      return {
        status: response.status,
        cyclesRemaining: response.cycles_remaining,
        nextReviewDate: new Date(response.next_review_date),
        graduationStatus: response.graduation_status,
        daysUntilNormalCycle: response.days_until_normal_cycle
      };
    } catch (error) {
      console.warn('Failed to complete recovery cycle:', error);
      throw new Error('Failed to complete recovery cycle');
    }
  }

  /**
   * Get intensive recovery statistics
   */
  public static async getRecoveryStatistics(): Promise<{
    totalActiveProblems: number;
    averageCyclesRemaining: number;
    problemsNearGraduation: number;
    totalRecoveryDays: number;
  }> {
    try {
      const cycles = await this.getActiveRecoveryCycles();
      
      const totalActiveProblems = cycles.length;
      const averageCyclesRemaining = cycles.length > 0 
        ? cycles.reduce((sum, c) => sum + c.cyclesRemaining, 0) / cycles.length 
        : 0;
      const problemsNearGraduation = cycles.filter(c => c.cyclesRemaining <= 1).length;
      const totalRecoveryDays = cycles.reduce((sum, c) => {
        const daysSinceStart = Math.floor(
          (new Date().getTime() - c.startedDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        return sum + daysSinceStart;
      }, 0);

      return {
        totalActiveProblems,
        averageCyclesRemaining: Math.round(averageCyclesRemaining * 10) / 10,
        problemsNearGraduation,
        totalRecoveryDays
      };
    } catch (error) {
      console.warn('Failed to get recovery statistics:', error);
      return {
        totalActiveProblems: 0,
        averageCyclesRemaining: 0,
        problemsNearGraduation: 0,
        totalRecoveryDays: 0
      };
    }
  }

  /**
   * Check if a problem is in intensive recovery
   */
  public static async isInIntensiveRecovery(problemId: number): Promise<boolean> {
    try {
      const cycles = await this.getActiveRecoveryCycles();
      return cycles.some(c => c.problemId === problemId && !c.completedDate);
    } catch (error) {
      console.warn('Failed to check intensive recovery status:', error);
      return false;
    }
  }

  /**
   * Get next intensive review date for a problem
   */
  public static async getNextIntensiveReviewDate(problemId: number): Promise<Date | null> {
    try {
      const cycles = await this.getActiveRecoveryCycles();
      const problemCycle = cycles.find(c => c.problemId === problemId && !c.completedDate);
      
      if (!problemCycle) {
        return null;
      }

      // Calculate next review date based on cycle interval
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + problemCycle.cycleIntervalDays);
      return nextDate;
    } catch (error) {
      console.warn('Failed to get next intensive review date:', error);
      return null;
    }
  }

  /**
   * Calculate recovery progress for a cycle
   */
  private static calculateRecoveryProgress(cycle: IntensiveRecoveryCycle): RecoveryProgress {
    // Estimate total cycles based on current remaining and days elapsed
    const daysSinceStart = Math.floor(
      (new Date().getTime() - cycle.startedDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    // Estimate total cycles (this is approximate since we don't store the original count)
    const estimatedTotalCycles = cycle.cyclesRemaining + Math.max(1, daysSinceStart);
    const completedCycles = estimatedTotalCycles - cycle.cyclesRemaining;
    const progressPercentage = (completedCycles / estimatedTotalCycles) * 100;

    // Estimate completion date
    const estimatedCompletionDate = new Date();
    estimatedCompletionDate.setDate(
      estimatedCompletionDate.getDate() + (cycle.cyclesRemaining * cycle.cycleIntervalDays)
    );

    // Check if on track (completing cycles at expected rate)
    const expectedCompletedCycles = daysSinceStart / cycle.cycleIntervalDays;
    const isOnTrack = completedCycles >= expectedCompletedCycles * 0.8; // 80% tolerance

    return {
      totalCycles: estimatedTotalCycles,
      completedCycles,
      remainingCycles: cycle.cyclesRemaining,
      progressPercentage: Math.round(progressPercentage),
      estimatedCompletionDate,
      isOnTrack
    };
  }

  /**
   * Local fallback calculation when API is unavailable
   */
  private static calculateLocalCycleStatus(
    problemId: number,
    result: 'remembered' | 'forgot',
    notes?: string,
    timeSpent?: number
  ): IntensiveReviewResult {
    // Simulate cycle status (would normally come from database)
    const mockCycleStatus: CycleStatus = {
      status: result === 'remembered' 
        ? 'Intensive cycle continues - estimated cycles remaining' 
        : 'FAILED intensive review - cycle restarted (offline mode)',
      cyclesRemaining: result === 'remembered' ? 2 : 3, // Conservative estimates
      nextReviewDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      graduationStatus: result === 'remembered' ? 'Still in recovery mode' : 'Extended recovery needed',
      daysUntilNormalCycle: result === 'remembered' ? 2 : 3
    };

    return {
      problemId,
      result,
      timeSpent,
      notes,
      cycleStatus: mockCycleStatus
    };
  }

  /**
   * Validate intensive review input
   */
  public static validateIntensiveReviewInput(
    problemId: number,
    result: 'remembered' | 'forgot',
    timeSpent?: number
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!problemId || problemId <= 0) {
      errors.push('Valid problem ID is required');
    }

    if (!['remembered', 'forgot'].includes(result)) {
      errors.push('Result must be either "remembered" or "forgot"');
    }

    if (timeSpent !== undefined && (timeSpent < 0 || timeSpent > 300)) {
      errors.push('Time spent must be between 0 and 300 minutes');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get recommended study time for intensive recovery
   */
  public static getRecommendedStudyTime(cyclesRemaining: number, urgencyLevel: number): number {
    // Base time in minutes
    let baseTime = 15;

    // Adjust based on cycles remaining
    if (cyclesRemaining >= 5) {
      baseTime = 30; // More intensive for many cycles
    } else if (cyclesRemaining >= 3) {
      baseTime = 20;
    }

    // Adjust based on urgency
    const urgencyMultiplier = urgencyLevel / 3; // Scale 1-5 to ~0.33-1.67
    
    return Math.round(baseTime * urgencyMultiplier);
  }
}