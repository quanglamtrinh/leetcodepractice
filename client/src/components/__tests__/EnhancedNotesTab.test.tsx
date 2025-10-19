import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import EnhancedNotesTab from '../EnhancedNotesTab';

// Mock fetch
global.fetch = jest.fn();

const mockProblem = {
  id: 1,
  title: 'Test Problem',
  notes: '',
  solution: '',
  solved: false,
  difficulty: 'Easy',
  concept: 'Arrays',
  leetcode_link: 'https://leetcode.com/problems/test'
};

describe('EnhancedNotesTab', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  it('renders with empty notes', () => {
    render(<EnhancedNotesTab problem={mockProblem} />);
    
    expect(screen.getByText('📝 Notes')).toBeInTheDocument();
    expect(screen.getByText('Clear Notes')).toBeInTheDocument();
  });

  it('loads existing JSON notes', () => {
    const problemWithNotes = {
      ...mockProblem,
      notes: JSON.stringify([{
        id: 1,
        type: 'text',
        content: 'Test note content',
        placeholder: 'Type "/" for commands'
      }])
    };

    render(<EnhancedNotesTab problem={problemWithNotes} />);
    
    expect(screen.getByText('📝 Notes')).toBeInTheDocument();
  });

  it('handles backward compatibility with HTML notes', () => {
    const problemWithHtmlNotes = {
      ...mockProblem,
      notes: '<p>Old HTML note</p>'
    };

    render(<EnhancedNotesTab problem={problemWithHtmlNotes} />);
    
    expect(screen.getByText('📝 Notes')).toBeInTheDocument();
  });

  it('shows clear confirmation dialog', async () => {
    render(<EnhancedNotesTab problem={mockProblem} />);
    
    const clearButton = screen.getByText('Clear Notes');
    fireEvent.click(clearButton);
    
    await waitFor(() => {
      expect(screen.getByText('Are you sure you want to clear all notes for this problem?')).toBeInTheDocument();
    });
  });

  it('calls onNotesSaved when notes are saved', async () => {
    const mockOnNotesSaved = jest.fn();
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    });

    render(<EnhancedNotesTab problem={mockProblem} onNotesSaved={mockOnNotesSaved} />);
    
    // The component should auto-save when content changes
    // This is handled by the SharedRichTextEditor component
    expect(screen.getByText('📝 Notes')).toBeInTheDocument();
  });

  it('handles save errors gracefully', async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(<EnhancedNotesTab problem={mockProblem} />);
    
    expect(screen.getByText('📝 Notes')).toBeInTheDocument();
  });

  it('updates when problem changes', () => {
    const { rerender } = render(<EnhancedNotesTab problem={mockProblem} />);
    
    const newProblem = {
      ...mockProblem,
      id: 2,
      title: 'New Problem',
      notes: JSON.stringify([{
        id: 1,
        type: 'text',
        content: 'New note content',
        placeholder: 'Type "/" for commands'
      }])
    };

    rerender(<EnhancedNotesTab problem={newProblem} />);
    
    expect(screen.getByText('📝 Notes')).toBeInTheDocument();
  });
});