// Test file for ReviewScheduler
import { ReviewScheduler } from '../reviewScheduler';

describe('ReviewScheduler', () => {
  describe('calculateNextReviewDate', () => {
    test('should advance to next stage when remembered', () => {
      const result = ReviewScheduler.calculateNextReviewDate(1, 'remembered');
      
      expect(result.reviewStage).toBe(2);
      expect(result.intervalDays).toBe(3);
      expect(result.message).toContain('Advanced to stage 2');
    });

    test('should throw error when trying to handle forgetting directly', () => {
      expect(() => {
        ReviewScheduler.calculateNextReviewDate(1, 'forgot');
      }).toThrow('Forgetting events should be handled by ForgettingRecoveryEngine');
    });

    test('should handle custom date override', () => {
      const customDate = new Date('2024-12-25');
      const result = ReviewScheduler.calculateNextReviewDate(1, 'remembered', {
        customDate
      });
      
      expect(result.nextReviewDate).toEqual(customDate);
      expect(result.message).toContain('Custom review date set');
    });

    test('should handle stage reset', () => {
      const result = ReviewScheduler.calculateNextReviewDate(5, 'remembered', {
        resetToStage: 2
      });
      
      expect(result.reviewStage).toBe(2);
      expect(result.intervalDays).toBe(3);
      expect(result.message).toContain('Reset to stage 2');
    });

    test('should not exceed maximum stage', () => {
      const result = ReviewScheduler.calculateNextReviewDate(8, 'remembered');
      
      expect(result.reviewStage).toBe(8); // Should stay at max stage
    });
  });

  describe('getStandardInterval', () => {
    test('should return correct intervals for each stage', () => {
      expect(ReviewScheduler.getStandardInterval(1)).toEqual({
        stage: 1,
        intervalDays: 1,
        description: 'Next day - Initial consolidation'
      });

      expect(ReviewScheduler.getStandardInterval(2)).toEqual({
        stage: 2,
        intervalDays: 3,
        description: 'Day 3 - Critical memory cliff'
      });

      expect(ReviewScheduler.getStandardInterval(8)).toEqual({
        stage: 8,
        intervalDays: 240,
        description: 'Month 8 - Master level retention'
      });
    });

    test('should clamp invalid stages', () => {
      expect(ReviewScheduler.getStandardInterval(0).stage).toBe(1);
      expect(ReviewScheduler.getStandardInterval(10).stage).toBe(8);
    });
  });

  describe('calculateCustomReviewDate', () => {
    test('should calculate custom review date correctly', () => {
      const baseDate = new Date('2024-01-01');
      const result = ReviewScheduler.calculateCustomReviewDate(baseDate, 5, 3);
      
      expect(result.nextReviewDate).toEqual(new Date('2024-01-06'));
      expect(result.reviewStage).toBe(3);
      expect(result.intervalDays).toBe(5);
    });
  });

  describe('validation methods', () => {
    test('should validate stages correctly', () => {
      expect(ReviewScheduler.isValidStage(1)).toBe(true);
      expect(ReviewScheduler.isValidStage(8)).toBe(true);
      expect(ReviewScheduler.isValidStage(0)).toBe(false);
      expect(ReviewScheduler.isValidStage(9)).toBe(false);
    });

    test('should return correct max stage', () => {
      expect(ReviewScheduler.getMaxStage()).toBe(8);
    });
  });

  describe('estimateTimeToMastery', () => {
    test('should calculate time to mastery correctly', () => {
      // From stage 1: 3+7+14+30+60+120+240 = 474 days (excluding current stage)
      expect(ReviewScheduler.estimateTimeToMastery(1)).toBe(474);
      
      // From stage 5: 60+120+240 = 420 days
      expect(ReviewScheduler.estimateTimeToMastery(5)).toBe(420);
      
      // Already mastered (stage 8 is the last stage, so no more intervals)
      expect(ReviewScheduler.estimateTimeToMastery(8)).toBe(0);
      expect(ReviewScheduler.estimateTimeToMastery(9)).toBe(0);
    });
  });

  describe('getProgressionPath', () => {
    test('should return correct progression path', () => {
      const path = ReviewScheduler.getProgressionPath(3);
      
      expect(path).toHaveLength(4); // Shows current + next 3 stages (3,4,5,6)
      expect(path[0].stage).toBe(3);
      expect(path[1].stage).toBe(4);
      expect(path[2].stage).toBe(5);
      expect(path[3].stage).toBe(6);
    });

    test('should not exceed maximum stages', () => {
      const path = ReviewScheduler.getProgressionPath(7);
      
      expect(path).toHaveLength(2); // Only stages 7 and 8
      expect(path[0].stage).toBe(7);
      expect(path[1].stage).toBe(8);
    });
  });
});