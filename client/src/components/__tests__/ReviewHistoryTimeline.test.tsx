import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ReviewHistoryTimeline from '../ReviewHistoryTimeline';
import { reviewApi } from '../../services/api';

// Mock the API
jest.mock('../../services/api', () => ({
  reviewApi: {
    getReviewHistory: jest.fn(),
  },
}));

const mockReviewApi = reviewApi as jest.Mocked<typeof reviewApi>;

const mockHistoryData = {
  success: true,
  problem_id: 1,
  total_entries: 3,
  history: [
    {
      id: 1,
      review_date: '2024-01-15T10:00:00Z',
      result: 'remembered' as const,
      review_stage: 2,
      scheduled_review_time: '2024-01-18T10:00:00Z',
      next_review_date: '2024-01-18T10:00:00Z',
      time_spent_minutes: 25,
      notes: 'Good understanding of the algorithm',
      confusion_notes: null,
      specific_mistakes: null,
      is_intensive_recovery: false,
      created_at: '2024-01-15T10:05:00Z',
    },
    {
      id: 2,
      review_date: '2024-01-12T14:30:00Z',
      result: 'forgot' as const,
      review_stage: 1,
      scheduled_review_time: '2024-01-13T14:30:00Z',
      next_review_date: '2024-01-13T14:30:00Z',
      time_spent_minutes: 45,
      notes: 'Need to review edge cases',
      confusion_notes: 'Struggled with the recursive approach',
      specific_mistakes: ['Off by one error', 'Forgot base case'],
      is_intensive_recovery: true,
      created_at: '2024-01-12T14:35:00Z',
    },
    {
      id: 3,
      review_date: '2024-01-10T09:00:00Z',
      result: 'initial' as const,
      review_stage: 1,
      scheduled_review_time: '2024-01-11T09:00:00Z',
      next_review_date: '2024-01-11T09:00:00Z',
      time_spent_minutes: null,
      notes: 'Initial solve',
      confusion_notes: null,
      specific_mistakes: null,
      is_intensive_recovery: false,
      created_at: '2024-01-10T09:00:00Z',
    },
  ],
  intensive_cycles: [
    {
      id: 1,
      problem_id: 1,
      cycles_remaining: 2,
      cycle_interval_days: 1,
      started_date: '2024-01-12',
      completed_date: undefined,
    },
  ],
  pagination: {
    limit: 50,
    offset: 0,
    has_more: false,
  },
};

