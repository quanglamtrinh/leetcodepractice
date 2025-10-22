import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock novel module
jest.mock('novel');

// Mock fetch
global.fetch = jest.fn();

// Mock @tiptap/react and @tiptap/core
jest.mock('@tiptap/react', () => ({
  Editor: jest.fn(),
}));

jest.mock('@tiptap/core', () => ({
  Range: jest.fn(),
}));

// Import after mocking
import NovelNotesTab from '../NovelNotesTab';
import { Problem } from '../ProblemList';

const createMockProblem = (notes: string): Problem => ({
  id: 1,
  title: 'Test Problem',
  concept: 'Arrays & Hashing',
  difficulty: 'Easy',
  notes,
  solution: '',
  solved: false,
  in_review_cycle: false,
  next_review_date: undefined
});

describe('NovelNotesTab Migration Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
    });
    
    // Suppress console logs during tests for cleaner output
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Block Format Migration', () => {
    test('migrates old block format with various block types', async () => {
      const blockFormatNotes = JSON.stringify([
        { id: '1', type: 'heading', content: 'Problem Analysis', level: 1 },
        { id: '2', type: 'text', content: 'This is a regular paragraph.' },
        { id: '3', type: 'bullet', content: 'Time complexity: O(n)' },
        { id: '4', type: 'numbered', content: 'Step 1: Initialize variables' },
        { id: '5', type: 'todo', content: 'Review edge cases', checked: false },
        { id: '6', type: 'code', content: 'def solution():\n    return True', language: 'python' },
        { id: '7', type: 'quote', content: 'Optimization is key to success.' },
        { id: '8', type: 'divider', content: '' },
        { id: '9', type: 'unknown_type', content: 'This should become a paragraph' }
      ]);

      const problem = createMockProblem(blockFormatNotes);
      render(<NovelNotesTab problem={problem} />);

      await waitFor(() => {
        expect(screen.getByTestId('editor-root')).toBeInTheDocument();
      });

      // Verify that the component loaded successfully without errors
      expect(screen.queryByText(/Failed to load notes/)).not.toBeInTheDocument();
    });

    test('handles corrupted block format gracefully', async () => {
      const corruptedBlocks = JSON.stringify([
        { id: '1', type: 'heading', content: 'Valid heading' },
        null, // Invalid block
        { id: '3', type: 'text' }, // Missing content
        { type: 'bullet', content: 'Missing ID' },
        'invalid block string', // Not an object
        { id: '6', type: 'code', content: 'Valid code block' }
      ]);

      const problem = createMockProblem(corruptedBlocks);
      render(<NovelNotesTab problem={problem} />);

      await waitFor(() => {
        expect(screen.getByTestId('editor-root')).toBeInTheDocument();
      });

      // Should handle gracefully without crashing
      expect(screen.queryByText(/Failed to load notes/)).not.toBeInTheDocument();
    });

    test('migrates empty block array', async () => {
      const emptyBlocks = JSON.stringify([]);
      const problem = createMockProblem(emptyBlocks);
      
      render(<NovelNotesTab problem={problem} />);

      await waitFor(() => {
        expect(screen.getByTestId('editor-root')).toBeInTheDocument();
      });

      expect(screen.queryByText(/Failed to load notes/)).not.toBeInTheDocument();
    });
  });

  describe('HTML Format Migration', () => {
    test('migrates HTML content to Novel format', async () => {
      const htmlNotes = `
        <h1>Problem Solution</h1>
        <p>This is a paragraph with <strong>bold</strong> and <em>italic</em> text.</p>
        <ul>
          <li>First bullet point</li>
          <li>Second bullet point</li>
        </ul>
        <ol>
          <li>First numbered item</li>
          <li>Second numbered item</li>
        </ol>
        <blockquote>This is a quote</blockquote>
        <pre><code>function example() { return true; }</code></pre>
        <hr>
        <div>Content in a div</div>
      `;

      const problem = createMockProblem(htmlNotes);
      render(<NovelNotesTab problem={problem} />);

      await waitFor(() => {
        expect(screen.getByTestId('editor-root')).toBeInTheDocument();
      });

      expect(screen.queryByText(/Failed to load notes/)).not.toBeInTheDocument();
    });

    test('handles malformed HTML gracefully', async () => {
      const malformedHtml = '<h1>Unclosed heading<p>Missing closing tag<div><span>Nested unclosed';
      const problem = createMockProblem(malformedHtml);
      
      render(<NovelNotesTab problem={problem} />);

      await waitFor(() => {
        expect(screen.getByTestId('editor-root')).toBeInTheDocument();
      });

      expect(screen.queryByText(/Failed to load notes/)).not.toBeInTheDocument();
    });
  });

  describe('Plain Text Migration', () => {
    test('migrates plain text with multiple paragraphs', async () => {
      const plainText = `First paragraph of notes.

Second paragraph after a blank line.

Third paragraph with some more content.
This line should be part of the third paragraph.

Final paragraph.`;

      const problem = createMockProblem(plainText);
      render(<NovelNotesTab problem={problem} />);

      await waitFor(() => {
        expect(screen.getByTestId('editor-root')).toBeInTheDocument();
      });

      expect(screen.queryByText(/Failed to load notes/)).not.toBeInTheDocument();
    });

    test('handles single line text', async () => {
      const singleLine = 'This is just a single line of text.';
      const problem = createMockProblem(singleLine);
      
      render(<NovelNotesTab problem={problem} />);

      await waitFor(() => {
        expect(screen.getByTestId('editor-root')).toBeInTheDocument();
      });

      expect(screen.queryByText(/Failed to load notes/)).not.toBeInTheDocument();
    });

    test('handles text with special characters', async () => {
      const specialText = 'Text with émojis 🎉 and spëcial chars: <>&"\'';
      const problem = createMockProblem(specialText);
      
      render(<NovelNotesTab problem={problem} />);

      await waitFor(() => {
        expect(screen.getByTestId('editor-root')).toBeInTheDocument();
      });

      expect(screen.queryByText(/Failed to load notes/)).not.toBeInTheDocument();
    });
  });

  describe('Novel JSONContent Migration', () => {
    test('preserves existing Novel JSONContent format', async () => {
      const novelContent = JSON.stringify({
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'Existing Novel Content' }]
          },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'This should be preserved as-is.' }]
          },
          {
            type: 'bulletList',
            content: [{
              type: 'listItem',
              content: [{
                type: 'paragraph',
                content: [{ type: 'text', text: 'Bullet point' }]
              }]
            }]
          }
        ]
      });

      const problem = createMockProblem(novelContent);
      render(<NovelNotesTab problem={problem} />);

      await waitFor(() => {
        expect(screen.getByTestId('editor-root')).toBeInTheDocument();
      });

      expect(screen.queryByText(/Failed to load notes/)).not.toBeInTheDocument();
    });

    test('handles invalid Novel JSONContent gracefully', async () => {
      const invalidNovelContent = JSON.stringify({
        type: 'invalid',
        content: 'not an array'
      });

      const problem = createMockProblem(invalidNovelContent);
      render(<NovelNotesTab problem={problem} />);

      await waitFor(() => {
        expect(screen.getByTestId('editor-root')).toBeInTheDocument();
      });

      expect(screen.queryByText(/Failed to load notes/)).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('handles null notes', async () => {
      const problem = createMockProblem('');
      render(<NovelNotesTab problem={problem} />);

      await waitFor(() => {
        expect(screen.getByTestId('editor-root')).toBeInTheDocument();
      });

      expect(screen.queryByText(/Failed to load notes/)).not.toBeInTheDocument();
    });

    test('handles undefined notes', async () => {
      const problem = { ...createMockProblem(''), notes: undefined };
      render(<NovelNotesTab problem={problem} />);

      await waitFor(() => {
        expect(screen.getByTestId('editor-root')).toBeInTheDocument();
      });

      expect(screen.queryByText(/Failed to load notes/)).not.toBeInTheDocument();
    });

    test('handles invalid JSON strings', async () => {
      const invalidJson = '{ "invalid": json, "missing": quotes }';
      const problem = createMockProblem(invalidJson);
      
      render(<NovelNotesTab problem={problem} />);

      await waitFor(() => {
        expect(screen.getByTestId('editor-root')).toBeInTheDocument();
      });

      expect(screen.queryByText(/Failed to load notes/)).not.toBeInTheDocument();
    });

    test('handles very large content', async () => {
      const largeContent = 'A'.repeat(10000);
      const problem = createMockProblem(largeContent);
      
      render(<NovelNotesTab problem={problem} />);

      await waitFor(() => {
        expect(screen.getByTestId('editor-root')).toBeInTheDocument();
      });

      expect(screen.queryByText(/Failed to load notes/)).not.toBeInTheDocument();
    });

    test('handles mixed format detection scenarios', async () => {
      const testCases = [
        '', // Empty string
        '   ', // Whitespace only
        'null', // String "null"
        'undefined', // String "undefined"
        '[]', // Empty array as string
        '{}', // Empty object as string
        'Just plain text', // Simple text
        '<p>HTML content</p>', // HTML
        JSON.stringify([{ type: 'text', content: 'Block format' }]), // Block format
        JSON.stringify({ type: 'doc', content: [] }) // Novel format
      ];

      for (const testCase of testCases) {
        const problem = createMockProblem(testCase);
        const { unmount } = render(<NovelNotesTab problem={problem} />);

        await waitFor(() => {
          expect(screen.getByTestId('editor-root')).toBeInTheDocument();
        });

        expect(screen.queryByText(/Failed to load notes/)).not.toBeInTheDocument();
        unmount();
      }
    });
  });

  describe('Migration Logging and Tracking', () => {
    test('logs successful migrations', async () => {
      // Temporarily restore console.log for this test
      jest.restoreAllMocks();
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      const blockNotes = JSON.stringify([
        { type: 'heading', content: 'Test Heading' }
      ]);
      
      const problem = createMockProblem(blockNotes);
      render(<NovelNotesTab problem={problem} />);

      await waitFor(() => {
        expect(screen.getByTestId('editor-root')).toBeInTheDocument();
      });

      // Verify that success logging occurred
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Successfully loaded and converted notes to Novel format'),
        expect.anything()
      );
      
      // Restore mocks for other tests
      jest.spyOn(console, 'log').mockImplementation(() => {});
      jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    test('handles migration failures gracefully', async () => {
      // Create a scenario that might cause migration issues
      const problematicContent = JSON.stringify({
        circular: 'reference'
      });
      
      const problem = createMockProblem(problematicContent);
      render(<NovelNotesTab problem={problem} />);

      await waitFor(() => {
        expect(screen.getByTestId('editor-root')).toBeInTheDocument();
      });

      // Should still render successfully even with problematic content
      expect(screen.queryByText(/Failed to load notes/)).not.toBeInTheDocument();
    });
  });

  describe('Performance with Various Content Types', () => {
    test('handles large block arrays efficiently', async () => {
      const largeBlocks = Array.from({ length: 500 }, (_, i) => ({
        id: `block-${i}`,
        type: 'text',
        content: `This is paragraph number ${i + 1} with some content.`
      }));

      const problem = createMockProblem(JSON.stringify(largeBlocks));
      
      const startTime = Date.now();
      render(<NovelNotesTab problem={problem} />);

      await waitFor(() => {
        expect(screen.getByTestId('editor-root')).toBeInTheDocument();
      });
      
      const endTime = Date.now();
      
      // Should complete within reasonable time (less than 2 seconds)
      expect(endTime - startTime).toBeLessThan(2000);
      expect(screen.queryByText(/Failed to load notes/)).not.toBeInTheDocument();
    });

    test('handles complex nested content structures', async () => {
      const complexBlocks = [
        { type: 'heading', content: 'Complex Structure', level: 1 },
        { type: 'text', content: 'Introduction paragraph' },
        { type: 'bullet', content: 'First level bullet' },
        { type: 'bullet', content: 'Another first level bullet' },
        { type: 'numbered', content: 'Numbered item 1' },
        { type: 'numbered', content: 'Numbered item 2' },
        { type: 'todo', content: 'Task 1', checked: true },
        { type: 'todo', content: 'Task 2', checked: false },
        { type: 'code', content: 'console.log("nested");', language: 'javascript' },
        { type: 'quote', content: 'Nested quote content' },
        { type: 'divider', content: '' },
        { type: 'heading', content: 'Another Section', level: 2 },
        { type: 'text', content: 'More content here' }
      ];

      const problem = createMockProblem(JSON.stringify(complexBlocks));
      render(<NovelNotesTab problem={problem} />);

      await waitFor(() => {
        expect(screen.getByTestId('editor-root')).toBeInTheDocument();
      });

      expect(screen.queryByText(/Failed to load notes/)).not.toBeInTheDocument();
    });
  });
});