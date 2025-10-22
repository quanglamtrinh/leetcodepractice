import { BackwardCompatibilityConverter } from '../BackwardCompatibilityConverter';
import { JSONContent } from 'novel';

// Mock DOM methods for HTML conversion tests
Object.defineProperty(global, 'document', {
  value: {
    createElement: jest.fn(() => ({
      innerHTML: '',
      childNodes: [],
      tagName: 'DIV',
      textContent: ''
    }))
  }
});

describe('BackwardCompatibilityConverter', () => {
  describe('convertToNovelFormat', () => {
    it('should return empty document for null/undefined input', () => {
      expect(BackwardCompatibilityConverter.convertToNovelFormat(null as any)).toEqual({
        type: 'doc',
        content: [{ type: 'paragraph', content: [] }]
      });

      expect(BackwardCompatibilityConverter.convertToNovelFormat(undefined as any)).toEqual({
        type: 'doc',
        content: [{ type: 'paragraph', content: [] }]
      });

      expect(BackwardCompatibilityConverter.convertToNovelFormat('')).toEqual({
        type: 'doc',
        content: [{ type: 'paragraph', content: [] }]
      });
    });

    it('should return valid JSONContent as-is', () => {
      const validContent: JSONContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Test content' }]
          }
        ]
      };

      const result = BackwardCompatibilityConverter.convertToNovelFormat(validContent);
      expect(result).toEqual(validContent);
    });

    it('should convert block array format', () => {
      const blocks = [
        { type: 'heading', content: 'Test Heading', level: 1 },
        { type: 'text', content: 'Test paragraph' }
      ];

      const result = BackwardCompatibilityConverter.convertToNovelFormat(blocks);
      
      expect(result.type).toBe('doc');
      expect(result.content).toHaveLength(2);
      expect(result.content![0]).toEqual({
        type: 'heading',
        attrs: { level: 1 },
        content: [{ type: 'text', text: 'Test Heading' }]
      });
      expect(result.content![1]).toEqual({
        type: 'paragraph',
        content: [{ type: 'text', text: 'Test paragraph' }]
      });
    });

    it('should parse JSON string and convert appropriately', () => {
      const jsonString = JSON.stringify([
        { type: 'text', content: 'Test content' }
      ]);

      const result = BackwardCompatibilityConverter.convertToNovelFormat(jsonString);
      
      expect(result.type).toBe('doc');
      expect(result.content).toHaveLength(1);
      expect(result.content![0]).toEqual({
        type: 'paragraph',
        content: [{ type: 'text', text: 'Test content' }]
      });
    });

    it('should handle invalid JSON as plain text', () => {
      const invalidJson = '{ invalid json }';
      
      const result = BackwardCompatibilityConverter.convertToNovelFormat(invalidJson);
      
      expect(result.type).toBe('doc');
      expect(result.content).toHaveLength(1);
      expect(result.content![0]).toEqual({
        type: 'paragraph',
        content: [{ type: 'text', text: '{ invalid json }' }]
      });
    });

    it('should convert invalid object to string representation', () => {
      const invalidObject = { someProperty: 'value', anotherProperty: 123 };
      
      const result = BackwardCompatibilityConverter.convertToNovelFormat(invalidObject as any);
      
      expect(result.type).toBe('doc');
      expect(result.content).toHaveLength(1);
      expect(result.content![0].type).toBe('paragraph');
      expect(result.content![0].content![0].text).toContain('someProperty');
      expect(result.content![0].content![0].text).toContain('value');
    });
  });

  describe('convertBlocksToNovelContent', () => {
    it('should throw error for non-array input', () => {
      expect(() => {
        BackwardCompatibilityConverter.convertBlocksToNovelContent('not an array' as any);
      }).toThrow('Invalid blocks format: expected array');
    });

    it('should convert heading blocks', () => {
      const blocks = [
        { type: 'heading', content: 'Main Title', level: 1 },
        { type: 'heading', content: 'Subtitle', level: 2 }
      ];

      const result = BackwardCompatibilityConverter.convertBlocksToNovelContent(blocks);
      
      expect(result.content).toHaveLength(2);
      expect(result.content![0]).toEqual({
        type: 'heading',
        attrs: { level: 1 },
        content: [{ type: 'text', text: 'Main Title' }]
      });
      expect(result.content![1]).toEqual({
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'Subtitle' }]
      });
    });

    it('should convert bullet list blocks', () => {
      const blocks = [
        { type: 'bullet', content: 'First item' },
        { type: 'bullet', content: 'Second item' }
      ];

      const result = BackwardCompatibilityConverter.convertBlocksToNovelContent(blocks);
      
      expect(result.content).toHaveLength(2);
      expect(result.content![0]).toEqual({
        type: 'bulletList',
        content: [{
          type: 'listItem',
          content: [{
            type: 'paragraph',
            content: [{ type: 'text', text: 'First item' }]
          }]
        }]
      });
    });

    it('should convert numbered list blocks', () => {
      const blocks = [
        { type: 'numbered', content: 'First step' }
      ];

      const result = BackwardCompatibilityConverter.convertBlocksToNovelContent(blocks);
      
      expect(result.content![0]).toEqual({
        type: 'orderedList',
        content: [{
          type: 'listItem',
          content: [{
            type: 'paragraph',
            content: [{ type: 'text', text: 'First step' }]
          }]
        }]
      });
    });

    it('should convert todo blocks', () => {
      const blocks = [
        { type: 'todo', content: 'Unchecked task', checked: false },
        { type: 'todo', content: 'Checked task', checked: true }
      ];

      const result = BackwardCompatibilityConverter.convertBlocksToNovelContent(blocks);
      
      expect(result.content).toHaveLength(2);
      expect(result.content![0]).toEqual({
        type: 'taskList',
        content: [{
          type: 'taskItem',
          attrs: { checked: false },
          content: [{
            type: 'paragraph',
            content: [{ type: 'text', text: 'Unchecked task' }]
          }]
        }]
      });
      expect(result.content![1]).toEqual({
        type: 'taskList',
        content: [{
          type: 'taskItem',
          attrs: { checked: true },
          content: [{
            type: 'paragraph',
            content: [{ type: 'text', text: 'Checked task' }]
          }]
        }]
      });
    });

    it('should convert code blocks', () => {
      const blocks = [
        { type: 'code', content: 'console.log("hello");', language: 'javascript' },
        { type: 'code', content: 'print("hello")' } // no language
      ];

      const result = BackwardCompatibilityConverter.convertBlocksToNovelContent(blocks);
      
      expect(result.content).toHaveLength(2);
      expect(result.content![0]).toEqual({
        type: 'codeBlock',
        attrs: { language: 'javascript' },
        content: [{ type: 'text', text: 'console.log("hello");' }]
      });
      expect(result.content![1]).toEqual({
        type: 'codeBlock',
        attrs: {},
        content: [{ type: 'text', text: 'print("hello")' }]
      });
    });

    it('should convert quote blocks', () => {
      const blocks = [
        { type: 'quote', content: 'This is a quote' }
      ];

      const result = BackwardCompatibilityConverter.convertBlocksToNovelContent(blocks);
      
      expect(result.content![0]).toEqual({
        type: 'blockquote',
        content: [{
          type: 'paragraph',
          content: [{ type: 'text', text: 'This is a quote' }]
        }]
      });
    });

    it('should convert divider blocks', () => {
      const blocks = [
        { type: 'divider', content: '' }
      ];

      const result = BackwardCompatibilityConverter.convertBlocksToNovelContent(blocks);
      
      expect(result.content![0]).toEqual({
        type: 'horizontalRule'
      });
    });

    it('should convert unknown block types to paragraphs', () => {
      const blocks = [
        { type: 'unknown', content: 'Unknown content' },
        { type: 'text', content: 'Text content' }
      ];

      const result = BackwardCompatibilityConverter.convertBlocksToNovelContent(blocks);
      
      expect(result.content).toHaveLength(2);
      expect(result.content![0]).toEqual({
        type: 'paragraph',
        content: [{ type: 'text', text: 'Unknown content' }]
      });
      expect(result.content![1]).toEqual({
        type: 'paragraph',
        content: [{ type: 'text', text: 'Text content' }]
      });
    });

    it('should handle invalid blocks gracefully', () => {
      const blocks = [
        null,
        undefined,
        'string instead of object',
        { type: 'valid', content: 'Valid content' }
      ];

      const result = BackwardCompatibilityConverter.convertBlocksToNovelContent(blocks as any);
      
      expect(result.content).toHaveLength(4);
      // Invalid blocks should be converted to paragraphs
      expect(result.content![0].type).toBe('paragraph');
      expect(result.content![1].type).toBe('paragraph');
      expect(result.content![2].type).toBe('paragraph');
      expect(result.content![3]).toEqual({
        type: 'paragraph',
        content: [{ type: 'text', text: 'Valid content' }]
      });
    });

    it('should handle empty blocks array', () => {
      const result = BackwardCompatibilityConverter.convertBlocksToNovelContent([]);
      
      expect(result).toEqual({
        type: 'doc',
        content: [{ type: 'paragraph', content: [] }]
      });
    });

    it('should handle blocks with empty content', () => {
      const blocks = [
        { type: 'heading', content: '' },
        { type: 'text', content: null },
        { type: 'bullet', content: undefined }
      ];

      const result = BackwardCompatibilityConverter.convertBlocksToNovelContent(blocks as any);
      
      expect(result.content).toHaveLength(3);
      expect(result.content![0]).toEqual({
        type: 'heading',
        attrs: { level: 1 },
        content: []
      });
      expect(result.content![1]).toEqual({
        type: 'paragraph',
        content: []
      });
      expect(result.content![2]).toEqual({
        type: 'bulletList',
        content: [{
          type: 'listItem',
          content: [{
            type: 'paragraph',
            content: []
          }]
        }]
      });
    });
  });

  describe('convertHtmlToNovel', () => {
    beforeEach(() => {
      // Reset the mock
      (global.document.createElement as jest.Mock).mockClear();
    });

    it('should return empty document for null/empty input', () => {
      expect(BackwardCompatibilityConverter.convertHtmlToNovel('')).toEqual({
        type: 'doc',
        content: [{ type: 'paragraph', content: [] }]
      });

      expect(BackwardCompatibilityConverter.convertHtmlToNovel(null as any)).toEqual({
        type: 'doc',
        content: [{ type: 'paragraph', content: [] }]
      });
    });

    it('should handle simple HTML conversion', () => {
      // Mock DOM element behavior
      const mockDiv = {
        innerHTML: '',
        childNodes: [
          {
            nodeType: 1, // ELEMENT_NODE
            tagName: 'P',
            textContent: 'Test paragraph'
          }
        ]
      };

      (global.document.createElement as jest.Mock).mockReturnValue(mockDiv);

      const html = '<p>Test paragraph</p>';
      const result = BackwardCompatibilityConverter.convertHtmlToNovel(html);

      expect(result.type).toBe('doc');
      expect(result.content).toHaveLength(1);
    });

    it('should handle empty HTML gracefully', () => {
      const mockDiv = {
        innerHTML: '',
        childNodes: []
      };

      (global.document.createElement as jest.Mock).mockReturnValue(mockDiv);

      const result = BackwardCompatibilityConverter.convertHtmlToNovel('<div></div>');
      
      expect(result).toEqual({
        type: 'doc',
        content: [{ type: 'paragraph', content: [] }]
      });
    });
  });

  describe('convertPlainTextToNovel', () => {
    it('should return empty document for null/empty input', () => {
      expect(BackwardCompatibilityConverter.convertPlainTextToNovel('')).toEqual({
        type: 'doc',
        content: [{ type: 'paragraph', content: [] }]
      });

      expect(BackwardCompatibilityConverter.convertPlainTextToNovel(null as any)).toEqual({
        type: 'doc',
        content: [{ type: 'paragraph', content: [] }]
      });
    });

    it('should convert single line to paragraph', () => {
      const text = 'This is a single line of text.';
      const result = BackwardCompatibilityConverter.convertPlainTextToNovel(text);

      expect(result).toEqual({
        type: 'doc',
        content: [{
          type: 'paragraph',
          content: [{ type: 'text', text: 'This is a single line of text.' }]
        }]
      });
    });

    it('should convert multiple paragraphs separated by double newlines', () => {
      const text = 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.';
      const result = BackwardCompatibilityConverter.convertPlainTextToNovel(text);

      expect(result.type).toBe('doc');
      expect(result.content).toHaveLength(3);
      expect(result.content![0]).toEqual({
        type: 'paragraph',
        content: [{ type: 'text', text: 'First paragraph.' }]
      });
      expect(result.content![1]).toEqual({
        type: 'paragraph',
        content: [{ type: 'text', text: 'Second paragraph.' }]
      });
      expect(result.content![2]).toEqual({
        type: 'paragraph',
        content: [{ type: 'text', text: 'Third paragraph.' }]
      });
    });

    it('should handle single newlines within paragraphs', () => {
      const text = 'Line one\nLine two\n\nNew paragraph\nAnother line';
      const result = BackwardCompatibilityConverter.convertPlainTextToNovel(text);

      expect(result.content).toHaveLength(2);
      expect(result.content![0]).toEqual({
        type: 'paragraph',
        content: [{ type: 'text', text: 'Line one Line two' }]
      });
      expect(result.content![1]).toEqual({
        type: 'paragraph',
        content: [{ type: 'text', text: 'New paragraph Another line' }]
      });
    });

    it('should handle text with only whitespace', () => {
      const text = '   \n\n   \n   ';
      const result = BackwardCompatibilityConverter.convertPlainTextToNovel(text);

      expect(result).toEqual({
        type: 'doc',
        content: [{ type: 'paragraph', content: [] }]
      });
    });

    it('should trim whitespace from paragraphs', () => {
      const text = '  First paragraph  \n\n  Second paragraph  ';
      const result = BackwardCompatibilityConverter.convertPlainTextToNovel(text);

      expect(result.content).toHaveLength(2);
      expect(result.content![0]).toEqual({
        type: 'paragraph',
        content: [{ type: 'text', text: 'First paragraph' }]
      });
      expect(result.content![1]).toEqual({
        type: 'paragraph',
        content: [{ type: 'text', text: 'Second paragraph' }]
      });
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle circular references in objects', () => {
      const circularObj: any = { prop: 'value' };
      circularObj.self = circularObj;

      // This should not throw an error, but convert to string representation
      expect(() => {
        BackwardCompatibilityConverter.convertToNovelFormat(circularObj);
      }).not.toThrow();
    });

    it('should handle very large content', () => {
      const largeText = 'A'.repeat(10000);
      const result = BackwardCompatibilityConverter.convertPlainTextToNovel(largeText);

      expect(result.type).toBe('doc');
      expect(result.content).toHaveLength(1);
      expect(result.content![0].content![0].text).toHaveLength(10000);
    });

    it('should handle special characters in text', () => {
      const specialText = 'Text with émojis 🎉 and spëcial chars: <>&"\'';
      const result = BackwardCompatibilityConverter.convertPlainTextToNovel(specialText);

      expect(result.content![0]).toEqual({
        type: 'paragraph',
        content: [{ type: 'text', text: specialText }]
      });
    });

    it('should handle mixed content types in block conversion', () => {
      const blocks = [
        { type: 'heading', content: 'Title', level: 1 },
        { type: 'text', content: 'Regular text' },
        { type: 'code', content: 'const x = 1;', language: 'js' },
        { type: 'todo', content: 'Task item', checked: true },
        { type: 'divider', content: '' },
        { type: 'quote', content: 'Quoted text' }
      ];

      const result = BackwardCompatibilityConverter.convertBlocksToNovelContent(blocks);

      expect(result.content).toHaveLength(6);
      expect(result.content![0].type).toBe('heading');
      expect(result.content![1].type).toBe('paragraph');
      expect(result.content![2].type).toBe('codeBlock');
      expect(result.content![3].type).toBe('taskList');
      expect(result.content![4].type).toBe('horizontalRule');
      expect(result.content![5].type).toBe('blockquote');
    });
  });

  describe('Integration scenarios', () => {
    it('should handle real-world block format from old editor', () => {
      const realWorldBlocks = [
        {
          id: 'block-1',
          type: 'heading',
          content: 'Problem Analysis',
          level: 1
        },
        {
          id: 'block-2',
          type: 'bullet',
          content: 'Time complexity: O(n)'
        },
        {
          id: 'block-3',
          type: 'bullet',
          content: 'Space complexity: O(1)'
        },
        {
          id: 'block-4',
          type: 'code',
          content: 'def solution(nums):\n    return sum(nums)',
          language: 'python'
        },
        {
          id: 'block-5',
          type: 'todo',
          content: 'Review edge cases',
          checked: false
        }
      ];

      const result = BackwardCompatibilityConverter.convertBlocksToNovelContent(realWorldBlocks);

      expect(result.type).toBe('doc');
      expect(result.content).toHaveLength(5);
      
      // Verify heading
      expect(result.content![0]).toEqual({
        type: 'heading',
        attrs: { level: 1 },
        content: [{ type: 'text', text: 'Problem Analysis' }]
      });

      // Verify bullet points
      expect(result.content![1].type).toBe('bulletList');
      expect(result.content![2].type).toBe('bulletList');

      // Verify code block
      expect(result.content![3]).toEqual({
        type: 'codeBlock',
        attrs: { language: 'python' },
        content: [{ type: 'text', text: 'def solution(nums):\n    return sum(nums)' }]
      });

      // Verify todo
      expect(result.content![4]).toEqual({
        type: 'taskList',
        content: [{
          type: 'taskItem',
          attrs: { checked: false },
          content: [{
            type: 'paragraph',
            content: [{ type: 'text', text: 'Review edge cases' }]
          }]
        }]
      });
    });

    it('should handle conversion from JSON string of existing Novel content', () => {
      const existingNovelContent = {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'Existing Title' }]
          },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Existing content' }]
          }
        ]
      };

      const jsonString = JSON.stringify(existingNovelContent);
      const result = BackwardCompatibilityConverter.convertToNovelFormat(jsonString);

      expect(result).toEqual(existingNovelContent);
    });
  });
});