import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import EnhancedRichTextEditor from '../EnhancedRichTextEditor';

// Mock the PasteHandler
jest.mock('../../services/PasteHandler', () => ({
  pasteHandler: {
    setStartingBlockId: jest.fn(),
    processPastedContent: jest.fn(),
  },
}));

import { pasteHandler } from '../../services/PasteHandler';

describe('EnhancedRichTextEditor - Paste Handling', () => {
  const mockOnChange = jest.fn();
  const mockPasteHandler = pasteHandler as jest.Mocked<typeof pasteHandler>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle paste event with single text block', async () => {
    mockPasteHandler.processPastedContent.mockReturnValue({
      blocks: [
        {
          id: 1001,
          type: 'text',
          content: 'Pasted content',
          placeholder: 'Type something...'
        }
      ],
      success: true
    });

    render(
      <EnhancedRichTextEditor
        value=""
        onChange={mockOnChange}
      />
    );

    const textarea = screen.getByPlaceholderText('Type "/" for commands');
    
    // Focus the textarea
    fireEvent.focus(textarea);

    // Create mock clipboard data
    const clipboardData = {
      getData: jest.fn((type) => {
        if (type === 'text/plain') return 'Pasted content';
        return '';
      })
    } as unknown as DataTransfer;

    // Simulate paste event
    fireEvent.paste(textarea, {
      clipboardData
    });

    await waitFor(() => {
      expect(mockPasteHandler.processPastedContent).toHaveBeenCalledWith(
        clipboardData,
        expect.objectContaining({
          startingBlockId: expect.any(Number),
          maxBlocks: 50
        })
      );
    });
  });

  it('should handle paste event with multiple blocks', async () => {
    mockPasteHandler.processPastedContent.mockReturnValue({
      blocks: [
        {
          id: 1001,
          type: 'text',
          content: 'First paragraph',
          placeholder: 'Type something...'
        },
        {
          id: 1002,
          type: 'bullet',
          content: 'First bullet point',
          placeholder: 'List item',
          level: 0
        },
        {
          id: 1003,
          type: 'bullet',
          content: 'Second bullet point',
          placeholder: 'List item',
          level: 0
        }
      ],
      success: true
    });

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
        if (type === 'text/html') return '<p>First paragraph</p><ul><li>First bullet point</li><li>Second bullet point</li></ul>';
        if (type === 'text/plain') return 'First paragraph\n• First bullet point\n• Second bullet point';
        return '';
      })
    } as unknown as DataTransfer;

    // Simulate paste event
    fireEvent.paste(textarea, {
      clipboardData
    });

    await waitFor(() => {
      expect(mockPasteHandler.processPastedContent).toHaveBeenCalledWith(
        clipboardData,
        expect.objectContaining({
          startingBlockId: expect.any(Number),
          maxBlocks: 50
        })
      );
    });
  });

  it('should handle paste error gracefully', async () => {
    mockPasteHandler.processPastedContent.mockReturnValue({
      blocks: [],
      success: false,
      error: 'Invalid content'
    });

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <EnhancedRichTextEditor
        value=""
        onChange={mockOnChange}
      />
    );

    const textarea = screen.getByPlaceholderText('Type "/" for commands');
    
    // Focus the textarea
    fireEvent.focus(textarea);

    // Create mock clipboard data
    const clipboardData = {
      getData: jest.fn(() => 'some content')
    } as unknown as DataTransfer;

    // Simulate paste event
    fireEvent.paste(textarea, {
      clipboardData
    });

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Block paste error:', 'Invalid content');
    });

    consoleSpy.mockRestore();
  });

  it('should handle paste at cursor position within existing content', async () => {
    mockPasteHandler.processPastedContent.mockReturnValue({
      blocks: [
        {
          id: 1001,
          type: 'text',
          content: 'inserted text',
          placeholder: 'Type something...'
        }
      ],
      success: true
    });

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
        if (type === 'text/plain') return 'inserted text';
        return '';
      })
    } as unknown as DataTransfer;

    // Simulate paste event
    fireEvent.paste(textarea, {
      clipboardData
    });

    await waitFor(() => {
      expect(mockPasteHandler.processPastedContent).toHaveBeenCalled();
    });
  });

  it('should handle paste with no clipboard data', async () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    render(
      <EnhancedRichTextEditor
        value=""
        onChange={mockOnChange}
      />
    );

    const textarea = screen.getByPlaceholderText('Type "/" for commands');
    
    // Focus the textarea
    fireEvent.focus(textarea);

    // Simulate paste event without clipboard data
    fireEvent.paste(textarea, {});

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('No clipboard data available');
    });

    consoleSpy.mockRestore();
  });

  it('should fallback to plain text on processing error', async () => {
    mockPasteHandler.processPastedContent.mockImplementation(() => {
      throw new Error('Processing failed');
    });

    render(
      <EnhancedRichTextEditor
        value={JSON.stringify([
          { id: 1, type: 'text', content: 'Hello', placeholder: 'Type something...' }
        ])}
        onChange={mockOnChange}
      />
    );

    const textarea = screen.getByDisplayValue('Hello');
    
    // Focus and set cursor position
    fireEvent.focus(textarea);
    textarea.setSelectionRange(5, 5); // Position at end

    // Create mock clipboard data
    const clipboardData = {
      getData: jest.fn((type) => {
        if (type === 'text/plain') return ' world';
        return '';
      })
    } as unknown as DataTransfer;

    // Simulate paste event
    fireEvent.paste(textarea, {
      clipboardData
    });

    // Should fallback to plain text insertion
    await waitFor(() => {
      expect(textarea.value).toBe('Hello world');
    });
  });
});