describe('ReviewHistoryTimeline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    mockReviewApi.getReviewHistory.mockImplementation(() => new Promise(() => {}));
    
    render(
      <ReviewHistoryTimeline 
        problemId={1} 
        problemTitle="Two Sum" 
        problemDifficulty="Easy" 
        problemConcept="Array" 
      />
    );

    expect(screen.getByText('Loading review history...')).toBeInTheDocument();
  });

  it('renders review history timeline with data', async () => {
    mockReviewApi.getReviewHistory.mockResolvedValue(mockHistoryData);

    render(
      <ReviewHistoryTimeline 
        problemId={1} 
        problemTitle="Two Sum" 
        problemDifficulty="Easy" 
        problemConcept="Array" 
      />
    );

    await waitFor(() => {
      expect(screen.getByText('📊 Review History Timeline')).toBeInTheDocument();
    });

    // Check problem info is displayed
    expect(screen.getByText('Two Sum')).toBeInTheDocument();
    expect(screen.getByText('Easy')).toBeInTheDocument();
    expect(screen.getByText('Array')).toBeInTheDocument();

    // Check total entries count
    expect(screen.getByText('3 total reviews')).toBeInTheDocument();

    // Check active recovery cycles
    expect(screen.getByText('🔥 Active Recovery Cycles')).toBeInTheDocument();
    expect(screen.getByText('2 cycles remaining')).toBeInTheDocument();

    // Check timeline entries are displayed (use class selectors to be more specific)
    const rememberedBadge = screen.getByText((content, element) => 
      content === 'Remembered' && element?.className.includes('result-badge')
    );
    expect(rememberedBadge).toBeInTheDocument();
    
    const forgotBadge = screen.getByText((content, element) => 
      content === 'Forgot' && element?.className.includes('result-badge')
    );
    expect(forgotBadge).toBeInTheDocument();
    
    const initialBadge = screen.getByText((content, element) => 
      content === 'Initial' && element?.className.includes('result-badge')
    );
    expect(initialBadge).toBeInTheDocument();
  });

  it('handles expandable entries correctly', async () => {
    mockReviewApi.getReviewHistory.mockResolvedValue(mockHistoryData);

    render(<ReviewHistoryTimeline problemId={1} />);

    await waitFor(() => {
      expect(screen.getByText('📊 Review History Timeline')).toBeInTheDocument();
    });

    // Find and click the expand button for the first entry
    const expandButtons = screen.getAllByText('▶');
    fireEvent.click(expandButtons[0]);

    // Check that expanded details are shown
    await waitFor(() => {
      expect(screen.getByText('📝 Notes')).toBeInTheDocument();
      expect(screen.getByText('Good understanding of the algorithm')).toBeInTheDocument();
    });

    // Click again to collapse
    const collapseButton = screen.getByText('▼');
    fireEvent.click(collapseButton);

    // Notes should be hidden again
    await waitFor(() => {
      expect(screen.queryByText('📝 Notes')).not.toBeInTheDocument();
    });
  });

  it('filters timeline entries correctly', async () => {
    mockReviewApi.getReviewHistory.mockResolvedValue(mockHistoryData);

    render(<ReviewHistoryTimeline problemId={1} />);

    await waitFor(() => {
      expect(screen.getByText('📊 Review History Timeline')).toBeInTheDocument();
    });

    // Initially shows all entries
    expect(screen.getByText('Showing 3 of 3 entries')).toBeInTheDocument();

    // Filter by "Forgot" only
    const reviewTypeSelect = screen.getByDisplayValue('All Reviews');
    fireEvent.change(reviewTypeSelect, { target: { value: 'forgot' } });

    // Should now show only 1 entry
    await waitFor(() => {
      expect(screen.getByText('Showing 1 of 3 entries')).toBeInTheDocument();
    });

    // Should only show the "Forgot" result badge
    const forgotBadges = screen.getAllByText('Forgot');
    expect(forgotBadges.length).toBeGreaterThan(0);
    
    // Check that "Remembered" result badge is not visible (but option in select still exists)
    const rememberedBadge = screen.queryByText((content, element) => 
      content === 'Remembered' && element?.className.includes('result-badge')
    );
    expect(rememberedBadge).not.toBeInTheDocument();
  });

  it('displays intensive recovery badges correctly', async () => {
    mockReviewApi.getReviewHistory.mockResolvedValue(mockHistoryData);

    render(<ReviewHistoryTimeline problemId={1} />);

    await waitFor(() => {
      expect(screen.getByText('📊 Review History Timeline')).toBeInTheDocument();
    });

    // Check that intensive recovery badge is displayed (use class selector to be more specific)
    const intensiveBadges = screen.getAllByText('Intensive Recovery');
    const intensiveBadge = intensiveBadges.find(badge => badge.className.includes('intensive-badge'));
    expect(intensiveBadge).toBeInTheDocument();
  });

  it('shows detailed information in expanded view', async () => {
    mockReviewApi.getReviewHistory.mockResolvedValue(mockHistoryData);

    render(<ReviewHistoryTimeline problemId={1} />);

    await waitFor(() => {
      expect(screen.getByText('📊 Review History Timeline')).toBeInTheDocument();
    });

    // Expand the entry with confusion notes and mistakes
    const expandButtons = screen.getAllByText('▶');
    fireEvent.click(expandButtons[1]); // Second entry has confusion notes

    await waitFor(() => {
      expect(screen.getByText('🤔 Confusion Notes')).toBeInTheDocument();
      expect(screen.getByText('Struggled with the recursive approach')).toBeInTheDocument();
      expect(screen.getByText('⚠️ Specific Mistakes')).toBeInTheDocument();
      expect(screen.getByText('Off by one error')).toBeInTheDocument();
      expect(screen.getByText('Forgot base case')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    mockReviewApi.getReviewHistory.mockRejectedValue(new Error('API Error'));

    render(<ReviewHistoryTimeline problemId={1} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load review history')).toBeInTheDocument();
    });

    // Check retry button is present
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('shows empty state when no history is available', async () => {
    const emptyData = {
      ...mockHistoryData,
      total_entries: 0,
      history: [],
      intensive_cycles: [],
    };

    mockReviewApi.getReviewHistory.mockResolvedValue(emptyData);

    render(<ReviewHistoryTimeline problemId={1} />);

    await waitFor(() => {
      expect(screen.getByText('📊 Review History Timeline')).toBeInTheDocument();
    });

    expect(screen.getByText('0 total reviews')).toBeInTheDocument();
    expect(screen.getByText('No reviews match the current filters')).toBeInTheDocument();
  });

  it('displays stage information correctly', async () => {
    mockReviewApi.getReviewHistory.mockResolvedValue(mockHistoryData);

    render(<ReviewHistoryTimeline problemId={1} />);

    await waitFor(() => {
      expect(screen.getByText('📊 Review History Timeline')).toBeInTheDocument();
    });

    // Check stage badges - use getAllByText since there might be multiple
    expect(screen.getByText('3 days')).toBeInTheDocument(); // Stage 2
    const oneDayBadges = screen.getAllByText('1 day');
    expect(oneDayBadges.length).toBeGreaterThan(0); // Stage 1 appears multiple times
  });
});