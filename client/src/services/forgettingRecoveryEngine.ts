// Forgetting Recovery Engine - Analyzes forgetting patterns and creates recovery plans
import { api } from './api';

export interface ForgettingPattern {
  stageForgotten: number;
  timesForotten: number;
  resetIntervalDays: number;
  intensiveReviewCount: number;
  recoveryNotes: string;
}

export interface RecoveryPlan {
  recoveryPlan: string;
  nextReviewDate: Date;
  intensiveReviewsNeeded: number;
  studyRecommendations: string[];
  urgencyLevel: 1 | 2 | 3 | 4 | 5;
  estimatedRecoveryDays: number;
}

export interface ForgettingEventData {
  problemId: number;
  forgottenStage: number;
  timeSpent?: number;
  confusionNotes?: string;
  specificMistakes?: string[];
}

export interface ForgettingAnalysis {
  forgettingFrequency: number;
  problematicStages: number[];
  recoveryEffectiveness: number;
  recommendedAction: 'continue' | 'intensive' | 'reset' | 'seek_help';
}

export class ForgettingRecoveryEngine {
  // Predefined forgetting patterns based on research
  private static readonly FORGETTING_PATTERNS: ForgettingPattern[] = [
    // First time forgetting at different stages
    { stageForgotten: 1, timesForotten: 1, resetIntervalDays: 1, intensiveReviewCount: 2, recoveryNotes: 'Forgot at 1-day mark: Pattern not consolidated - restart with 2 daily intensive reviews' },
    { stageForgotten: 2, timesForotten: 1, resetIntervalDays: 1, intensiveReviewCount: 3, recoveryNotes: 'Forgot at 3-day critical cliff: Memory pathway weak - needs 3 daily intensive reviews' },
    { stageForgotten: 3, timesForotten: 1, resetIntervalDays: 2, intensiveReviewCount: 2, recoveryNotes: 'Forgot at 7-day mark: Interference likely - moderate reset with 2 intensive reviews' },
    { stageForgotten: 4, timesForotten: 1, resetIntervalDays: 3, intensiveReviewCount: 2, recoveryNotes: 'Forgot at 14-day mark: Pattern confusion - 3-day reset with reinforcement' },
    { stageForgotten: 5, timesForotten: 1, resetIntervalDays: 7, intensiveReviewCount: 1, recoveryNotes: 'Forgot at 30-day mark: Long-term memory issue - weekly reset' },
    { stageForgotten: 6, timesForotten: 1, resetIntervalDays: 14, intensiveReviewCount: 1, recoveryNotes: 'Forgot at 60+ day mark: Deep pattern forgotten - bi-weekly reset' },
    
    // Second time forgetting (more concerning)
    { stageForgotten: 1, timesForotten: 2, resetIntervalDays: 1, intensiveReviewCount: 4, recoveryNotes: 'Second 1-day failure: Serious consolidation problem - 4 daily intensive reviews needed' },
    { stageForgotten: 2, timesForotten: 2, resetIntervalDays: 1, intensiveReviewCount: 5, recoveryNotes: 'Second 3-day failure: Major memory pathway issue - 5 daily intensive cycles' },
    { stageForgotten: 3, timesForotten: 2, resetIntervalDays: 2, intensiveReviewCount: 3, recoveryNotes: 'Second 7-day failure: Pattern interference - extended intensive period' },
    { stageForgotten: 4, timesForotten: 2, resetIntervalDays: 3, intensiveReviewCount: 3, recoveryNotes: 'Second 14-day failure: Conceptual confusion - daily reviews for 3 days' },
    
    // Third+ time forgetting (critical intervention needed)
    { stageForgotten: 1, timesForotten: 3, resetIntervalDays: 1, intensiveReviewCount: 6, recoveryNotes: 'Third+ 1-day failure: CRITICAL - needs pattern re-learning with 6 daily intensive reviews' },
    { stageForgotten: 2, timesForotten: 3, resetIntervalDays: 1, intensiveReviewCount: 8, recoveryNotes: 'Third+ 3-day failure: CRITICAL - complete pattern breakdown, 8 daily intensive cycles' },
    { stageForgotten: 3, timesForotten: 3, resetIntervalDays: 1, intensiveReviewCount: 5, recoveryNotes: 'Third+ 7-day failure: CRITICAL - fundamental pattern confusion, daily practice needed' },
    { stageForgotten: 4, timesForotten: 3, resetIntervalDays: 2, intensiveReviewCount: 4, recoveryNotes: 'Third+ 14-day failure: CRITICAL - needs structured daily pattern study' }
  ];

