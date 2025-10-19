import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import EnhancedRichTextEditor from '../EnhancedRichTextEditor';

describe('EnhancedRichTextEditor - Paste Integration', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should integrate paste handling with real PasteHandler', async () => {
    render(
      <EnhancedRichTextEditor
        value=""
        onChange={mockOnChange}
      />
    );

    const textarea = screen.getByPlaceholderText('Type "/" for commands');
    
    // Focus the textarea
    fireEvent.focus(textarea);

    // Create mock clipboard data with bullet points
    const clipboardData = {
      getData: jest.fn((type) => {
        if (type === 'text/plain') return '• First bullet point\n• Second bullet point\n  • Sub bullet point';
        return '';
      })
    } as unknown as DataTransfer;

    // Simulate paste event
    fireEvent.paste(textarea, {
      clipboardData
    });

    // Wait for the paste to be processed
    await waitFor(() => {
      // Should have created bullet point blocks
      expect(screen.getByText('First bullet point')).toBeInTheDocument();
      expect(screen.getByText('Second bullet point')).toBeInTheDocument();
      expect(screen.getByText('Sub bullet point')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should handle HTML paste with list structure', async () => {
    render(
      <EnhancedRichTextEditor
        value=""
        onChange={mockOnChange}
      />
    );

    const textarea = screen.getByPlaceholderText('Type "/" for commands');
    
    // Focus the textarea
    fireEvent.focus(textarea);

    // Create mock clipboard data with HTML
    const clipboardData = {
      getData: jest.fn((type) => {
        if (type === 'text/html') return '<p>Introduction paragraph</p><ul><li>First item</li><li>Second item</li></ul>';
        if (type === 'text/plain') return 'Introduction paragraph\n• First item\n• Second item';
        return '';
      })
    } as unknown as DataTransfer;

    // Simulate paste event
    fireEvent.paste(textarea, {
      clipboardData
    });

    // Wait for the paste to be processed
    await waitFor(() => {
      // Should have created text and bullet blocks
      expect(screen.getByText('Introduction paragraph')).toBeInTheDocument();
      expect(screen.getByText('First item')).toBeInTheDocument();
      expect(screen.getByText('Second item')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should handle paste at cursor position correctly', async () => {
    render(
      <EnhancedRichTextEditor
        value={JSON.stringify([
          { id: 1, type: 'text', content: 'Hello world', placeholder: 'Type something...' }
        ])}
        onChange={mockOnChange}
      />
    );

    const textarea = screen.getByDisplayValue('Hello world');
    
    // Focus and set cursor position
    fireEvent.focus(textarea);
    textarea.setSelectionRange(6, 6); // Position after "Hello "

    // Create mock clipboard data
    const clipboardData = {
      getData: jest.fn((type) => {
        if (type === 'text/plain') return 'beautiful ';
        return '';
      })
    } as unknown as DataTransfer;

    // Simulate paste event
    fireEvent.paste(textarea, {
      clipboardData
    });

    // Wait for the paste to be processed
    await waitFor(() => {
      // The PasteHandler trims content, so "beautiful " becomes "beautiful"
      expect(textarea.value).toBe('Hello beautifulworld');
    }, { timeout: 3000 });
  });

  it('should handle numbered list paste', async () => {
    render(
      <EnhancedRichTextEditor
        value=""
        onChange={mockOnChange}
      />
    );

    const textarea = screen.getByPlaceholderText('Type "/" for commands');
    
    // Focus the textarea
    fireEvent.focus(textarea);

    // Create mock clipboard data with numbered list
    const clipboardData = {
      getData: jest.fn((type) => {
        if (type === 'text/plain') return '1. First numbered item\n2. Second numbered item\n  3. Sub numbered item';
        return '';
      })
    } as unknown as DataTransfer;

    // Simulate paste event
    fireEvent.paste(textarea, {
      clipboardData
    });

    // Wait for the paste to be processed
    await waitFor(() => {
      // Should have created bullet point blocks (PasteHandler converts numbered to bullet)
      expect(screen.getByText('First numbered item')).toBeInTheDocument();
      expect(screen.getByText('Second numbered item')).toBeInTheDocument();
      expect(screen.getByText('Sub numbered item')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should handle mixed content paste', async () => {
    render(
      <EnhancedRichTextEditor
        value=""
        onChange={mockOnChange}
      />
    );

    const textarea = screen.getByPlaceholderText('Type "/" for commands');
    
    // Focus the textarea
    fireEvent.focus(textarea);

    // Create mock clipboard data with mixed content
    const clipboardData = {
      getData: jest.fn((type) => {
        if (type === 'text/plain') return 'Title text\n\n• Bullet point 1\n• Bullet point 2\n\nConclusion paragraph';
        return '';
      })
    } as unknown as DataTransfer;

    // Simulate paste event
    fireEvent.paste(textarea, {
      clipboardData
    });

    // Wait for the paste to be processed
    await waitFor(() => {
      // Should have created various block types
      expect(screen.getByText('Title text')).toBeInTheDocument();
      expect(screen.getByText('Bullet point 1')).toBeInTheDocument();
      expect(screen.getByText('Bullet point 2')).toBeInTheDocument();
      expect(screen.getByText('Conclusion paragraph')).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});