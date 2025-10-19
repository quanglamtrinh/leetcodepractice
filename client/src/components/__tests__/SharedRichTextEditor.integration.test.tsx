import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import SharedRichTextEditor from '../SharedRichTextEditor';

// Mock the PasteHandler with more realistic behavior
jest.mock('../../services/PasteHandler', () => ({
  pasteHandler: {
    setStartingBlockId: jest.fn(),
    processPastedContent: jest.fn((clipboardData, options) => {
      const htmlData = clipboardData.getData('text/html');
      const textData = clipboardData.getData('text/plain');
      
      if (htmlData && htmlData.includes('<ul>')) {
        return {
          success: true,
          blocks: [
            { id: options.startingBlockId, type: 'bullet', content: 'Pasted bullet 1', placeholder: 'List item', level: 0 },
            { id: options.startingBlockId + 1, type: 'bullet', content: 'Pasted bullet 2', placeholder: 'List item', level: 0 }
          ]
        };
      } else if (textData) {
        return {
          success: true,
          blocks: [
            { id: options.startingBlockId, type: 'text', content: textData, placeholder: 'Type something...' }
          ]
        };
      }
      
      return { success: false, blocks: [], error: 'No content' };
    })
  }
}));

// Mock media components with more realistic behavior
jest.mock('../media/ImageWithDescription', () => {
  const mockReact = require('react');
  return function MockImageWithDescription({ 
    src, alt, description, onDescriptionChange, onImageChange, onRemove, onHTMLGenerate 
  }: any) {
    mockReact.useEffect(() => {
      if (src && onHTMLGenerate) {
        onHTMLGenerate(`<div class="image-block"><img src="${src}" alt="${alt}"/><div class="description">${description}</div></div>`);
      }
    }, [src, alt, description, onHTMLGenerate]);

    return mockReact.createElement('div', {
      'data-testid': 'image-with-description',
      'data-src': src,
      'data-alt': alt,
      'data-description': description
    }, [
      mockReact.createElement('input', {
        key: 'url-input',
        'data-testid': 'image-url-input',
        placeholder: 'Enter image URL',
        onChange: (e: any) => onImageChange?.(e.target.value, 'Image')
      }),
      mockReact.createElement('textarea', {
        key: 'desc-input',
        'data-testid': 'image-description-input',
        placeholder: 'Add description',
        value: description,
        onChange: (e: any) => onDescriptionChange?.(e.target.value)
      }),
      mockReact.createElement('button', {
        key: 'remove-btn',
        'data-testid': 'remove-image',
        onClick: () => onRemove?.()
      }, 'Remove')
    ]);
  };
});

jest.mock('../media/YouTubeWithDescription', () => {
  const mockReact = require('react');
  return function MockYouTubeWithDescription({ 
    videoId, videoUrl, description, onDescriptionChange, onVideoChange, onRemove, onHTMLGenerate 
  }: any) {
    mockReact.useEffect(() => {
      if (videoId && onHTMLGenerate) {
        onHTMLGenerate(`<div class="youtube-block"><iframe src="https://youtube.com/embed/${videoId}"></iframe><div class="description">${description}</div></div>`);
      }
    }, [videoId, videoUrl, description, onHTMLGenerate]);

    return mockReact.createElement('div', {
      'data-testid': 'youtube-with-description',
      'data-video-id': videoId,
      'data-description': description
    }, [
      mockReact.createElement('input', {
        key: 'url-input',
        'data-testid': 'youtube-url-input',
        placeholder: 'Enter YouTube URL',
        onChange: (e: any) => onVideoChange?.('test-video-id', e.target.value)
      }),
      mockReact.createElement('textarea', {
        key: 'desc-input',
        'data-testid': 'youtube-description-input',
        placeholder: 'Add description',
        value: description,
        onChange: (e: any) => onDescriptionChange?.(e.target.value)
      }),
      mockReact.createElement('button', {
        key: 'remove-btn',
        'data-testid': 'remove-youtube',
        onClick: () => onRemove?.()
      }, 'Remove')
    ]);
  };
});

