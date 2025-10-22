import { BackwardCompatibilityConverter } from '../BackwardCompatibilityConverter';

describe('BackwardCompatibilityConverter Integration', () => {
  describe('Integration with NovelNotesTab scenarios', () => {
    it('should handle empty notes from problem object', () => {
      const result = BackwardCompatibilityConverter.convertToNovelFormat('');
      
      expect(result).toEqual({
        type: 'doc',
        content: [{ type: 'paragraph', content: [] }]
      });
    });

    it('should handle null notes from problem object', () => {
      const result = BackwardCompatibilityConverter.convertToNovelFormat(null as any);
      
      expect(result).toEqual({
        type: 'doc',
        content: [{ type: 'paragraph', content: [] }]
      });
    });

    it('should handle undefined notes from problem object', () => {
      const result = BackwardCompatibilityConverter.convertToNovelFormat(undefined as any);
      
      expect(result).toEqual({
        type: 'doc',
        content: [{ type: 'paragraph', content: [] }]
      });
    });

    it('should handle existing Novel JSONContent from database', () => {
      const existingNovelContent = JSON.stringify({
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'My Notes' }]
          },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Some content here' }]
          }
        ]
      });

      const result = BackwardCompatibilityConverter.convertToNovelFormat(existingNovelContent);
      
      expect(result.type).toBe('doc');
      expect(result.content).toHaveLength(2);
      expect(result.content![0].type).toBe('heading');
      expect(result.content![1].type).toBe('paragraph');
    });

    it('should handle old block format from database', () => {
      const oldBlockFormat = JSON.stringify([
        {
          id: 'block-1',
          type: 'heading',
          content: 'Problem Solution',
          level: 1
        },
        {
          id: 'block-2',
          type: 'bullet',
          content: 'Time complexity: O(n)'
        },
        {
          id: 'block-3',
          type: 'code',
          content: 'function solve() { return true; }',
          language: 'javascript'
        }
      ]);

      const result = BackwardCompatibilityConverter.convertToNovelFormat(oldBlockFormat);
      
      expect(result.type).toBe('doc');
      expect(result.content).toHaveLength(3);
      
      // Check heading conversion
      expect(result.content![0]).toEqual({
        type: 'heading',
        attrs: { level: 1 },
        content: [{ type: 'text', text: 'Problem Solution' }]
      });

      // Check bullet list conversion
      expect(result.content![1]).toEqual({
        type: 'bulletList',
        content: [{
          type: 'listItem',
          content: [{
            type: 'paragraph',
            content: [{ type: 'text', text: 'Time complexity: O(n)' }]
          }]
        }]
      });

      // Check code block conversion
      expect(result.content![2]).toEqual({
        type: 'codeBlock',
        attrs: { language: 'javascript' },
        content: [{ type: 'text', text: 'function solve() { return true; }' }]
      });
    });

    it('should handle plain text notes from database', () => {
      const plainText = 'This is a simple note.\n\nWith multiple paragraphs.\n\nAnd some more content.';
      
      const result = BackwardCompatibilityConverter.convertToNovelFormat(plainText);
      
      expect(result.type).toBe('doc');
      expect(result.content).toHaveLength(3);
      expect(result.content![0]).toEqual({
        type: 'paragraph',
        content: [{ type: 'text', text: 'This is a simple note.' }]
      });
      expect(result.content![1]).toEqual({
        type: 'paragraph',
        content: [{ type: 'text', text: 'With multiple paragraphs.' }]
      });
      expect(result.content![2]).toEqual({
        type: 'paragraph',
        content: [{ type: 'text', text: 'And some more content.' }]
      });
    });

    it('should handle HTML content from database', () => {
      const htmlContent = '<h1>Title</h1><p>Some paragraph</p><ul><li>List item</li></ul>';
      
      const result = BackwardCompatibilityConverter.convertToNovelFormat(htmlContent);
      
      expect(result.type).toBe('doc');
      expect(result.content!.length).toBeGreaterThan(0);
      // The exact structure depends on HTML parsing, but it should not throw errors
    });

    it('should handle corrupted JSON gracefully', () => {
      const corruptedJson = '{"type":"doc","content":[{"type":"paragraph"'; // Incomplete JSON
      
      const result = BackwardCompatibilityConverter.convertToNovelFormat(corruptedJson);
      
      expect(result.type).toBe('doc');
      expect(result.content).toHaveLength(1);
      expect(result.content![0].type).toBe('paragraph');
      // Should treat as plain text
    });

    it('should handle mixed format scenarios', () => {
      // Test various edge cases that might occur in real usage
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

      testCases.forEach((testCase, index) => {
        expect(() => {
          const result = BackwardCompatibilityConverter.convertToNovelFormat(testCase);
          expect(result.type).toBe('doc');
          expect(Array.isArray(result.content)).toBe(true);
        }).not.toThrow(`Test case ${index}: "${testCase}"`);
      });
    });

    it('should preserve content meaning during conversion', () => {
      const originalBlocks = [
        { type: 'heading', content: 'Algorithm Analysis', level: 2 },
        { type: 'text', content: 'This problem can be solved using dynamic programming.' },
        { type: 'bullet', content: 'Time complexity: O(n²)' },
        { type: 'bullet', content: 'Space complexity: O(n)' },
        { type: 'code', content: 'dp[i] = dp[i-1] + dp[i-2]', language: 'python' },
        { type: 'todo', content: 'Review edge cases', checked: false },
        { type: 'quote', content: 'Optimization is the key to success.' }
      ];

      const result = BackwardCompatibilityConverter.convertBlocksToNovelContent(originalBlocks);
      
      expect(result.content).toHaveLength(7);
      
      // Verify each conversion preserves the original meaning
      expect(result.content![0].type).toBe('heading');
      expect(result.content![0].attrs?.level).toBe(2);
      expect(result.content![0].content![0].text).toBe('Algorithm Analysis');
      
      expect(result.content![1].type).toBe('paragraph');
      expect(result.content![1].content![0].text).toBe('This problem can be solved using dynamic programming.');
      
      expect(result.content![2].type).toBe('bulletList');
      expect(result.content![3].type).toBe('bulletList');
      
      expect(result.content![4].type).toBe('codeBlock');
      expect(result.content![4].attrs?.language).toBe('python');
      expect(result.content![4].content![0].text).toBe('dp[i] = dp[i-1] + dp[i-2]');
      
      expect(result.content![5].type).toBe('taskList');
      expect(result.content![5].content![0].attrs?.checked).toBe(false);
      
      expect(result.content![6].type).toBe('blockquote');
      expect(result.content![6].content![0].content![0].text).toBe('Optimization is the key to success.');
    });
  });

  describe('Performance considerations', () => {
    it('should handle large content efficiently', () => {
      const largeBlocks = Array.from({ length: 1000 }, (_, i) => ({
        type: 'text',
        content: `This is paragraph number ${i + 1} with some content.`
      }));

      const startTime = Date.now();
      const result = BackwardCompatibilityConverter.convertBlocksToNovelContent(largeBlocks);
      const endTime = Date.now();

      expect(result.content).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle deeply nested content structures', () => {
      const complexBlocks = [
        { type: 'heading', content: 'Complex Structure', level: 1 },
        { type: 'bullet', content: 'First level item' },
        { type: 'bullet', content: 'Another first level item' },
        { type: 'numbered', content: 'Numbered item 1' },
        { type: 'numbered', content: 'Numbered item 2' },
        { type: 'todo', content: 'Task 1', checked: true },
        { type: 'todo', content: 'Task 2', checked: false },
        { type: 'code', content: 'console.log("nested");', language: 'js' },
        { type: 'quote', content: 'Nested quote content' },
        { type: 'divider', content: '' },
        { type: 'heading', content: 'Another Section', level: 2 }
      ];

      expect(() => {
        const result = BackwardCompatibilityConverter.convertBlocksToNovelContent(complexBlocks);
        expect(result.content).toHaveLength(11);
      }).not.toThrow();
    });
  });
});