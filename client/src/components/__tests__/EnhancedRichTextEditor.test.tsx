import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import EnhancedRichTextEditor from '../EnhancedRichTextEditor';

describe('EnhancedRichTextEditor - List Management', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  describe('Tab/Shift+Tab Indentation', () => {
    it('should increase indentation level when Tab is pressed on bullet list', async () => {
      render(
        <EnhancedRichTextEditor
          value=""
          onChange={mockOnChange}
        />
      );

      const textarea = screen.getByPlaceholderText('Type "/" for commands');
      
      // Create a bullet list
      await userEvent.type(textarea, '/bullet');
      await waitFor(() => {
        expect(screen.getByPlaceholderText('List item')).toBeInTheDocument();
      });
      
      const bulletTextarea = screen.getByPlaceholderText('List item');
      await userEvent.type(bulletTextarea, 'First item');
      
      // Press Tab to increase indentation
      fireEvent.keyDown(bulletTextarea, { key: 'Tab' });
      
      // Check that the block has increased indentation level
      await waitFor(() => {
        expect(bulletTextarea.closest('.ml-6')).toBeInTheDocument();
      });
    });

    it('should decrease indentation level when Shift+Tab is pressed on indented bullet list', async () => {
      const initialValue = JSON.stringify([
        { id: 1, type: 'bullet', content: 'Indented item', level: 1, placeholder: 'List item' }
      ]);
      
      render(
        <EnhancedRichTextEditor
          value={initialValue}
          onChange={mockOnChange}
        />
      );

      const bulletTextarea = screen.getByDisplayValue('Indented item');
      
      // Press Shift+Tab to decrease indentation
      fireEvent.keyDown(bulletTextarea, { key: 'Tab', shiftKey: true });
      
      // Check that the block has decreased indentation level
      await waitFor(() => {
        expect(bulletTextarea.closest('.ml-6')).not.toBeInTheDocument();
      });
    });

    it('should work with numbered lists', async () => {
      render(
        <EnhancedRichTextEditor
          value=""
          onChange={mockOnChange}
        />
      );

      const textarea = screen.getByPlaceholderText('Type "/" for commands');
      
      // Create a numbered list
      await userEvent.type(textarea, '/numbered');
      await waitFor(() => {
        expect(screen.getByPlaceholderText('List item')).toBeInTheDocument();
      });
      
      const numberedTextarea = screen.getByPlaceholderText('List item');
      await userEvent.type(numberedTextarea, 'First item');
      
      // Press Tab to increase indentation
      fireEvent.keyDown(numberedTextarea, { key: 'Tab' });
      
      // Check that the block has increased indentation level
      await waitFor(() => {
        expect(numberedTextarea.closest('.ml-6')).toBeInTheDocument();
      });
    });

    it('should work with todo lists', async () => {
      render(
        <EnhancedRichTextEditor
          value=""
          onChange={mockOnChange}
        />
      );

      const textarea = screen.getByPlaceholderText('Type "/" for commands');
      
      // Create a todo list
      await userEvent.type(textarea, '/todo');
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Task item')).toBeInTheDocument();
      });
      
      const todoTextarea = screen.getByPlaceholderText('Task item');
      await userEvent.type(todoTextarea, 'First task');
      
      // Press Tab to increase indentation
      fireEvent.keyDown(todoTextarea, { key: 'Tab' });
      
      // Check that the block has increased indentation level
      await waitFor(() => {
        expect(todoTextarea.closest('.ml-6')).toBeInTheDocument();
      });
    });

    it('should not indent beyond maximum level (3)', async () => {
      const initialValue = JSON.stringify([
        { id: 1, type: 'bullet', content: 'Max indented item', level: 3, placeholder: 'List item' }
      ]);
      
      render(
        <EnhancedRichTextEditor
          value={initialValue}
          onChange={mockOnChange}
        />
      );

      const bulletTextarea = screen.getByDisplayValue('Max indented item');
      
      // Press Tab - should not increase beyond level 3
      fireEvent.keyDown(bulletTextarea, { key: 'Tab' });
      
      // Check that the block remains at level 3
      await waitFor(() => {
        expect(bulletTextarea.closest('.ml-18')).toBeInTheDocument(); // ml-18 = level 3
      });
    });

    it('should not decrease indentation below level 0', async () => {
      const initialValue = JSON.stringify([
        { id: 1, type: 'bullet', content: 'Base level item', level: 0, placeholder: 'List item' }
      ]);
      
      render(
        <EnhancedRichTextEditor
          value={initialValue}
          onChange={mockOnChange}
        />
      );

      const bulletTextarea = screen.getByDisplayValue('Base level item');
      
      // Press Shift+Tab - should not decrease below level 0
      fireEvent.keyDown(bulletTextarea, { key: 'Tab', shiftKey: true });
      
      // Check that the block remains at level 0
      await waitFor(() => {
        expect(bulletTextarea.closest('.ml-6')).not.toBeInTheDocument();
      });
    });
  });

  describe('Enter Key Handling', () => {
    it('should create new bullet item when Enter is pressed in bullet list', async () => {
      render(
        <EnhancedRichTextEditor
          value=""
          onChange={mockOnChange}
        />
      );

      const textarea = screen.getByPlaceholderText('Type "/" for commands');
      
      // Create a bullet list
      await userEvent.type(textarea, '/bullet');
      await waitFor(() => {
        expect(screen.getByPlaceholderText('List item')).toBeInTheDocument();
      });
      
      const bulletTextarea = screen.getByPlaceholderText('List item');
      await userEvent.type(bulletTextarea, 'First item');
      
      // Press Enter to create new bullet item
      fireEvent.keyDown(bulletTextarea, { key: 'Enter' });
      
      // Check that a new bullet item was created
      await waitFor(() => {
        const bulletItems = screen.getAllByText('•');
        expect(bulletItems).toHaveLength(2);
      });
    });

    it('should create new numbered item when Enter is pressed in numbered list', async () => {
      render(
        <EnhancedRichTextEditor
          value=""
          onChange={mockOnChange}
        />
      );

      const textarea = screen.getByPlaceholderText('Type "/" for commands');
      
      // Create a numbered list
      await userEvent.type(textarea, '/numbered');
      await waitFor(() => {
        expect(screen.getByPlaceholderText('List item')).toBeInTheDocument();
      });
      
      const numberedTextarea = screen.getByPlaceholderText('List item');
      await userEvent.type(numberedTextarea, 'First item');
      
      // Press Enter to create new numbered item
      fireEvent.keyDown(numberedTextarea, { key: 'Enter' });
      
      // Check that a new numbered item was created
      await waitFor(() => {
        expect(screen.getByText('1.')).toBeInTheDocument();
        expect(screen.getByText('2.')).toBeInTheDocument();
      });
    });

    it('should create new todo item when Enter is pressed in todo list', async () => {
      render(
        <EnhancedRichTextEditor
          value=""
          onChange={mockOnChange}
        />
      );

      const textarea = screen.getByPlaceholderText('Type "/" for commands');
      
      // Create a todo list
      await userEvent.type(textarea, '/todo');
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Task item')).toBeInTheDocument();
      });
      
      const todoTextarea = screen.getByPlaceholderText('Task item');
      await userEvent.type(todoTextarea, 'First task');
      
      // Press Enter to create new todo item
      fireEvent.keyDown(todoTextarea, { key: 'Enter' });
      
      // Check that a new todo item was created
      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes).toHaveLength(2);
      });
    });

    it('should exit list when Enter is pressed on empty list item', async () => {
      const initialValue = JSON.stringify([
        { id: 1, type: 'bullet', content: '', placeholder: 'List item' }
      ]);
      
      render(
        <EnhancedRichTextEditor
          value={initialValue}
          onChange={mockOnChange}
        />
      );

      const bulletTextarea = screen.getByPlaceholderText('List item');
      
      // Press Enter on empty bullet item
      fireEvent.keyDown(bulletTextarea, { key: 'Enter' });
      
      // Check that the bullet item was converted to text
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Type something...')).toBeInTheDocument();
        expect(screen.queryByText('•')).not.toBeInTheDocument();
      });
    });

    it('should preserve indentation level when creating new list items', async () => {
      const initialValue = JSON.stringify([
        { id: 1, type: 'bullet', content: 'Indented item', level: 2, placeholder: 'List item' }
      ]);
      
      render(
        <EnhancedRichTextEditor
          value={initialValue}
          onChange={mockOnChange}
        />
      );

      const bulletTextarea = screen.getByDisplayValue('Indented item');
      
      // Set cursor to end of text to avoid "cursor at start" behavior
      bulletTextarea.setSelectionRange(bulletTextarea.value.length, bulletTextarea.value.length);
      
      // Press Enter to create new bullet item
      fireEvent.keyDown(bulletTextarea, { key: 'Enter' });
      
      // Check that the new item has the same indentation level
      await waitFor(() => {
        const indentedItems = screen.getAllByText('•').map(item => 
          item.closest('.ml-12') // ml-12 = level 2
        ).filter(Boolean);
        expect(indentedItems).toHaveLength(2);
      });
    });
  });

  describe('Backspace Key Handling', () => {
    it('should convert bullet item to text when Backspace is pressed at beginning', async () => {
      const initialValue = JSON.stringify([
        { id: 1, type: 'bullet', content: 'Bullet item', placeholder: 'List item' }
      ]);
      
      render(
        <EnhancedRichTextEditor
          value={initialValue}
          onChange={mockOnChange}
        />
      );

      const bulletTextarea = screen.getByDisplayValue('Bullet item');
      
      // Set cursor to beginning and press Backspace
      bulletTextarea.setSelectionRange(0, 0);
      fireEvent.keyDown(bulletTextarea, { key: 'Backspace' });
      
      // Check that the bullet item was converted to text
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Type something...')).toBeInTheDocument();
        expect(screen.queryByText('•')).not.toBeInTheDocument();
      });
    });

    it('should decrease indentation level before converting to text', async () => {
      const initialValue = JSON.stringify([
        { id: 1, type: 'bullet', content: 'Indented item', level: 1, placeholder: 'List item' }
      ]);
      
      render(
        <EnhancedRichTextEditor
          value={initialValue}
          onChange={mockOnChange}
        />
      );

      const bulletTextarea = screen.getByDisplayValue('Indented item');
      
      // Set cursor to beginning and press Backspace
      bulletTextarea.setSelectionRange(0, 0);
      fireEvent.keyDown(bulletTextarea, { key: 'Backspace' });
      
      // Check that indentation was decreased (should still be bullet but at level 0)
      await waitFor(() => {
        expect(screen.getByText('•')).toBeInTheDocument();
        expect(bulletTextarea.closest('.ml-6')).not.toBeInTheDocument();
      });
      
      // Press Backspace again to convert to text
      fireEvent.keyDown(bulletTextarea, { key: 'Backspace' });
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Type something...')).toBeInTheDocument();
        expect(screen.queryByText('•')).not.toBeInTheDocument();
      });
    });

    it('should work with numbered lists', async () => {
      const initialValue = JSON.stringify([
        { id: 1, type: 'numbered', content: 'Numbered item', placeholder: 'List item' }
      ]);
      
      render(
        <EnhancedRichTextEditor
          value={initialValue}
          onChange={mockOnChange}
        />
      );

      const numberedTextarea = screen.getByDisplayValue('Numbered item');
      
      // Set cursor to beginning and press Backspace
      numberedTextarea.setSelectionRange(0, 0);
      fireEvent.keyDown(numberedTextarea, { key: 'Backspace' });
      
      // Check that the numbered item was converted to text
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Type something...')).toBeInTheDocument();
        expect(screen.queryByText('1.')).not.toBeInTheDocument();
      });
    });

    it('should work with todo lists', async () => {
      const initialValue = JSON.stringify([
        { id: 1, type: 'todo', content: 'Todo item', placeholder: 'Task item' }
      ]);
      
      render(
        <EnhancedRichTextEditor
          value={initialValue}
          onChange={mockOnChange}
        />
      );

      const todoTextarea = screen.getByDisplayValue('Todo item');
      
      // Set cursor to beginning and press Backspace
      todoTextarea.setSelectionRange(0, 0);
      fireEvent.keyDown(todoTextarea, { key: 'Backspace' });
      
      // Check that the todo item was converted to text
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Type something...')).toBeInTheDocument();
        expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
      });
    });
  });

  describe('Proper Indentation Levels', () => {
    it('should render correct indentation classes for different levels', () => {
      const initialValue = JSON.stringify([
        { id: 1, type: 'bullet', content: 'Level 0', level: 0, placeholder: 'List item' },
        { id: 2, type: 'bullet', content: 'Level 1', level: 1, placeholder: 'List item' },
        { id: 3, type: 'bullet', content: 'Level 2', level: 2, placeholder: 'List item' },
        { id: 4, type: 'bullet', content: 'Level 3', level: 3, placeholder: 'List item' }
      ]);
      
      render(
        <EnhancedRichTextEditor
          value={initialValue}
          onChange={mockOnChange}
        />
      );

      // Check indentation classes
      expect(screen.getByDisplayValue('Level 0').closest('.ml-0, :not([class*="ml-"])')).toBeTruthy();
      expect(screen.getByDisplayValue('Level 1').closest('.ml-6')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Level 2').closest('.ml-12')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Level 3').closest('.ml-18')).toBeInTheDocument();
    });

    it('should maintain proper numbering for numbered lists at different levels', () => {
      const initialValue = JSON.stringify([
        { id: 1, type: 'numbered', content: 'First level 0', level: 0, placeholder: 'List item' },
        { id: 2, type: 'numbered', content: 'First level 1', level: 1, placeholder: 'List item' },
        { id: 3, type: 'numbered', content: 'Second level 0', level: 0, placeholder: 'List item' },
        { id: 4, type: 'numbered', content: 'Second level 1', level: 1, placeholder: 'List item' }
      ]);
      
      render(
        <EnhancedRichTextEditor
          value={initialValue}
          onChange={mockOnChange}
        />
      );

      // Check that numbering is correct for each level
      const level0Items = screen.getAllByText(/^\d+\.$/);
      expect(level0Items).toHaveLength(4); // All numbered items show numbers
      
      // Level 0 items should be numbered 1, 2 and level 1 items should be numbered 1, 2
      const allNumbers = screen.getAllByText('1.');
      expect(allNumbers).toHaveLength(2); // One for each level
      const allTwos = screen.getAllByText('2.');
      expect(allTwos).toHaveLength(2); // One for each level
    });
  });

  describe('Todo List Functionality', () => {
    it('should toggle todo item checked state', async () => {
      const initialValue = JSON.stringify([
        { id: 1, type: 'todo', content: 'Todo item', checked: false, placeholder: 'Task item' }
      ]);
      
      render(
        <EnhancedRichTextEditor
          value={initialValue}
          onChange={mockOnChange}
        />
      );

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();
      
      // Click checkbox to toggle
      await userEvent.click(checkbox);
      
      expect(checkbox).toBeChecked();
    });

    it('should apply strikethrough style to completed todo items', () => {
      const initialValue = JSON.stringify([
        { id: 1, type: 'todo', content: 'Completed task', checked: true, placeholder: 'Task item' }
      ]);
      
      render(
        <EnhancedRichTextEditor
          value={initialValue}
          onChange={mockOnChange}
        />
      );

      const todoTextarea = screen.getByDisplayValue('Completed task');
      expect(todoTextarea).toHaveClass('line-through', 'text-gray-500');
    });
  });
});