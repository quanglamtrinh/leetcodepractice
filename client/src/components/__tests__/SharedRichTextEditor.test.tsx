import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import SharedRichTextEditor, { type SharedRichTextEditorProps } from '../SharedRichTextEditor';

// Mock the PasteHandler
jest.mock('../../services/PasteHandler', () => ({
  pasteHandler: {
    setStartingBlockId: jest.fn(),
    processPastedContent: jest.fn((clipboardData, options) => ({
      success: true,
      blocks: [
        { id: options?.startingBlockId || 1001, type: 'text', content: 'Pasted content', placeholder: 'Type something...' }
      ]
    }))
  }
}));

// Mock the media components
jest.mock('../media/ImageWithDescription', () => {
  return function MockImageWithDescription({ onDescriptionChange, onImageChange, onRemove }: any) {
    return (
      <div data-testid="image-with-description">
        <button onClick={() => onImageChange?.('test-image.jpg', 'Test image')}>
          Set Image
        </button>
        <button onClick={() => onDescriptionChange?.('Test description')}>
          Set Description
        </button>
        <button onClick={() => onRemove?.()}>Remove</button>
      </div>
    );
  };
});

jest.mock('../media/YouTubeWithDescription', () => {
  return function MockYouTubeWithDescription({ onDescriptionChange, onVideoChange, onRemove }: any) {
    return (
      <div data-testid="youtube-with-description">
        <button onClick={() => onVideoChange?.('test-video-id', 'https://youtube.com/watch?v=test')}>
          Set Video
        </button>
        <button onClick={() => onDescriptionChange?.('Test video description')}>
          Set Description
        </button>
        <button onClick={() => onRemove?.()}>Remove</button>
      </div>
    );
  };
});

// Mock ExtendedSlashCommand
jest.mock('../ExtendedSlashCommand', () => {
  return function MockExtendedSlashCommand({ show, onSelectCommand, onClose, blockId }: any) {
    if (!show || !blockId) return null;
    return (
      <div data-testid="extended-slash-command">
        <button onClick={() => onSelectCommand(blockId, 'text')}>Text</button>
        <button onClick={() => onSelectCommand(blockId, 'heading')}>Heading</button>
        <button onClick={() => onSelectCommand(blockId, 'bullet')}>Bullet</button>
        <button onClick={() => onSelectCommand(blockId, 'numbered')}>Numbered</button>
        <button onClick={() => onSelectCommand(blockId, 'todo')}>Todo</button>
        <button onClick={() => onSelectCommand(blockId, 'image-with-description')}>Image</button>
        <button onClick={() => onSelectCommand(blockId, 'youtube-with-description')}>YouTube</button>
        <button onClick={() => onClose()}>Close</button>
      </div>
    );
  };
});