  /**
   * Handle a forgetting event and create a recovery plan
   */
  public static async handleForgettingEvent(eventData: ForgettingEventData): Promise<RecoveryPlan> {
    try {
      // Call the database function to handle forgetting event
      const response = await api.request<{
        recovery_plan: string;
        next_review_date: string;
        intensive_reviews_needed: number;
        study_recommendations: string[];
        urgency_level: number;
        estimated_recovery_days: number;
      }>('/api/reviews/handle-forgetting', {
        method: 'POST',
        body: JSON.stringify({
          problem_id: eventData.problemId,
          forgotten_stage: eventData.forgottenStage,
          time_spent: eventData.timeSpent,
          confusion_notes: eventData.confusionNotes,
          specific_mistakes: eventData.specificMistakes
        })
      });

      return {
        recoveryPlan: response.recovery_plan,
        nextReviewDate: new Date(response.next_review_date),
        intensiveReviewsNeeded: response.intensive_reviews_needed,
        studyRecommendations: response.study_recommendations,
        urgencyLevel: response.urgency_level as 1 | 2 | 3 | 4 | 5,
        estimatedRecoveryDays: response.estimated_recovery_days
      };
    } catch (error) {
      // Fallback to local calculation if API fails
      console.warn('API call failed, using local calculation:', error);
      return this.calculateLocalRecoveryPlan(eventData);
    }
  }

  /**
   * Analyze forgetting patterns for a problem
   */
  public static analyzeForgettingPatterns(
    forgettingHistory: Array<{ stage: number; date: Date; result: 'remembered' | 'forgot' }>
  ): ForgettingAnalysis {
    const forgettingEvents = forgettingHistory.filter(h => h.result === 'forgot');
    const totalReviews = forgettingHistory.length;
    
    // Calculate forgetting frequency (last 90 days)
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 90);
    const recentForgetting = forgettingEvents.filter(e => e.date >= recentDate);
    
    // Identify problematic stages
    const stageFrequency: Record<number, number> = {};
    forgettingEvents.forEach(event => {
      stageFrequency[event.stage] = (stageFrequency[event.stage] || 0) + 1;
    });
    
    const problematicStages = Object.entries(stageFrequency)
      .filter(([_, count]) => count >= 2)
      .map(([stage, _]) => parseInt(stage))
      .sort((a, b) => stageFrequency[b] - stageFrequency[a]);

    // Calculate recovery effectiveness
    let recoveryEffectiveness = 0;
    if (totalReviews > 0) {
      const successfulReviews = forgettingHistory.filter(h => h.result === 'remembered').length;
      recoveryEffectiveness = (successfulReviews / totalReviews) * 100;
    }

    // Recommend action based on analysis
    let recommendedAction: 'continue' | 'intensive' | 'reset' | 'seek_help' = 'continue';
    
    if (recentForgetting.length >= 3) {
      recommendedAction = 'seek_help';
    } else if (recentForgetting.length >= 2 || problematicStages.length >= 2) {
      recommendedAction = 'intensive';
    } else if (recoveryEffectiveness < 50 && totalReviews >= 5) {
      recommendedAction = 'reset';
    }

