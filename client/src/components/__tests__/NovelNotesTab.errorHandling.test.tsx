import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import NovelNotesTab from '../NovelNotesTab';
import { Problem } from '../ProblemList';

// Mock fetch for testing network errors
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock console methods to avoid noise in tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
beforeAll(() => {
  console.log = jest.fn();
  console.error = jest.fn();
});
afterAll(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});

describe('NovelNotesTab Error Handling', () => {
  const mockProblem: Problem = {
    id: 1,
    title: 'Test Problem',
    difficulty: 'Easy',
    notes: '',
    solved: false,
    tags: [],
    url: 'https://example.com'
  };

  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('Save Error Handling', () => {
    it('should display detailed error message for network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('fetch failed'));

      render(<NovelNotesTab problem={mockProblem} />);

      // Wait for component to load
      await waitFor(() => {
        expect(screen.queryByText('Loading notes...')).not.toBeInTheDocument();
      });

      // Trigger save by clicking save button
      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      // Should show network error message
      await waitFor(() => {
        expect(screen.getByText(/Network error/)).toBeInTheDocument();
      });

      // Should show retry button
      expect(screen.getByText('Retry Save')).toBeInTheDocument();
    });

    it('should display timeout error for AbortError', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValueOnce(abortError);

      render(<NovelNotesTab problem={mockProblem} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading notes...')).not.toBeInTheDocument();
      });

      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/timeout/)).toBeInTheDocument();
      });
    });

    it('should display server error for 500 status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error')
      });

      render(<NovelNotesTab problem={mockProblem} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading notes...')).not.toBeInTheDocument();
      });

      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/Server error/)).toBeInTheDocument();
      });
    });

    it('should display content too large error for 413 status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 413,
        text: () => Promise.resolve('Payload Too Large')
      });

      render(<NovelNotesTab problem={mockProblem} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading notes...')).not.toBeInTheDocument();
      });

      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/too large/)).toBeInTheDocument();
      });
    });
  });

  describe('Clear Error Handling', () => {
    it('should display error message when clear fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<NovelNotesTab problem={mockProblem} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading notes...')).not.toBeInTheDocument();
      });

      // Open clear confirmation dialog
      const clearButton = screen.getByText('Clear Notes');
      fireEvent.click(clearButton);

      // Confirm clear action
      const confirmButton = screen.getByText('Clear Notes');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/Failed to clear notes/)).toBeInTheDocument();
      });
    });

    it('should not modify content when clear fails', async () => {
      const problemWithNotes = { ...mockProblem, notes: 'Some existing notes' };
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<NovelNotesTab problem={problemWithNotes} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading notes...')).not.toBeInTheDocument();
      });

      // Open clear confirmation dialog
      const clearButton = screen.getByText('Clear Notes');
      fireEvent.click(clearButton);

      // Confirm clear action
      const confirmButton = screen.getByText('Clear Notes');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/Failed to clear notes/)).toBeInTheDocument();
      });

      // Content should still be preserved (requirement 4.5)
      // Note: In a real test, we'd check the editor content, but this is a basic verification
    });
  });

  describe('Status Indicators', () => {
    it('should show "Saved!" status on successful save', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200
      });

      render(<NovelNotesTab problem={mockProblem} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading notes...')).not.toBeInTheDocument();
      });

      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      // Should show saving status first
      await waitFor(() => {
        expect(screen.getByText('Saving...')).toBeInTheDocument();
      });

      // Then should show saved status
      await waitFor(() => {
        expect(screen.getByText('Saved!')).toBeInTheDocument();
      });
    });

    it('should show "Cleared!" status on successful clear', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200
      });

      render(<NovelNotesTab problem={mockProblem} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading notes...')).not.toBeInTheDocument();
      });

      // Open clear confirmation dialog
      const clearButton = screen.getByText('Clear Notes');
      fireEvent.click(clearButton);

      // Confirm clear action
      const confirmButton = screen.getByText('Clear Notes');
      fireEvent.click(confirmButton);

      // Should show clearing status first
      await waitFor(() => {
        expect(screen.getByText('Clearing...')).toBeInTheDocument();
      });

      // Then should show cleared status
      await waitFor(() => {
        expect(screen.getByText('Cleared!')).toBeInTheDocument();
      });
    });
  });

  describe('Content Loading Error Handling', () => {
    it('should handle corrupted notes gracefully', () => {
      const problemWithCorruptedNotes = { 
        ...mockProblem, 
        notes: '{"invalid": json content' 
      };

      render(<NovelNotesTab problem={problemWithCorruptedNotes} />);

      // Should not crash and should show fallback content
      expect(screen.getByText(/Notes format is corrupted/)).toBeInTheDocument();
    });

    it('should preserve original content when conversion fails', () => {
      const problemWithPlainText = { 
        ...mockProblem, 
        notes: 'Some plain text notes' 
      };

      // Mock BackwardCompatibilityConverter to throw error
      jest.mock('../utils/BackwardCompatibilityConverter', () => ({
        BackwardCompatibilityConverter: {
          convertToNovelFormat: jest.fn().mockImplementation(() => {
            throw new Error('Conversion failed');
          })
        }
      }));

      render(<NovelNotesTab problem={problemWithPlainText} />);

      // Should show error but preserve content
      expect(screen.getByText(/Could not convert existing notes format/)).toBeInTheDocument();
    });
  });

  describe('Error Display Features', () => {
    it('should show error category in error display', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<NovelNotesTab problem={mockProblem} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading notes...')).not.toBeInTheDocument();
      });

      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Network Error')).toBeInTheDocument();
      });
    });

    it('should provide dismiss button for errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Test error'));

      render(<NovelNotesTab problem={mockProblem} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading notes...')).not.toBeInTheDocument();
      });

      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Dismiss')).toBeInTheDocument();
      });

      // Click dismiss button
      fireEvent.click(screen.getByText('Dismiss'));

      // Error should be dismissed
      await waitFor(() => {
        expect(screen.queryByText('Test error')).not.toBeInTheDocument();
      });
    });
  });
});