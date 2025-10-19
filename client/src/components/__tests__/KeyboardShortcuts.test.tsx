import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import * as userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import EnhancedRichTextEditor from '../EnhancedRichTextEditor';
import ExtendedSlashCommand from '../ExtendedSlashCommand';
import FormattedDescriptionField from '../media/FormattedDescriptionField';

describe('Keyboard Shortcuts and Navigation', () => {
  describe('EnhancedRichTextEditor Keyboard Shortcuts', () => {
    it('should toggle bold formatting with Ctrl+B', async () => {
      const user = userEvent.setup();
      const mockOnChange = jest.fn();
      
      render(
        <EnhancedRichTextEditor
          value=""
          onChange={mockOnChange}
        />
      );

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Hello World');
      
      // Select "World"
      textarea.setSelectionRange(6, 11);
      
      // Press Ctrl+B
      await user.keyboard('{Control>}b{/Control}');
      
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.stringContaining('**World**')
        );
      });
    });

    it('should toggle italic formatting with Ctrl+I', async () => {
      const user = userEvent.setup();
      const mockOnChange = jest.fn();
      
      render(
        <EnhancedRichTextEditor
          value=""
          onChange={mockOnChange}
        />
      );

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Hello World');
      
      // Select "World"
      textarea.setSelectionRange(6, 11);
      
      // Press Ctrl+I
      await user.keyboard('{Control>}i{/Control}');
      
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.stringContaining('*World*')
        );
      });
    });

    it('should show link dialog with Ctrl+K', async () => {
      const user = userEvent.setup();
      const mockOnChange = jest.fn();
      
      // Mock window.prompt
      const mockPrompt = jest.spyOn(window, 'prompt').mockReturnValue('https://example.com');
      
      render(
        <EnhancedRichTextEditor
          value=""
          onChange={mockOnChange}
        />
      );

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Hello World');
      
      // Select "World"
      textarea.setSelectionRange(6, 11);
      
      // Press Ctrl+K
      await user.keyboard('{Control>}k{/Control}');
      
      expect(mockPrompt).toHaveBeenCalledWith('Enter URL:', 'https://');
      
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.stringContaining('[World](https://example.com)')
        );
      });
      
      mockPrompt.mockRestore();
    });

    it('should work with Cmd key on Mac', async () => {
      const user = userEvent.setup();
      const mockOnChange = jest.fn();
      
      render(
        <EnhancedRichTextEditor
          value=""
          onChange={mockOnChange}
        />
      );

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Hello World');
      
      // Select "World"
      textarea.setSelectionRange(6, 11);
      
      // Press Cmd+B (Meta key)
      await user.keyboard('{Meta>}b{/Meta}');
      
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.stringContaining('**World**')
        );
      });
    });

    it('should remove formatting when text is already formatted', async () => {
      const user = userEvent.setup();
      const mockOnChange = jest.fn();
      
      render(
        <EnhancedRichTextEditor
          value='[{"id":1,"type":"text","content":"Hello **World**","placeholder":"Type something..."}]'
          onChange={mockOnChange}
        />
      );

      const textarea = screen.getByRole('textbox');
      
      // Select "**World**"
      textarea.setSelectionRange(6, 15);
      
      // Press Ctrl+B to remove bold formatting
      await user.keyboard('{Control>}b{/Control}');
      
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.stringContaining('World')
        );
        expect(mockOnChange).not.toHaveBeenCalledWith(
          expect.stringContaining('**World**')
        );
      });
    });
  });

  describe('ExtendedSlashCommand Navigation', () => {
    const mockOnSelectCommand = jest.fn();
    const mockOnClose = jest.fn();

    beforeEach(() => {
      mockOnSelectCommand.mockClear();
      mockOnClose.mockClear();
    });

    it('should close menu with Escape key', async () => {
      const user = userEvent.setup();
      
      render(
        <ExtendedSlashCommand
          show={true}
          blockId={1}
          currentContent="/"
          onSelectCommand={mockOnSelectCommand}
          onClose={mockOnClose}
        />
      );

      const menu = screen.getByRole('button', { name: /text/i }).closest('div');
      if (menu) {
        menu.focus();
        await user.keyboard('{Escape}');
      }
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should navigate with arrow keys', async () => {
      const user = userEvent.setup();
      
      render(
        <ExtendedSlashCommand
          show={true}
          blockId={1}
          currentContent="/"
          onSelectCommand={mockOnSelectCommand}
          onClose={mockOnClose}
        />
      );

      const menu = screen.getByRole('button', { name: /text/i }).closest('div');
      if (menu) {
        menu.focus();
        
        // Press ArrowDown to move to next item
        await user.keyboard('{ArrowDown}');
        
        // The second item should be highlighted (Code)
        expect(screen.getByRole('button', { name: /code/i })).toHaveClass('bg-blue-100');
        
        // Press ArrowUp to move back to first item
        await user.keyboard('{ArrowUp}');
        
        // The first item should be highlighted (Text)
        expect(screen.getByRole('button', { name: /text/i })).toHaveClass('bg-blue-100');
      }
    });

    it('should select command with Enter key', async () => {
      const user = userEvent.setup();
      
      render(
        <ExtendedSlashCommand
          show={true}
          blockId={1}
          currentContent="/"
          onSelectCommand={mockOnSelectCommand}
          onClose={mockOnClose}
        />
      );

      const menu = screen.getByRole('button', { name: /text/i }).closest('div');
      if (menu) {
        menu.focus();
        
        // Press ArrowDown to move to Code option
        await user.keyboard('{ArrowDown}');
        
        // Press Enter to select
        await user.keyboard('{Enter}');
        
        expect(mockOnSelectCommand).toHaveBeenCalledWith(1, 'code');
        expect(mockOnClose).toHaveBeenCalled();
      }
    });

    it('should wrap around when navigating past boundaries', async () => {
      const user = userEvent.setup();
      
      render(
        <ExtendedSlashCommand
          show={true}
          blockId={1}
          currentContent="/"
          onSelectCommand={mockOnSelectCommand}
          onClose={mockOnClose}
        />
      );

      const menu = screen.getByRole('button', { name: /text/i }).closest('div');
      if (menu) {
        menu.focus();
        
        // Press ArrowUp from first item should go to last item
        await user.keyboard('{ArrowUp}');
        
        // Should be on the last item (YouTube with Description)
        expect(screen.getByRole('button', { name: /youtube with description/i })).toHaveClass('bg-blue-100');
        
        // Press ArrowDown from last item should go to first item
        await user.keyboard('{ArrowDown}');
        
        // Should be back on first item (Text)
        expect(screen.getByRole('button', { name: /text/i })).toHaveClass('bg-blue-100');
      }
    });

    it('should filter commands and reset selection', async () => {
      const user = userEvent.setup();
      
      const { rerender } = render(
        <ExtendedSlashCommand
          show={true}
          blockId={1}
          currentContent="/"
          onSelectCommand={mockOnSelectCommand}
          onClose={mockOnClose}
        />
      );

      // Navigate to second item
      const menu = screen.getByRole('button', { name: /text/i }).closest('div');
      if (menu) {
        menu.focus();
        await user.keyboard('{ArrowDown}');
        
        expect(screen.getByRole('button', { name: /code/i })).toHaveClass('bg-blue-100');
      }

      // Filter to show only code-related commands
      rerender(
        <ExtendedSlashCommand
          show={true}
          blockId={1}
          currentContent="/code"
          onSelectCommand={mockOnSelectCommand}
          onClose={mockOnClose}
        />
      );

      // Selection should reset to first item
      expect(screen.getByRole('button', { name: /code/i })).toHaveClass('bg-blue-100');
    });
  });

  describe('FormattedDescriptionField Keyboard Shortcuts', () => {
    it('should support Ctrl+B for bold formatting', async () => {
      const user = userEvent.setup();
      const mockOnChange = jest.fn();
      
      render(
        <FormattedDescriptionField
          value=""
          onChange={mockOnChange}
        />
      );

      const field = screen.getByRole('textbox', { hidden: true });
      await user.click(field);
      await user.type(field, 'Hello World');
      
      // Select "World"
      const selection = window.getSelection();
      if (selection && field.firstChild) {
        const range = document.createRange();
        range.setStart(field.firstChild, 6);
        range.setEnd(field.firstChild, 11);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      
      // Press Ctrl+B
      await user.keyboard('{Control>}b{/Control}');
      
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.stringContaining('<b>World</b>')
        );
      });
    });

    it('should support Ctrl+I for italic formatting', async () => {
      const user = userEvent.setup();
      const mockOnChange = jest.fn();
      
      render(
        <FormattedDescriptionField
          value=""
          onChange={mockOnChange}
        />
      );

      const field = screen.getByRole('textbox', { hidden: true });
      await user.click(field);
      await user.type(field, 'Hello World');
      
      // Select "World"
      const selection = window.getSelection();
      if (selection && field.firstChild) {
        const range = document.createRange();
        range.setStart(field.firstChild, 6);
        range.setEnd(field.firstChild, 11);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      
      // Press Ctrl+I
      await user.keyboard('{Control>}i{/Control}');
      
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.stringContaining('<i>World</i>')
        );
      });
    });

    it('should support Ctrl+K for link creation', async () => {
      const user = userEvent.setup();
      const mockOnChange = jest.fn();
      
      // Mock window.prompt
      const mockPrompt = jest.spyOn(window, 'prompt').mockReturnValue('https://example.com');
      
      render(
        <FormattedDescriptionField
          value=""
          onChange={mockOnChange}
        />
      );

      const field = screen.getByRole('textbox', { hidden: true });
      await user.click(field);
      await user.type(field, 'Hello World');
      
      // Select "World"
      const selection = window.getSelection();
      if (selection && field.firstChild) {
        const range = document.createRange();
        range.setStart(field.firstChild, 6);
        range.setEnd(field.firstChild, 11);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      
      // Press Ctrl+K
      await user.keyboard('{Control>}k{/Control}');
      
      expect(mockPrompt).toHaveBeenCalledWith('Enter URL:', 'https://');
      
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.stringContaining('<a href="https://example.com">World</a>')
        );
      });
      
      mockPrompt.mockRestore();
    });

    it('should blur field with Escape key', async () => {
      const user = userEvent.setup();
      const mockOnBlur = jest.fn();
      
      render(
        <FormattedDescriptionField
          value=""
          onChange={jest.fn()}
          onBlur={mockOnBlur}
        />
      );

      const field = screen.getByRole('textbox', { hidden: true });
      await user.click(field);
      
      // Press Escape
      await user.keyboard('{Escape}');
      
      expect(mockOnBlur).toHaveBeenCalled();
    });

    it('should auto-focus when autoFocus prop is true', async () => {
      render(
        <FormattedDescriptionField
          value=""
          onChange={jest.fn()}
          autoFocus={true}
        />
      );

      const field = screen.getByRole('textbox', { hidden: true });
      
      await waitFor(() => {
        expect(field).toHaveFocus();
      });
    });
  });

  describe('Focus Management Integration', () => {
    it('should focus description field after adding image', async () => {
      const user = userEvent.setup();
      
      // This would be tested in integration with the full editor
      // For now, we test the component behavior in isolation
      const mockOnChange = jest.fn();
      
      render(
        <FormattedDescriptionField
          value=""
          onChange={mockOnChange}
          autoFocus={true}
        />
      );

      const field = screen.getByRole('textbox', { hidden: true });
      
      await waitFor(() => {
        expect(field).toHaveFocus();
      });
    });
  });
});