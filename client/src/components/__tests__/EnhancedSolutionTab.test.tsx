import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import EnhancedSolutionTab from '../EnhancedSolutionTab';

// Mock fetch globally
global.fetch = jest.fn();

// Mock SharedRichTextEditor
jest.mock('../SharedRichTextEditor', () => {
  return function MockSharedRichTextEditor({ value, onChange, onSave, placeholder }: any) {
    return (
      <div data-testid="shared-rich-text-editor">
        <textarea
          data-testid="editor-textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
        <button
          data-testid="save-button"
          onClick={() => onSave && onSave(value)}
        >
          Save
        </button>
      </div>
    );
  };
});

describe('EnhancedSolutionTab', () => {
  const mockProblem = {
    id: 1,
    title: 'Test Problem',
    solution: '',
    solved: false,
    difficulty: 'Easy',
    concept: 'Arrays',
    leetcode_link: 'https://leetcode.com/problems/test'
  };

  const mockOnSolutionSaved = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  it('renders with default empty content', () => {
    render(<EnhancedSolutionTab problem={mockProblem} onSolutionSaved={mockOnSolutionSaved} />);
    
    expect(screen.getByText('💻 Solution')).toBeInTheDocument();
    expect(screen.getByTestId('shared-rich-text-editor')).toBeInTheDocument();
    expect(screen.getByText('Clear Solution')).toBeInTheDocument();
  });

  it('loads existing solution content', () => {
    const problemWithSolution = {
      ...mockProblem,
      solution: JSON.stringify([{
        id: 1,
        type: 'text',
        content: 'Existing solution content',
        placeholder: 'Type "/" for commands'
      }])
    };

    render(<EnhancedSolutionTab problem={problemWithSolution} onSolutionSaved={mockOnSolutionSaved} />);
    
    expect(screen.getByTestId('shared-rich-text-editor')).toBeInTheDocument();
  });

  it('handles backward compatibility with HTML content', () => {
    const problemWithHtmlSolution = {
      ...mockProblem,
      solution: '<p>HTML solution content</p>'
    };

    render(<EnhancedSolutionTab problem={problemWithHtmlSolution} onSolutionSaved={mockOnSolutionSaved} />);
    
    expect(screen.getByTestId('shared-rich-text-editor')).toBeInTheDocument();
  });

  it('saves solution successfully', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1, solution: 'test content' })
    });

    render(<EnhancedSolutionTab problem={mockProblem} onSolutionSaved={mockOnSolutionSaved} />);
    
    const saveButton = screen.getByTestId('save-button');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/problems/1/solution', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          solution: JSON.stringify([{
            id: 1,
            type: 'text',
            content: '',
            placeholder: 'Type "/" for commands'
          }])
        })
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Saved!')).toBeInTheDocument();
    });

    expect(mockOnSolutionSaved).toHaveBeenCalledWith(1, expect.any(String));
  });

  it('handles save failure', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Server error'
    });

    render(<EnhancedSolutionTab problem={mockProblem} onSolutionSaved={mockOnSolutionSaved} />);
    
    const saveButton = screen.getByTestId('save-button');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to save')).toBeInTheDocument();
    });
  });

  it('shows clear confirmation dialog', () => {
    render(<EnhancedSolutionTab problem={mockProblem} onSolutionSaved={mockOnSolutionSaved} />);
    
    const clearButton = screen.getByText('Clear Solution');
    fireEvent.click(clearButton);

    expect(screen.getByText(/Are you sure you want to clear all solution content/)).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('clears solution when confirmed', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1, solution: '' })
    });

    render(<EnhancedSolutionTab problem={mockProblem} onSolutionSaved={mockOnSolutionSaved} />);
    
    // First click the clear button to show the dialog
    const clearButton = screen.getByTitle('Clear all solution content');
    fireEvent.click(clearButton);

    // Wait for the dialog to appear and then click the confirm button
    await waitFor(() => {
      expect(screen.getByText(/Are you sure you want to clear all solution content/)).toBeInTheDocument();
    });

    // Get all buttons with "Clear Solution" text and select the confirmation one (should be the second one)
    const confirmButtons = screen.getAllByText('Clear Solution');
    const confirmButton = confirmButtons[1]; // The second one should be the confirmation button
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/problems/1/solution', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          solution: JSON.stringify([{
            id: 1,
            type: 'text',
            content: '',
            placeholder: 'Type "/" for commands'
          }])
        })
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Cleared!')).toBeInTheDocument();
    });
  });

  it('cancels clear operation', () => {
    render(<EnhancedSolutionTab problem={mockProblem} onSolutionSaved={mockOnSolutionSaved} />);
    
    const clearButton = screen.getByText('Clear Solution');
    fireEvent.click(clearButton);

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(screen.queryByText(/Are you sure you want to clear all solution content/)).not.toBeInTheDocument();
  });

  it('updates content when problem changes', () => {
    const { rerender } = render(<EnhancedSolutionTab problem={mockProblem} onSolutionSaved={mockOnSolutionSaved} />);
    
    const newProblem = {
      ...mockProblem,
      id: 2,
      title: 'New Problem',
      solution: JSON.stringify([{
        id: 1,
        type: 'text',
        content: 'New solution content',
        placeholder: 'Type "/" for commands'
      }])
    };

    rerender(<EnhancedSolutionTab problem={newProblem} onSolutionSaved={mockOnSolutionSaved} />);
    
    expect(screen.getByTestId('shared-rich-text-editor')).toBeInTheDocument();
  });

  it('handles network errors gracefully', async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(<EnhancedSolutionTab problem={mockProblem} onSolutionSaved={mockOnSolutionSaved} />);
    
    const saveButton = screen.getByTestId('save-button');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to save')).toBeInTheDocument();
    });
  });
});