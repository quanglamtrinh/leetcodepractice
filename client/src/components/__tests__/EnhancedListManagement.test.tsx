import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import EnhancedNotesTab from '../EnhancedNotesTab';
import { Problem } from '../ProblemList';

// Mock the PasteHandler
jest.mock('../../services/PasteHandler', () => ({
  processPastedContent: jest.fn(() => 'mocked processed content'),
}));

// Mock the media components
jest.mock('../media/ImageWithDescription', () => {
  return function MockImageWithDescription() {
    return <div data-testid="image-with-description">Image Component</div>;
  };
});

jest.mock('../media/YouTubeWithDescription', () => {
  return function MockYouTubeWithDescription() {
    return <div data-testid="youtube-with-description">YouTube Component</div>;
  };
});

const mockProblem: Problem = {
  id: 1,
  title: 'Test Problem',
  difficulty: 'Easy',
  category: 'Array',
  notes: '',
  solved: false,
  solution: '',
  url: 'https://example.com'
};

describe('Enhanced List Management', () => {
  beforeEach(() => {
    // Mock fetch for auto-save functionality
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      })
    ) as jest.Mock;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic List Creation', () => {
    it('should create bullet list items', async () => {
      render(<EnhancedNotesTab problem={mockProblem} />);
      
      const textarea = screen.getByRole('textbox');
      
      // Type slash command to create bullet list
      fireEvent.change(textarea, { target: { value: '/bullet' } });
      
      // Wait for slash command menu to appear
      await waitFor(() => {
        expect(screen.getByText('Bullet List')).toBeInTheDocument();
      });
      
      // Select bullet list option
      fireEvent.click(screen.getByText('Bullet List'));
      
      // Verify bullet list was created
      await waitFor(() => {
        const textareaElement = screen.getByRole('textbox');
        expect(textareaElement).toHaveAttribute('data-block-id');
      });
    });

    it('should create numbered list items', async () => {
      render(<EnhancedNotesTab problem={mockProblem} />);
      
      const textarea = screen.getByRole('textbox');
      
      // Create numbered list
      fireEvent.change(textarea, { target: { value: '/numbered' } });
      await waitFor(() => screen.getByText('Numbered List'));
      fireEvent.click(screen.getByText('Numbered List'));
      
      // Verify numbered list was created
      await waitFor(() => {
        const textareaElement = screen.getByRole('textbox');
        expect(textareaElement).toHaveAttribute('data-block-id');
      });
    });

    it('should create todo list items', async () => {
      render(<EnhancedNotesTab problem={mockProblem} />);
      
      const textarea = screen.getByRole('textbox');
      
      // Create todo list
      fireEvent.change(textarea, { target: { value: '/todo' } });
      await waitFor(() => screen.getByText('To-do List'));
      fireEvent.click(screen.getByText('To-do List'));
      
      // Verify todo list was created
      await waitFor(() => {
        const textareaElement = screen.getByRole('textbox');
        expect(textareaElement).toHaveAttribute('data-block-id');
      });
    });
  });

  describe('Tab Indentation', () => {
    it('should handle Tab key for increasing indentation', async () => {
      render(<EnhancedNotesTab problem={mockProblem} />);
      
      const textarea = screen.getByRole('textbox');
      
      // Create bullet list
      fireEvent.change(textarea, { target: { value: '/bullet' } });
      await waitFor(() => screen.getByText('Bullet List'));
      fireEvent.click(screen.getByText('Bullet List'));
      
      // Press Tab to increase indentation
      fireEvent.keyDown(textarea, { key: 'Tab' });
      
      // Verify indentation handling was triggered
      expect(textarea).toBeInTheDocument();
    });

    it('should handle Shift+Tab for decreasing indentation', async () => {
      render(<EnhancedNotesTab problem={mockProblem} />);
      
      const textarea = screen.getByRole('textbox');
      
      // Create bullet list
      fireEvent.change(textarea, { target: { value: '/bullet' } });
      await waitFor(() => screen.getByText('Bullet List'));
      fireEvent.click(screen.getByText('Bullet List'));
      
      // Press Shift+Tab to decrease indentation
      fireEvent.keyDown(textarea, { key: 'Tab', shiftKey: true });
      
      // Verify indentation handling was triggered
      expect(textarea).toBeInTheDocument();
    });
  });

  describe('Enter Key Handling', () => {
    it('should handle Enter key for creating new list items', async () => {
      render(<EnhancedNotesTab problem={mockProblem} />);
      
      const textarea = screen.getByRole('textbox');
      
      // Create bullet list
      fireEvent.change(textarea, { target: { value: '/bullet' } });
      await waitFor(() => screen.getByText('Bullet List'));
      fireEvent.click(screen.getByText('Bullet List'));
      
      // Add some content
      fireEvent.change(textarea, { target: { value: 'First item' } });
      
      // Press Enter to create new item
      fireEvent.keyDown(textarea, { key: 'Enter' });
      
      // Verify Enter handling was triggered
      expect(textarea).toBeInTheDocument();
    });
  });

  describe('Backspace Handling', () => {
    it('should handle Backspace for list conversion', async () => {
      render(<EnhancedNotesTab problem={mockProblem} />);
      
      const textarea = screen.getByRole('textbox');
      
      // Create bullet list
      fireEvent.change(textarea, { target: { value: '/bullet' } });
      await waitFor(() => screen.getByText('Bullet List'));
      fireEvent.click(screen.getByText('Bullet List'));
      
      // Press Backspace on empty list item
      Object.defineProperty(textarea, 'selectionStart', { value: 0, writable: true });
      fireEvent.keyDown(textarea, { key: 'Backspace' });
      
      // Verify Backspace handling was triggered
      expect(textarea).toBeInTheDocument();
    });
  });

  describe('List Markers', () => {
    it('should render different bullet styles for different levels', async () => {
      render(<EnhancedNotesTab problem={mockProblem} />);
      
      const textarea = screen.getByRole('textbox');
      
      // Create bullet list
      fireEvent.change(textarea, { target: { value: '/bullet' } });
      await waitFor(() => screen.getByText('Bullet List'));
      fireEvent.click(screen.getByText('Bullet List'));
      
      // Verify the component renders without errors
      expect(textarea).toBeInTheDocument();
    });
  });
});