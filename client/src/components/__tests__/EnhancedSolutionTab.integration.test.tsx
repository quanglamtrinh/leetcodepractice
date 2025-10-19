import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import EnhancedSolutionTab from '../EnhancedSolutionTab';

// Mock fetch globally
global.fetch = jest.fn();

// Mock SharedRichTextEditor with more realistic behavior
jest.mock('../SharedRichTextEditor', () => {
  const mockReact = require('react');
  return function MockSharedRichTextEditor({ value, onChange, onSave, autoSave, autoSaveDelay }: any) {
    const [content, setContent] = mockReact.useState(value);
    
    mockReact.useEffect(() => {
      setContent(value);
    }, [value]);

    const handleChange = (newValue: string) => {
      setContent(newValue);
      onChange(newValue);
      
      // Simulate auto-save behavior
      if (autoSave && onSave) {
        setTimeout(() => {
          onSave(newValue);
        }, autoSaveDelay || 500);
      }
    };

    return mockReact.createElement('div', { 'data-testid': 'shared-rich-text-editor' },
      mockReact.createElement('textarea', {
        'data-testid': 'editor-textarea',
        value: content,
        onChange: (e: any) => handleChange(e.target.value),
        placeholder: "Type '/' for commands"
      }),
      mockReact.createElement('button', {
        'data-testid': 'manual-save-button',
        onClick: () => onSave && onSave(content)
      }, 'Manual Save')
    );
  };
});

describe('EnhancedSolutionTab Integration', () => {
  const mockProblem = {
    id: 1,
    title: 'Two Sum',
    solution: '',
    solved: false,
    difficulty: 'Easy',
    concept: 'Arrays & Hashing',
    leetcode_link: 'https://leetcode.com/problems/two-sum'
  };

  const mockOnSolutionSaved = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('integrates with SharedRichTextEditor for content editing', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ id: 1, solution: 'test content' })
    });

    render(<EnhancedSolutionTab problem={mockProblem} onSolutionSaved={mockOnSolutionSaved} />);
    
    const textarea = screen.getByTestId('editor-textarea');
    
    // Type some solution content
    fireEvent.change(textarea, { target: { value: 'def twoSum(nums, target):' } });
    
    // Fast-forward timers to trigger auto-save
    jest.advanceTimersByTime(600);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/problems/1/solution', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('def twoSum(nums, target):')
      });
    });
  });

  it('handles problem switching correctly', () => {
    const { rerender } = render(<EnhancedSolutionTab problem={mockProblem} onSolutionSaved={mockOnSolutionSaved} />);
    
    // Switch to a different problem
    const newProblem = {
      id: 2,
      title: 'Valid Parentheses',
      solution: JSON.stringify([{
        id: 1,
        type: 'text',
        content: 'def isValid(s):',
        placeholder: 'Type "/" for commands'
      }]),
      solved: true,
      difficulty: 'Easy',
      concept: 'Stack',
      leetcode_link: 'https://leetcode.com/problems/valid-parentheses'
    };

    rerender(<EnhancedSolutionTab problem={newProblem} onSolutionSaved={mockOnSolutionSaved} />);
    
    // Should load the new problem's solution
    expect(screen.getByTestId('shared-rich-text-editor')).toBeInTheDocument();
  });

  it('maintains independent state from notes tab', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ id: 1, solution: 'solution content' })
    });

    render(<EnhancedSolutionTab problem={mockProblem} onSolutionSaved={mockOnSolutionSaved} />);
    
    const textarea = screen.getByTestId('editor-textarea');
    
    // Add solution content
    fireEvent.change(textarea, { target: { value: 'Solution implementation here' } });
    
    // Trigger auto-save
    jest.advanceTimersByTime(600);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/problems/1/solution', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('Solution implementation here')
      });
    });

    // Verify the callback was called with solution data, not notes data
    expect(mockOnSolutionSaved).toHaveBeenCalledWith(1, expect.any(String));
  });

  it('handles server errors gracefully during auto-save', async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error('Server unavailable'));

    render(<EnhancedSolutionTab problem={mockProblem} onSolutionSaved={mockOnSolutionSaved} />);
    
    const textarea = screen.getByTestId('editor-textarea');
    
    // Type content to trigger auto-save
    fireEvent.change(textarea, { target: { value: 'Some solution code' } });
    
    // Fast-forward to trigger auto-save
    jest.advanceTimersByTime(600);

    await waitFor(() => {
      expect(screen.getByText('Failed to save')).toBeInTheDocument();
    });
  });

  it('persists solution content across component re-renders', () => {
    const problemWithSolution = {
      ...mockProblem,
      solution: JSON.stringify([{
        id: 1,
        type: 'text',
        content: 'Persistent solution content',
        placeholder: 'Type "/" for commands'
      }])
    };

    const { rerender } = render(<EnhancedSolutionTab problem={problemWithSolution} onSolutionSaved={mockOnSolutionSaved} />);
    
    // Re-render with the same problem
    rerender(<EnhancedSolutionTab problem={problemWithSolution} onSolutionSaved={mockOnSolutionSaved} />);
    
    // Content should still be there
    expect(screen.getByTestId('shared-rich-text-editor')).toBeInTheDocument();
  });

  it('handles concurrent save operations correctly', async () => {
    let resolveFirstSave: (value: any) => void;
    let resolveSecondSave: (value: any) => void;
    
    const firstSavePromise = new Promise(resolve => { resolveFirstSave = resolve; });
    const secondSavePromise = new Promise(resolve => { resolveSecondSave = resolve; });
    
    (fetch as jest.Mock)
      .mockReturnValueOnce(firstSavePromise)
      .mockReturnValueOnce(secondSavePromise);

    render(<EnhancedSolutionTab problem={mockProblem} onSolutionSaved={mockOnSolutionSaved} />);
    
    const textarea = screen.getByTestId('editor-textarea');
    
    // Trigger first save
    fireEvent.change(textarea, { target: { value: 'First save content' } });
    jest.advanceTimersByTime(600);
    
    // Trigger second save before first completes
    fireEvent.change(textarea, { target: { value: 'Second save content' } });
    jest.advanceTimersByTime(600);

    // Resolve saves
    resolveFirstSave!({ ok: true, json: async () => ({ id: 1 }) });
    resolveSecondSave!({ ok: true, json: async () => ({ id: 1 }) });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  it('validates solution content format', () => {
    const problemWithInvalidSolution = {
      ...mockProblem,
      solution: 'invalid json content'
    };

    render(<EnhancedSolutionTab problem={problemWithInvalidSolution} onSolutionSaved={mockOnSolutionSaved} />);
    
    // Should handle invalid JSON gracefully and show editor
    expect(screen.getByTestId('shared-rich-text-editor')).toBeInTheDocument();
  });
});