describe('SharedRichTextEditor Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Workflow Tests', () => {
    it('should handle complete note-taking workflow', async () => {
      const onChange = jest.fn();
      const onSave = jest.fn();
      
      render(
        <SharedRichTextEditor 
          value=""
          onChange={onChange}
          onSave={onSave}
          autoSave={true}
          autoSaveDelay={100}
        />
      );

      // 1. Start with a heading
      const textarea = screen.getByPlaceholderText('Type "/" for commands');
      await userEvent.type(textarea, '/heading');
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Heading')).toBeInTheDocument();
      });

      const headingTextarea = screen.getByPlaceholderText('Heading');
      await userEvent.type(headingTextarea, 'My Notes');

      // 2. Add a bullet list
      fireEvent.keyDown(headingTextarea, { key: 'Enter' });
      
      await waitFor(() => {
        const newTextarea = screen.getAllByPlaceholderText('Type something...')[0];
        expect(newTextarea).toBeInTheDocument();
      });

      const textTextarea = screen.getAllByPlaceholderText('Type something...')[0];
      await userEvent.type(textTextarea, '/bullet');
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('List item')).toBeInTheDocument();
      });

      const bulletTextarea = screen.getByPlaceholderText('List item');
      await userEvent.type(bulletTextarea, 'First bullet point');

      // 3. Add indented sub-bullet
      fireEvent.keyDown(bulletTextarea, { key: 'Enter' });
      
      await waitFor(() => {
        const bulletTextareas = screen.getAllByPlaceholderText('List item');
        expect(bulletTextareas).toHaveLength(2);
      });

      const secondBulletTextarea = screen.getAllByPlaceholderText('List item')[1];
      await userEvent.type(secondBulletTextarea, 'Sub-bullet point');
      
      // Indent the sub-bullet
      fireEvent.keyDown(secondBulletTextarea, { key: 'Tab' });
      
      await waitFor(() => {
        expect(secondBulletTextarea.closest('.ml-6')).toBeInTheDocument();
      });

      // 4. Add a todo item
      fireEvent.keyDown(secondBulletTextarea, { key: 'Enter' });
      
      const thirdTextarea = screen.getAllByPlaceholderText('Type something...')[1];
      await userEvent.type(thirdTextarea, '/todo');
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Task item')).toBeInTheDocument();
      });

      const todoTextarea = screen.getByPlaceholderText('Task item');
      await userEvent.type(todoTextarea, 'Complete this task');

      // 5. Check the todo item
      const checkbox = screen.getByRole('checkbox');
      await userEvent.click(checkbox);
      
      expect(checkbox).toBeChecked();

      // 6. Verify auto-save was triggered
      await waitFor(() => {
        expect(onSave).toHaveBeenCalled();
      }, { timeout: 200 });

      // Verify the final structure
      expect(screen.getByDisplayValue('My Notes')).toBeInTheDocument();
      expect(screen.getByDisplayValue('First bullet point')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Sub-bullet point')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Complete this task')).toBeInTheDocument();
    });

    it('should handle media embedding workflow', async () => {
      const onChange = jest.fn();
      
      render(<SharedRichTextEditor value="" onChange={onChange} />);

      // 1. Add an image block
      const textarea = screen.getByPlaceholderText('Type "/" for commands');
      await userEvent.type(textarea, '/image');
      
      await waitFor(() => {
        expect(screen.getByTestId('image-with-description')).toBeInTheDocument();
      });

      // 2. Set image URL and description
      const imageUrlInput = screen.getByTestId('image-url-input');
      const imageDescInput = screen.getByTestId('image-description-input');
      
      await userEvent.type(imageUrlInput, 'https://example.com/image.jpg');
      await userEvent.type(imageDescInput, 'This is a test image');

      // 3. Add a YouTube video
      // First, add a new block
      fireEvent.keyDown(textarea, { key: 'Enter' });
      
      await waitFor(() => {
        const textareas = screen.getAllByPlaceholderText('Type something...');
        expect(textareas.length).toBeGreaterThan(0);
      });

      const newTextarea = screen.getAllByPlaceholderText('Type something...')[0];
      await userEvent.type(newTextarea, '/youtube');
      
      await waitFor(() => {
        expect(screen.getByTestId('youtube-with-description')).toBeInTheDocument();
      });

      // 4. Set YouTube URL and description
      const youtubeUrlInput = screen.getByTestId('youtube-url-input');
      const youtubeDescInput = screen.getByTestId('youtube-description-input');
      
      await userEvent.type(youtubeUrlInput, 'https://youtube.com/watch?v=test');
      await userEvent.type(youtubeDescInput, 'Educational video');

      // Verify both media blocks are present
      expect(screen.getByTestId('image-with-description')).toBeInTheDocument();
      expect(screen.getByTestId('youtube-with-description')).toBeInTheDocument();
      
      // Verify onChange was called
      expect(onChange).toHaveBeenCalled();
    });

    it('should handle complex paste operations', async () => {
      const { pasteHandler } = require('../../services/PasteHandler');
      
      render(<SharedRichTextEditor value="" onChange={jest.fn()} />);

      const textarea = screen.getByPlaceholderText('Type "/" for commands');
      textarea.focus();

      // Simulate pasting HTML with bullet list
      const clipboardData = {
        getData: jest.fn((type) => {
          if (type === 'text/html') {
            return '<ul><li>Pasted bullet 1</li><li>Pasted bullet 2</li></ul>';
          }
          return '';
        })
      };

      const pasteEvent = new ClipboardEvent('paste', {
        clipboardData: clipboardData as any
      });

      act(() => {
        document.dispatchEvent(pasteEvent);
      });

      await waitFor(() => {
        expect(pasteHandler.processPastedContent).toHaveBeenCalled();
        expect(screen.getByDisplayValue('Pasted bullet 1')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Pasted bullet 2')).toBeInTheDocument();
      });

      // Verify bullet points are rendered correctly
      expect(screen.getAllByText('•')).toHaveLength(2);
    });
  });

  describe('Keyboard Navigation and Shortcuts', () => {
    it('should handle complex keyboard navigation', async () => {
      const initialValue = JSON.stringify([
        { id: 1, type: 'text', content: 'First paragraph', placeholder: 'Type something...' },
        { id: 2, type: 'bullet', content: 'Bullet item', level: 0, placeholder: 'List item' },
        { id: 3, type: 'todo', content: 'Todo item', checked: false, placeholder: 'Task item' }
      ]);
      
      render(<SharedRichTextEditor value={initialValue} onChange={jest.fn()} />);

      // Test text formatting shortcuts
      const textTextarea = screen.getByDisplayValue('First paragraph');
      textTextarea.setSelectionRange(0, 5); // Select "First"
      
      // Apply bold formatting
      fireEvent.keyDown(textTextarea, { key: 'b', ctrlKey: true });
      
      await waitFor(() => {
        expect(textTextarea.value).toContain('**First**');
      });

      // Test italic formatting
      textTextarea.setSelectionRange(14, 23); // Select "paragraph"
      fireEvent.keyDown(textTextarea, { key: 'i', ctrlKey: true });
      
      await waitFor(() => {
        expect(textTextarea.value).toContain('*paragraph*');
      });

      // Test link creation
      const originalPrompt = window.prompt;
      window.prompt = jest.fn(() => 'https://example.com');
      
      textTextarea.setSelectionRange(0, 5); // Select "**First**"
      fireEvent.keyDown(textTextarea, { key: 'k', ctrlKey: true });
      
      await waitFor(() => {
        expect(window.prompt).toHaveBeenCalled();
      });
      
      window.prompt = originalPrompt;
    });

    it('should handle list navigation and manipulation', async () => {
      const initialValue = JSON.stringify([
        { id: 1, type: 'bullet', content: 'Item 1', level: 0, placeholder: 'List item' },
        { id: 2, type: 'bullet', content: 'Item 2', level: 1, placeholder: 'List item' },
        { id: 3, type: 'bullet', content: 'Item 3', level: 0, placeholder: 'List item' }
      ]);
      
      render(<SharedRichTextEditor value={initialValue} onChange={jest.fn()} />);

      const item2Textarea = screen.getByDisplayValue('Item 2');
      
      // Test outdenting with Shift+Tab
      fireEvent.keyDown(item2Textarea, { key: 'Tab', shiftKey: true });
      
      await waitFor(() => {
        expect(item2Textarea.closest('.ml-6')).not.toBeInTheDocument();
      });

      // Test indenting with Tab
      const item3Textarea = screen.getByDisplayValue('Item 3');
      fireEvent.keyDown(item3Textarea, { key: 'Tab' });
      
      await waitFor(() => {
        expect(item3Textarea.closest('.ml-6')).toBeInTheDocument();
      });

      // Test converting empty list item to text
      const item1Textarea = screen.getByDisplayValue('Item 1');
      await userEvent.clear(item1Textarea);
      
      fireEvent.keyDown(item1Textarea, { key: 'Enter' });
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Type something...')).toBeInTheDocument();
      });
    });
  });

  describe('Auto-save and State Management', () => {
    it('should handle auto-save with complex content changes', async () => {
      const onChange = jest.fn();
      const onSave = jest.fn();
      
      render(
        <SharedRichTextEditor 
          value=""
          onChange={onChange}
          onSave={onSave}
          autoSave={true}
          autoSaveDelay={50}
        />
      );

      // Make multiple rapid changes
      const textarea = screen.getByPlaceholderText('Type "/" for commands');
      
      await userEvent.type(textarea, 'First change');
      await userEvent.type(textarea, ' Second change');
      await userEvent.type(textarea, ' Third change');

      // Wait for debounced auto-save
      await waitFor(() => {
        expect(onSave).toHaveBeenCalled();
      }, { timeout: 100 });

      // Verify saving indicator appears and disappears
      expect(screen.queryByText('Saving...')).not.toBeInTheDocument();
      expect(screen.getByText(/Last saved:/)).toBeInTheDocument();
    });

    it('should maintain state consistency during rapid operations', async () => {
      const onChange = jest.fn();
      
      render(<SharedRichTextEditor value="" onChange={onChange} />);

      const textarea = screen.getByPlaceholderText('Type "/" for commands');
      
      // Rapid sequence of operations
      await userEvent.type(textarea, '/bullet');
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('List item')).toBeInTheDocument();
      });

      const bulletTextarea = screen.getByPlaceholderText('List item');
      await userEvent.type(bulletTextarea, 'Item 1');
      
      // Add multiple items rapidly
      for (let i = 2; i <= 5; i++) {
        fireEvent.keyDown(bulletTextarea, { key: 'Enter' });
        
        await waitFor(() => {
          const items = screen.getAllByPlaceholderText('List item');
          expect(items).toHaveLength(i);
        });
        
        const newItem = screen.getAllByPlaceholderText('List item')[i - 1];
        await userEvent.type(newItem, `Item ${i}`);
      }

      // Verify all items are present
      for (let i = 1; i <= 5; i++) {
        expect(screen.getByDisplayValue(`Item ${i}`)).toBeInTheDocument();
      }

      // Verify onChange was called appropriately
      expect(onChange).toHaveBeenCalled();
    });
  });

  describe('Error Recovery and Edge Cases', () => {
    it('should recover from paste errors gracefully', async () => {
      const { pasteHandler } = require('../../services/PasteHandler');
      
      // Mock paste handler to return error
      pasteHandler.processPastedContent.mockReturnValueOnce({
        success: false,
        blocks: [],
        error: 'Processing failed'
      });
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      render(<SharedRichTextEditor value="" onChange={jest.fn()} />);

      const textarea = screen.getByPlaceholderText('Type "/" for commands');
      textarea.focus();

      const clipboardData = {
        getData: jest.fn(() => 'Some content')
      };

      const pasteEvent = new ClipboardEvent('paste', {
        clipboardData: clipboardData as any
      });

      act(() => {
        document.dispatchEvent(pasteEvent);
      });

      // Should not crash and should log error
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Paste error:', 'Processing failed');
      });

      // Editor should still be functional
      await userEvent.type(textarea, 'Regular typing still works');
      expect(screen.getByDisplayValue('Regular typing still works')).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });

    it('should handle media component errors', async () => {
      render(<SharedRichTextEditor value="" onChange={jest.fn()} />);

      const textarea = screen.getByPlaceholderText('Type "/" for commands');
      await userEvent.type(textarea, '/image');
      
      await waitFor(() => {
        expect(screen.getByTestId('image-with-description')).toBeInTheDocument();
      });

      // Test removing media component
      const removeButton = screen.getByTestId('remove-image');
      await userEvent.click(removeButton);
      
      await waitFor(() => {
        expect(screen.queryByTestId('image-with-description')).not.toBeInTheDocument();
      });

      // Should fall back to text input
      expect(screen.getByPlaceholderText('Type "/" for commands')).toBeInTheDocument();
    });

    it('should handle maximum block limits', async () => {
      // Create initial content with many blocks
      const manyBlocks = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        type: 'text',
        content: `Block ${i + 1}`,
        placeholder: 'Type something...'
      }));
      
      const initialValue = JSON.stringify(manyBlocks);
      
      render(<SharedRichTextEditor value={initialValue} onChange={jest.fn()} />);

      // Verify all blocks are rendered
      for (let i = 1; i <= 10; i++) {
        expect(screen.getByDisplayValue(`Block ${i}`)).toBeInTheDocument();
      }

      // Test adding more blocks
      const lastTextarea = screen.getByDisplayValue('Block 10');
      fireEvent.keyDown(lastTextarea, { key: 'Enter' });
      
      await waitFor(() => {
        const textareas = screen.getAllByPlaceholderText('Type something...');
        expect(textareas.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Accessibility and User Experience', () => {
    it('should maintain proper focus management', async () => {
      render(<SharedRichTextEditor value="" onChange={jest.fn()} />);

      const textarea = screen.getByPlaceholderText('Type "/" for commands');
      await userEvent.type(textarea, 'First block');
      
      // Add new block
      fireEvent.keyDown(textarea, { key: 'Enter' });
      
      await waitFor(() => {
        const textareas = screen.getAllByPlaceholderText('Type something...');
        expect(textareas).toHaveLength(2);
        // Focus should move to new block
        expect(document.activeElement).toBe(textareas[1]);
      });
    });

    it('should provide proper keyboard shortcuts help', () => {
      render(<SharedRichTextEditor value="" onChange={jest.fn()} autoSave={true} />);
      
      expect(screen.getByText('Ctrl+B: Bold | Ctrl+I: Italic | Ctrl+K: Link | /: Commands')).toBeInTheDocument();
    });

    it('should handle different block types with proper styling', async () => {
      const complexValue = JSON.stringify([
        { id: 1, type: 'heading', content: 'Main Heading', placeholder: 'Heading' },
        { id: 2, type: 'text', content: 'Regular paragraph text', placeholder: 'Type something...' },
        { id: 3, type: 'quote', content: 'This is a quote', placeholder: 'Quote' },
        { id: 4, type: 'code', content: 'console.log("Hello");', placeholder: 'Write your code here...' },
        { id: 5, type: 'divider', content: '', placeholder: '' }
      ]);
      
      render(<SharedRichTextEditor value={complexValue} onChange={jest.fn()} />);

      // Verify different styling is applied
      expect(screen.getByDisplayValue('Main Heading')).toHaveClass('text-2xl', 'font-bold');
      expect(screen.getByDisplayValue('This is a quote')).toHaveClass('italic', 'text-gray-600');
      expect(screen.getByRole('separator')).toBeInTheDocument();
      
      // Code block should be in a special container
      const codeContainer = screen.getByDisplayValue('console.log("Hello");').closest('.border');
      expect(codeContainer).toBeInTheDocument();
    });
  });
});