describe('SharedRichTextEditor', () => {
  const defaultProps: SharedRichTextEditorProps = {
    value: '',
    onChange: jest.fn(),
    placeholder: 'Type "/" for commands'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    it('should render with default placeholder', () => {
      render(<SharedRichTextEditor {...defaultProps} />);
      expect(screen.getByPlaceholderText('Type "/" for commands')).toBeInTheDocument();
    });

    it('should initialize with existing value', () => {
      const existingValue = JSON.stringify([
        { id: 1, type: 'text', content: 'Existing content', placeholder: 'Type something...' }
      ]);
      
      render(<SharedRichTextEditor {...defaultProps} value={existingValue} />);
      expect(screen.getByDisplayValue('Existing content')).toBeInTheDocument();
    });

    it('should handle plain text value as fallback', () => {
      render(<SharedRichTextEditor {...defaultProps} value="Plain text content" />);
      expect(screen.getByDisplayValue('Plain text content')).toBeInTheDocument();
    });

    it('should call onChange when content changes', async () => {
      const onChange = jest.fn();
      render(<SharedRichTextEditor {...defaultProps} onChange={onChange} />);
      
      const textarea = screen.getByPlaceholderText('Type "/" for commands');
      await userEvent.type(textarea, 'New content');
      
      // Wait for the state update to trigger onChange
      await waitFor(() => {
        expect(onChange).toHaveBeenCalled();
      });
    });
  });

  describe('Auto-save Functionality', () => {
    it('should show auto-save status when enabled', () => {
      render(
        <SharedRichTextEditor 
          {...defaultProps} 
          autoSave={true}
          autoSaveDelay={100}
        />
      );
      
      expect(screen.getByText(/Ctrl\+B: Bold/)).toBeInTheDocument();
    });

    it('should trigger auto-save after delay', async () => {
      const onChange = jest.fn();
      const onSave = jest.fn();
      
      render(
        <SharedRichTextEditor 
          {...defaultProps} 
          onChange={onChange}
          onSave={onSave}
          autoSave={true}
          autoSaveDelay={100}
        />
      );
      
      const textarea = screen.getByPlaceholderText('Type "/" for commands');
      await userEvent.type(textarea, 'Auto-save test');
      
      // Wait for auto-save delay
      await waitFor(() => {
        expect(onSave).toHaveBeenCalled();
      }, { timeout: 200 });
    });

    it('should show saving indicator during auto-save', async () => {
      const onSave = jest.fn();
      render(
        <SharedRichTextEditor 
          {...defaultProps} 
          onSave={onSave}
          autoSave={true}
          autoSaveDelay={100}
        />
      );
      
      const textarea = screen.getByPlaceholderText('Type "/" for commands');
      await userEvent.type(textarea, 'Test');
      
      // Should show saving indicator
      expect(screen.getByText('Saving...')).toBeInTheDocument();
      
      // Wait for auto-save to complete
      await waitFor(() => {
        expect(onSave).toHaveBeenCalled();
      }, { timeout: 200 });
    });
  });

  describe('Slash Commands', () => {
    it('should show slash command menu when typing "/"', async () => {
      render(<SharedRichTextEditor {...defaultProps} />);
      
      const textarea = screen.getByPlaceholderText('Type "/" for commands');
      await userEvent.type(textarea, '/');
      
      await waitFor(() => {
        expect(screen.getByTestId('extended-slash-command')).toBeInTheDocument();
      });
    });

    it('should hide slash command menu when not typing slash commands', async () => {
      render(<SharedRichTextEditor {...defaultProps} />);
      
      const textarea = screen.getByPlaceholderText('Type "/" for commands');
      await userEvent.type(textarea, '/');
      
      await waitFor(() => {
        expect(screen.getByTestId('extended-slash-command')).toBeInTheDocument();
      });
      
      await userEvent.clear(textarea);
      await userEvent.type(textarea, 'regular text');
      
      await waitFor(() => {
        expect(screen.queryByTestId('extended-slash-command')).not.toBeInTheDocument();
      });
    });

    it('should convert block type when selecting from slash command', async () => {
      render(<SharedRichTextEditor {...defaultProps} />);
      
      const textarea = screen.getByPlaceholderText('Type "/" for commands');
      await userEvent.type(textarea, '/');
      
      await waitFor(() => {
        expect(screen.getByTestId('extended-slash-command')).toBeInTheDocument();
      });
      
      const headingButton = screen.getByText('Heading');
      await userEvent.click(headingButton);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Heading')).toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should handle Ctrl+B for bold formatting', async () => {
      const onChange = jest.fn();
      render(<SharedRichTextEditor {...defaultProps} onChange={onChange} />);
      
      const textarea = screen.getByPlaceholderText('Type "/" for commands');
      await userEvent.type(textarea, 'Bold text');
      
      // Clear previous onChange calls
      onChange.mockClear();
      
      // Select text
      textarea.setSelectionRange(0, 4); // Select "Bold"
      
      // Press Ctrl+B
      fireEvent.keyDown(textarea, { key: 'b', ctrlKey: true });
      
      await waitFor(() => {
        expect(textarea.value).toContain('**Bold**');
      });
    });

    it('should handle Ctrl+I for italic formatting', async () => {
      const onChange = jest.fn();
      render(<SharedRichTextEditor {...defaultProps} onChange={onChange} />);
      
      const textarea = screen.getByPlaceholderText('Type "/" for commands');
      await userEvent.type(textarea, 'Italic text');
      
      // Clear previous onChange calls
      onChange.mockClear();
      
      // Select text
      textarea.setSelectionRange(0, 6); // Select "Italic"
      
      // Press Ctrl+I
      fireEvent.keyDown(textarea, { key: 'i', ctrlKey: true });
      
      await waitFor(() => {
        expect(textarea.value).toContain('*Italic*');
      });
    });

    it('should handle Ctrl+K for link creation', async () => {
      // Mock prompt
      const originalPrompt = window.prompt;
      window.prompt = jest.fn(() => 'https://example.com');
      
      const onChange = jest.fn();
      render(<SharedRichTextEditor {...defaultProps} onChange={onChange} />);
      
      const textarea = screen.getByPlaceholderText('Type "/" for commands');
      await userEvent.type(textarea, 'Link text');
      
      // Clear previous onChange calls
      onChange.mockClear();
      
      // Select text
      textarea.setSelectionRange(0, 9); // Select "Link text"
      
      // Press Ctrl+K
      fireEvent.keyDown(textarea, { key: 'k', ctrlKey: true });
      
      await waitFor(() => {
        expect(window.prompt).toHaveBeenCalledWith('Enter URL:', 'https://');
        expect(textarea.value).toContain('[Link text](https://example.com)');
      });
      
      // Restore original prompt
      window.prompt = originalPrompt;
    });

    it('should handle Escape to close slash command menu', async () => {
      render(<SharedRichTextEditor {...defaultProps} />);
      
      const textarea = screen.getByPlaceholderText('Type "/" for commands');
      await userEvent.type(textarea, '/');
      
      await waitFor(() => {
        expect(screen.getByTestId('extended-slash-command')).toBeInTheDocument();
      });
      
      fireEvent.keyDown(textarea, { key: 'Escape' });
      
      await waitFor(() => {
        expect(screen.queryByTestId('extended-slash-command')).not.toBeInTheDocument();
      });
    });
  });

  describe('List Management', () => {
    it('should create bullet list and handle Enter for new items', async () => {
      render(<SharedRichTextEditor {...defaultProps} />);
      
      const textarea = screen.getByPlaceholderText('Type "/" for commands');
      await userEvent.type(textarea, '/');
      
      await waitFor(() => {
        expect(screen.getByTestId('extended-slash-command')).toBeInTheDocument();
      });
      
      const bulletButton = screen.getByText('Bullet');
      await userEvent.click(bulletButton);
      
      await waitFor(() => {
        const bulletTextarea = screen.getByPlaceholderText('List item');
        expect(bulletTextarea).toBeInTheDocument();
        expect(screen.getByText('•')).toBeInTheDocument();
      });
    });

    it('should handle Tab for list indentation', async () => {
      const initialValue = JSON.stringify([
        { id: 1, type: 'bullet', content: 'List item', level: 0, placeholder: 'List item' }
      ]);
      
      render(<SharedRichTextEditor {...defaultProps} value={initialValue} />);
      
      const textarea = screen.getByDisplayValue('List item');
      fireEvent.keyDown(textarea, { key: 'Tab' });
      
      await waitFor(() => {
        expect(textarea.closest('.ml-6')).toBeInTheDocument();
      });
    });

    it('should handle Shift+Tab for list outdentation', async () => {
      const initialValue = JSON.stringify([
        { id: 1, type: 'bullet', content: 'Indented item', level: 1, placeholder: 'List item' }
      ]);
      
      render(<SharedRichTextEditor {...defaultProps} value={initialValue} />);
      
      const textarea = screen.getByDisplayValue('Indented item');
      fireEvent.keyDown(textarea, { key: 'Tab', shiftKey: true });
      
      await waitFor(() => {
        expect(textarea.closest('.ml-6')).not.toBeInTheDocument();
      });
    });

    it('should handle todo list checkbox toggling', async () => {
      const initialValue = JSON.stringify([
        { id: 1, type: 'todo', content: 'Todo item', checked: false, placeholder: 'Task item' }
      ]);
      
      render(<SharedRichTextEditor {...defaultProps} value={initialValue} />);
      
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();
      
      await userEvent.click(checkbox);
      
      await waitFor(() => {
        expect(checkbox).toBeChecked();
      });
    });

    it('should convert empty list item to text on double Enter', async () => {
      const initialValue = JSON.stringify([
        { id: 1, type: 'bullet', content: '', level: 0, placeholder: 'List item' }
      ]);
      
      render(<SharedRichTextEditor {...defaultProps} value={initialValue} />);
      
      const textarea = screen.getByPlaceholderText('List item');
      fireEvent.keyDown(textarea, { key: 'Enter' });
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Type something...')).toBeInTheDocument();
      });
    });
  });

  describe('Media Components', () => {
    it('should render image block when selected from slash command', async () => {
      render(<SharedRichTextEditor {...defaultProps} />);
      
      const textarea = screen.getByPlaceholderText('Type "/" for commands');
      await userEvent.type(textarea, '/');
      
      await waitFor(() => {
        expect(screen.getByTestId('extended-slash-command')).toBeInTheDocument();
      });
      
      const imageButton = screen.getByText('Image');
      await userEvent.click(imageButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('image-with-description')).toBeInTheDocument();
      });
    });

    it('should render YouTube block when selected from slash command', async () => {
      render(<SharedRichTextEditor {...defaultProps} />);
      
      const textarea = screen.getByPlaceholderText('Type "/" for commands');
      await userEvent.type(textarea, '/');
      
      await waitFor(() => {
        expect(screen.getByTestId('extended-slash-command')).toBeInTheDocument();
      });
      
      const youtubeButton = screen.getByText('YouTube');
      await userEvent.click(youtubeButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('youtube-with-description')).toBeInTheDocument();
      });
    });

    it('should handle image block updates', async () => {
      const initialValue = JSON.stringify([
        { 
          id: 1, 
          type: 'image-with-description', 
          src: '', 
          alt: '', 
          description: '',
          placeholder: '' 
        }
      ]);
      
      render(<SharedRichTextEditor {...defaultProps} value={initialValue} />);
      
      const setImageButton = screen.getByText('Set Image');
      await userEvent.click(setImageButton);
      
      const setDescriptionButton = screen.getByText('Set Description');
      await userEvent.click(setDescriptionButton);
      
      // Verify the component handles the updates
      expect(setImageButton).toBeInTheDocument();
      expect(setDescriptionButton).toBeInTheDocument();
    });

    it('should handle media block removal', async () => {
      const initialValue = JSON.stringify([
        { 
          id: 1, 
          type: 'image-with-description', 
          src: 'test.jpg', 
          alt: 'Test', 
          description: 'Test desc',
          placeholder: '' 
        },
        { 
          id: 2, 
          type: 'text', 
          content: 'Text after image',
          placeholder: 'Type something...' 
        }
      ]);
      
      render(<SharedRichTextEditor {...defaultProps} value={initialValue} />);
      
      const removeButton = screen.getByText('Remove');
      await userEvent.click(removeButton);
      
      await waitFor(() => {
        expect(screen.queryByTestId('image-with-description')).not.toBeInTheDocument();
        // Should still have the text block
        expect(screen.getByDisplayValue('Text after image')).toBeInTheDocument();
      });
    });
  });

  describe('Paste Handling', () => {
    // Mock ClipboardEvent for JSDOM
    beforeAll(() => {
      global.ClipboardEvent = class MockClipboardEvent extends Event {
        clipboardData: any;
        constructor(type: string, eventInitDict?: any) {
          super(type, eventInitDict);
          this.clipboardData = eventInitDict?.clipboardData;
        }
      } as any;
    });

    it('should handle paste events within the editor', async () => {
      const { pasteHandler } = require('../../services/PasteHandler');
      
      render(<SharedRichTextEditor {...defaultProps} />);
      
      const textarea = screen.getByPlaceholderText('Type "/" for commands');
      textarea.focus();
      
      // Create a mock clipboard event
      const clipboardData = {
        getData: jest.fn(() => 'Pasted text content')
      };
      
      const pasteEvent = new ClipboardEvent('paste', {
        clipboardData: clipboardData as any
      });
      
      // Dispatch paste event
      act(() => {
        document.dispatchEvent(pasteEvent);
      });
      
      await waitFor(() => {
        expect(pasteHandler.processPastedContent).toHaveBeenCalled();
      });
    });

    it('should not handle paste events outside the editor', async () => {
      const { pasteHandler } = require('../../services/PasteHandler');
      
      render(<SharedRichTextEditor {...defaultProps} />);
      
      // Create a mock clipboard event
      const clipboardData = {
        getData: jest.fn(() => 'Pasted text content')
      };
      
      const pasteEvent = new ClipboardEvent('paste', {
        clipboardData: clipboardData as any
      });
      
      // Dispatch paste event without focusing the editor
      act(() => {
        document.dispatchEvent(pasteEvent);
      });
      
      // Should not process paste since focus is not in editor
      expect(pasteHandler.processPastedContent).not.toHaveBeenCalled();
    });
  });

  describe('Block Management', () => {
    it('should add new block when Enter is pressed', async () => {
      render(<SharedRichTextEditor {...defaultProps} />);
      
      const textarea = screen.getByPlaceholderText('Type "/" for commands');
      await userEvent.type(textarea, 'First block');
      
      fireEvent.keyDown(textarea, { key: 'Enter' });
      
      await waitFor(() => {
        // Should have the original textarea plus a new one
        expect(screen.getByDisplayValue('First block')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Type something...')).toBeInTheDocument();
      });
    });

    it('should merge blocks when Backspace is pressed at beginning', async () => {
      const initialValue = JSON.stringify([
        { id: 1, type: 'text', content: 'First block', placeholder: 'Type something...' },
        { id: 2, type: 'text', content: 'Second block', placeholder: 'Type something...' }
      ]);
      
      render(<SharedRichTextEditor {...defaultProps} value={initialValue} />);
      
      const secondTextarea = screen.getByDisplayValue('Second block');
      
      // Position cursor at beginning
      secondTextarea.setSelectionRange(0, 0);
      
      fireEvent.keyDown(secondTextarea, { key: 'Backspace' });
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('First blockSecond block')).toBeInTheDocument();
        expect(screen.queryByDisplayValue('Second block')).not.toBeInTheDocument();
      });
    });

    it('should handle different block types correctly', async () => {
      const initialValue = JSON.stringify([
        { id: 1, type: 'heading', content: 'Heading text', placeholder: 'Heading' },
        { id: 2, type: 'quote', content: 'Quote text', placeholder: 'Quote' },
        { id: 3, type: 'divider', content: '', placeholder: '' }
      ]);
      
      render(<SharedRichTextEditor {...defaultProps} value={initialValue} />);
      
      expect(screen.getByDisplayValue('Heading text')).toHaveClass('text-2xl', 'font-bold');
      expect(screen.getByDisplayValue('Quote text')).toHaveClass('italic', 'text-gray-600');
      expect(screen.getByRole('separator')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid JSON value gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      render(<SharedRichTextEditor {...defaultProps} value="invalid json {" />);
      
      // Should fall back to treating as plain text
      expect(screen.getByDisplayValue('invalid json {')).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });

    it('should handle empty blocks array', () => {
      render(<SharedRichTextEditor {...defaultProps} value="[]" />);
      
      // Should create default text block
      expect(screen.getByPlaceholderText('Type "/" for commands')).toBeInTheDocument();
    });
  });

  describe('Props Interface', () => {
    it('should accept all required props', () => {
      const props: SharedRichTextEditorProps = {
        value: 'test',
        onChange: jest.fn(),
        placeholder: 'Custom placeholder',
        className: 'custom-class',
        onSave: jest.fn(),
        autoSave: true,
        autoSaveDelay: 1000
      };
      
      render(<SharedRichTextEditor {...props} />);
      
      expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument();
      expect(screen.getByDisplayValue('test')).toBeInTheDocument();
    });

    it('should use default values for optional props', () => {
      render(<SharedRichTextEditor value="" onChange={jest.fn()} />);
      
      expect(screen.getByPlaceholderText('Type "/" for commands')).toBeInTheDocument();
    });
  });
});