    return {
      forgettingFrequency: recentForgetting.length,
      problematicStages,
      recoveryEffectiveness,
      recommendedAction
    };
  }

  /**
   * Get study recommendations based on forgetting frequency
   */
  public static getStudyRecommendations(
    forgettingCount: number,
    stage: number,
    specificMistakes?: string[]
  ): string[] {
    const baseRecommendations = this.getBaseRecommendations(forgettingCount);
    const stageSpecificRecommendations = this.getStageSpecificRecommendations(stage);
    const mistakeSpecificRecommendations = this.getMistakeSpecificRecommendations(specificMistakes);

    return [
      ...baseRecommendations,
      ...stageSpecificRecommendations,
      ...mistakeSpecificRecommendations
    ];
  }

  /**
   * Calculate urgency level based on forgetting pattern
   */
  public static calculateUrgencyLevel(forgettingCount: number, stage: number): 1 | 2 | 3 | 4 | 5 {
    if (forgettingCount >= 3) return 5; // Critical
    if (forgettingCount >= 2) return 4; // High
    if (stage <= 2) return 4; // High (early stage forgetting is concerning)
    if (stage <= 4) return 3; // Medium
    return 2; // Low
  }

  /**
   * Estimate recovery time based on forgetting pattern
   */
  public static estimateRecoveryTime(
    intensiveReviewCount: number,
    resetIntervalDays: number,
    forgettingCount: number
  ): number {
    const baseRecoveryDays = intensiveReviewCount * resetIntervalDays;
    const complexityMultiplier = Math.min(forgettingCount * 0.5, 2); // Cap at 2x
    return Math.ceil(baseRecoveryDays * (1 + complexityMultiplier));
  }

  /**
   * Find matching forgetting pattern
   */
  private static findForgettingPattern(stage: number, forgettingCount: number): ForgettingPattern {
    // Cap forgetting count at 3 for pattern matching
    const cappedCount = Math.min(forgettingCount, 3);
    
    // Find exact match
    let pattern = this.FORGETTING_PATTERNS.find(
      p => p.stageForgotten === stage && p.timesForotten === cappedCount
    );

    // Fallback to closest stage if no exact match
    if (!pattern) {
      pattern = this.FORGETTING_PATTERNS.find(
        p => p.timesForotten === cappedCount
      );
    }

    // Ultimate fallback
    if (!pattern) {
      pattern = this.FORGETTING_PATTERNS[0];
    }

    return pattern;
  }

  /**
   * Local fallback calculation when API is unavailable
   */
  private static calculateLocalRecoveryPlan(eventData: ForgettingEventData): RecoveryPlan {
    // Simulate forgetting count (would normally come from database)
    const estimatedForgettingCount = 1; // Conservative estimate
    
    const pattern = this.findForgettingPattern(eventData.forgottenStage, estimatedForgettingCount);
    const urgencyLevel = this.calculateUrgencyLevel(estimatedForgettingCount, eventData.forgottenStage);
    const studyRecommendations = this.getStudyRecommendations(
      estimatedForgettingCount,
      eventData.forgottenStage,
      eventData.specificMistakes
    );

    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + pattern.resetIntervalDays);

    const estimatedRecoveryDays = this.estimateRecoveryTime(
      pattern.intensiveReviewCount,
      pattern.resetIntervalDays,
      estimatedForgettingCount
    );

    return {
      recoveryPlan: `${pattern.recoveryNotes} (Offline mode - limited analysis)`,
      nextReviewDate,
      intensiveReviewsNeeded: pattern.intensiveReviewCount,
      studyRecommendations,
      urgencyLevel,
      estimatedRecoveryDays
    };
  }

  /**
   * Get base recommendations based on forgetting frequency
   */
  private static getBaseRecommendations(forgettingCount: number): string[] {
    switch (forgettingCount) {
      case 1:
        return [
          'Review the base pattern theory today',
          'Write out the algorithm step-by-step',
          'Practice 1-2 similar problems',
          'Focus on the key insight you missed'
        ];
      case 2:
        return [
          'STUDY THE PATTERN FUNDAMENTALS TODAY',
          'Watch video explanation of the pattern',
          'Code the pattern template from memory',
          'Practice 3-4 similar problems this week',
          'Identify what specific part confuses you'
        ];
      default:
        return [
          'CRITICAL: COMPLETE PATTERN RE-LEARNING NEEDED',
          'Schedule focused study session (45+ minutes today)',
          'Start with easiest problems in this pattern',
          'Create your own pattern template/cheatsheet',
          'Practice 5+ similar problems over next week',
          'Consider getting additional learning resources'
        ];
    }
  }

  /**
   * Get stage-specific recommendations
   */
  private static getStageSpecificRecommendations(stage: number): string[] {
    if (stage <= 2) {
      return [
        'Focus on pattern recognition - the basic concept is not solid',
        'Practice the pattern on paper before coding',
        'Review similar problems you\'ve solved successfully'
      ];
    } else if (stage <= 4) {
      return [
        'Check for pattern interference with similar concepts',
        'Create a comparison chart with related patterns',
        'Practice edge cases and variations'
      ];
    } else {
      return [
        'Review the problem from first principles',
        'Check if the pattern has evolved or you learned new approaches',
        'Consider if this is still the optimal solution method'
      ];
    }
  }

  /**
   * Get recommendations based on specific mistakes
   */
  private static getMistakeSpecificRecommendations(mistakes?: string[]): string[] {
    if (!mistakes || mistakes.length === 0) {
      return [];
    }

    const recommendations: string[] = [];
    
    mistakes.forEach(mistake => {
      const lowerMistake = mistake.toLowerCase();
      
      if (lowerMistake.includes('edge case') || lowerMistake.includes('boundary')) {
        recommendations.push('Practice edge cases: empty arrays, single elements, duplicates');
      }
      
      if (lowerMistake.includes('time') || lowerMistake.includes('complexity')) {
        recommendations.push('Review time complexity analysis and optimization techniques');
      }
      
      if (lowerMistake.includes('logic') || lowerMistake.includes('algorithm')) {
        recommendations.push('Trace through the algorithm step-by-step with examples');
      }
      
      if (lowerMistake.includes('syntax') || lowerMistake.includes('implementation')) {
        recommendations.push('Practice coding the pattern template until it\'s automatic');
      }
    });

    return recommendations;
  }
}