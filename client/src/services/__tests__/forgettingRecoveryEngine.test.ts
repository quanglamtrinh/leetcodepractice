// Test file for ForgettingRecoveryEngine
import { ForgettingRecoveryEngine } from '../forgettingRecoveryEngine';

// Mock the API
jest.mock('../api', () => ({
  api: {
    request: jest.fn()
  }
}));

describe('ForgettingRecoveryEngine', () => {
  describe('analyzeForgettingPatterns', () => {
    test('should analyze forgetting patterns correctly', () => {
      // Use recent dates to ensure they're within 90 days
      const now = new Date();
      const history = [
        { stage: 1, date: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000), result: 'forgot' as const },
        { stage: 2, date: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000), result: 'remembered' as const },
        { stage: 1, date: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000), result: 'forgot' as const },
        { stage: 3, date: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000), result: 'remembered' as const },
        { stage: 1, date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), result: 'forgot' as const }
      ];

      const analysis = ForgettingRecoveryEngine.analyzeForgettingPatterns(history);

      expect(analysis.forgettingFrequency).toBe(3); // All within 90 days
      expect(analysis.problematicStages).toContain(1); // Stage 1 forgotten 3 times
      expect(analysis.recoveryEffectiveness).toBe(40); // 2/5 = 40%
      expect(analysis.recommendedAction).toBe('seek_help'); // 3+ recent forgetting events
    });

    test('should recommend intensive for moderate forgetting', () => {
      const now = new Date();
      const history = [
        { stage: 1, date: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000), result: 'forgot' as const },
        { stage: 2, date: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000), result: 'remembered' as const },
        { stage: 2, date: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000), result: 'forgot' as const },
        { stage: 3, date: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000), result: 'remembered' as const }
      ];

      const analysis = ForgettingRecoveryEngine.analyzeForgettingPatterns(history);

      expect(analysis.forgettingFrequency).toBe(2);
      expect(analysis.recommendedAction).toBe('intensive');
    });

    test('should recommend continue for good performance', () => {
      const history = [
        { stage: 1, date: new Date('2024-01-01'), result: 'remembered' as const },
        { stage: 2, date: new Date('2024-01-05'), result: 'remembered' as const },
        { stage: 3, date: new Date('2024-01-10'), result: 'remembered' as const }
      ];

      const analysis = ForgettingRecoveryEngine.analyzeForgettingPatterns(history);

      expect(analysis.forgettingFrequency).toBe(0);
      expect(analysis.recoveryEffectiveness).toBe(100);
      expect(analysis.recommendedAction).toBe('continue');
    });
  });

  describe('getStudyRecommendations', () => {
    test('should provide appropriate recommendations for first-time forgetting', () => {
      const recommendations = ForgettingRecoveryEngine.getStudyRecommendations(1, 2);

      expect(recommendations).toContain('Review the base pattern theory today');
      expect(recommendations).toContain('Write out the algorithm step-by-step');
      expect(recommendations).toContain('Focus on pattern recognition - the basic concept is not solid');
    });

    test('should provide more intensive recommendations for repeated forgetting', () => {
      const recommendations = ForgettingRecoveryEngine.getStudyRecommendations(3, 1);

      expect(recommendations).toContain('CRITICAL: COMPLETE PATTERN RE-LEARNING NEEDED');
      expect(recommendations).toContain('Schedule focused study session (45+ minutes today)');
    });

    test('should include mistake-specific recommendations', () => {
      const recommendations = ForgettingRecoveryEngine.getStudyRecommendations(
        1, 
        2, 
        ['edge case with empty array', 'time complexity analysis']
      );

      expect(recommendations).toContain('Practice edge cases: empty arrays, single elements, duplicates');
      expect(recommendations).toContain('Review time complexity analysis and optimization techniques');
    });
  });

  describe('calculateUrgencyLevel', () => {
    test('should calculate urgency correctly', () => {
      expect(ForgettingRecoveryEngine.calculateUrgencyLevel(3, 1)).toBe(5); // Critical
      expect(ForgettingRecoveryEngine.calculateUrgencyLevel(2, 1)).toBe(4); // High
      expect(ForgettingRecoveryEngine.calculateUrgencyLevel(1, 1)).toBe(4); // High (early stage)
      expect(ForgettingRecoveryEngine.calculateUrgencyLevel(1, 3)).toBe(3); // Medium
      expect(ForgettingRecoveryEngine.calculateUrgencyLevel(1, 5)).toBe(2); // Low
    });
  });

  describe('estimateRecoveryTime', () => {
    test('should estimate recovery time with complexity multiplier', () => {
      // Base: 3 intensive reviews * 1 day = 3 days
      // Complexity: 2 forgetting events * 0.5 = 1.0 multiplier
      // Total: 3 * (1 + 1.0) = 6 days
      expect(ForgettingRecoveryEngine.estimateRecoveryTime(3, 1, 2)).toBe(6);

      // Base: 2 intensive reviews * 2 days = 4 days  
      // Complexity: 1 forgetting event * 0.5 = 0.5 multiplier
      // Total: 4 * (1 + 0.5) = 6 days
      expect(ForgettingRecoveryEngine.estimateRecoveryTime(2, 2, 1)).toBe(6);

      // Test cap at 2x multiplier
      expect(ForgettingRecoveryEngine.estimateRecoveryTime(2, 1, 10)).toBe(6); // 2 * (1 + 2) = 6
    });
  });

  describe('handleForgettingEvent', () => {
    test('should use local calculation when API fails', async () => {
      const mockApi = require('../api').api;
      mockApi.request.mockRejectedValue(new Error('API Error'));

      const eventData = {
        problemId: 1,
        forgottenStage: 2,
        timeSpent: 25,
        confusionNotes: 'Confused about the algorithm',
        specificMistakes: ['edge case handling']
      };

      const result = await ForgettingRecoveryEngine.handleForgettingEvent(eventData);

      expect(result.recoveryPlan).toContain('Offline mode - limited analysis');
      expect(result.nextReviewDate).toBeInstanceOf(Date);
      expect(result.intensiveReviewsNeeded).toBeGreaterThan(0);
      expect(result.studyRecommendations.length).toBeGreaterThanOrEqual(4); // Base + stage + mistake recommendations
      expect(result.urgencyLevel).toBeGreaterThanOrEqual(1);
      expect(result.urgencyLevel).toBeLessThanOrEqual(5);
    });
  });
});