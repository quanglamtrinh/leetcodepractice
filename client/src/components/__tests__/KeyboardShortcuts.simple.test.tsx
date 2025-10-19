import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import EnhancedRichTextEditor from '../EnhancedRichTextEditor';
import ExtendedSlashCommand from '../ExtendedSlashCommand';
import FormattedDescriptionField from '../media/FormattedDescriptionField';

describe('Keyboard Shortcuts - Simple Tests', () => {
  describe('EnhancedRichTextEditor', () => {
    it('should render without crashing', () => {
      render(
        <EnhancedRichTextEditor
          value=""
          onChange={jest.fn()}
        />
      );
      
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should handle keyboard events', () => {
      const mockOnChange = jest.fn();
      render(
        <EnhancedRichTextEditor
          value=""
          onChange={mockOnChange}
        />
      );

      const textarea = screen.getByRole('textbox');
      
      // Test Ctrl+B keydown event
      fireEvent.keyDown(textarea, {
        key: 'b',
        ctrlKey: true,
        preventDefault: jest.fn()
      });
      
      // Should not crash
      expect(textarea).toBeInTheDocument();
    });
  });

  describe('ExtendedSlashCommand', () => {
    it('should render menu when shown', () => {
      render(
        <ExtendedSlashCommand
          show={true}
          blockId={1}
          currentContent="/"
          onSelectCommand={jest.fn()}
          onClose={jest.fn()}
        />
      );

      expect(screen.getByText('Text')).toBeInTheDocument();
      expect(screen.getByText('Code')).toBeInTheDocument();
    });

    it('should handle keyboard navigation', () => {
      const mockOnClose = jest.fn();
      
      render(
        <ExtendedSlashCommand
          show={true}
          blockId={1}
          currentContent="/"
          onSelectCommand={jest.fn()}
          onClose={mockOnClose}
        />
      );

      const menu = screen.getByText('Text').closest('div');
      
      // Test Escape key
      fireEvent.keyDown(menu!, {
        key: 'Escape',
        preventDefault: jest.fn()
      });
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should highlight selected option', () => {
      render(
        <ExtendedSlashCommand
          show={true}
          blockId={1}
          currentContent="/"
          onSelectCommand={jest.fn()}
          onClose={jest.fn()}
        />
      );

      // First option should be highlighted by default
      const firstOption = screen.getByText('Text').closest('button');
      expect(firstOption).toHaveClass('bg-blue-100');
    });
  });

  describe('FormattedDescriptionField', () => {
    it('should render contenteditable field', () => {
      render(
        <FormattedDescriptionField
          value=""
          onChange={jest.fn()}
        />
      );

      const field = screen.getByRole('textbox', { hidden: true });
      expect(field).toBeInTheDocument();
      expect(field).toHaveAttribute('contenteditable', 'true');
    });

    it('should show formatting toolbar when editing', () => {
      render(
        <FormattedDescriptionField
          value=""
          onChange={jest.fn()}
        />
      );

      const field = screen.getByRole('textbox', { hidden: true });
      
      // Focus the field to start editing
      fireEvent.focus(field);
      
      // Should show formatting toolbar
      expect(screen.getByTitle('Bold (Ctrl+B)')).toBeInTheDocument();
      expect(screen.getByTitle('Italic (Ctrl+I)')).toBeInTheDocument();
    });

    it('should handle keyboard shortcuts', () => {
      const mockOnChange = jest.fn();
      
      render(
        <FormattedDescriptionField
          value=""
          onChange={mockOnChange}
        />
      );

      const field = screen.getByRole('textbox', { hidden: true });
      fireEvent.focus(field);
      
      // Test Ctrl+B
      fireEvent.keyDown(field, {
        key: 'b',
        ctrlKey: true,
        preventDefault: jest.fn()
      });
      
      // Should not crash
      expect(field).toBeInTheDocument();
    });
  });
});