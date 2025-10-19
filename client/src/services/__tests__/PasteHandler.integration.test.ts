import { pasteHandler, PasteHandler } from '../index';

// Mock DataTransfer for integration testing
class MockDataTransfer implements DataTransfer {
  private data: { [key: string]: string } = {};
  
  dropEffect: 'none' | 'copy' | 'link' | 'move' = 'none';
  effectAllowed: 'none' | 'copy' | 'copyLink' | 'copyMove' | 'link' | 'linkMove' | 'move' | 'all' | 'uninitialized' = 'uninitialized';
  files: FileList = {} as FileList;
  items: DataTransferItemList = {} as DataTransferItemList;
  types: readonly string[] = [];

  clearData(format?: string): void {
    if (format) {
      delete this.data[format];
    } else {
      this.data = {};
    }
  }

  getData(format: string): string {
    return this.data[format] || '';
  }

  setData(format: string, data: string): void {
    this.data[format] = data;
  }

  setDragImage(image: Element, x: number, y: number): void {
    // Mock implementation
  }
}

describe('PasteHandler Integration Tests', () => {
  let mockClipboard: MockDataTransfer;

  beforeEach(() => {
    mockClipboard = new MockDataTransfer();
    pasteHandler.resetBlockIdCounter(1000);
  });

  describe('Service Export Integration', () => {
    it('should export singleton instance correctly', () => {
      expect(pasteHandler).toBeInstanceOf(PasteHandler);
    });

    it('should export PasteHandler class correctly', () => {
      const instance = PasteHandler.getInstance();
      expect(instance).toBeInstanceOf(PasteHandler);
      expect(instance).toBe(pasteHandler);
    });
  });

  describe('Real-world Paste Scenarios', () => {
    it('should handle typical note-taking content', () => {
      const content = `# Algorithm Notes

## Two Pointer Technique
- Used for array problems
- Time complexity: O(n)
  - Better than nested loops
  - Space efficient

### Example Problems
1. Two Sum (sorted array)
2. Container with most water
3. Remove duplicates

> Remember: Always consider edge cases!

\`\`\`python
def two_sum(nums, target):
    left, right = 0, len(nums) - 1
    while left < right:
        current_sum = nums[left] + nums[right]
        if current_sum == target:
            return [left, right]
        elif current_sum < target:
            left += 1
        else:
            right -= 1
    return []
\`\`\``;

      mockClipboard.setData('text/plain', content);
      
      const result = pasteHandler.processPastedContent(mockClipboard);
      
      expect(result.success).toBe(true);
      expect(result.blocks.length).toBeGreaterThan(10);
      
      // Check that different content types are recognized
      const blockTypes = result.blocks.map(block => block.type);
      expect(blockTypes).toContain('text');
      expect(blockTypes).toContain('bullet');
    });

    it('should handle content from documentation websites', () => {
      const htmlContent = `
        <div class="documentation">
          <h1>API Documentation</h1>
          <p>This API provides access to user data.</p>
          <h2>Endpoints</h2>
          <ul>
            <li>GET /users - Get all users</li>
            <li>POST /users - Create a user
              <ul>
                <li>Requires authentication</li>
                <li>Returns user object</li>
              </ul>
            </li>
            <li>DELETE /users/:id - Delete a user</li>
          </ul>
          <blockquote>
            <p>Note: All endpoints require valid API key</p>
          </blockquote>
          <pre><code>curl -H "Authorization: Bearer token" /api/users</code></pre>
        </div>
      `;

      mockClipboard.setData('text/html', htmlContent);
      
      const result = pasteHandler.processPastedContent(mockClipboard);
      
      expect(result.success).toBe(true);
      expect(result.blocks.length).toBeGreaterThan(5);
      
      // Verify different block types are created
      const blockTypes = result.blocks.map(block => block.type);
      expect(blockTypes).toContain('heading');
      expect(blockTypes).toContain('text');
      expect(blockTypes).toContain('bullet');
      expect(blockTypes).toContain('quote');
      expect(blockTypes).toContain('code');
    });

    it('should handle mixed content with proper hierarchy', () => {
      const content = `Main Topic
- Point 1
  - Sub point 1.1
  - Sub point 1.2
    - Deep sub point
- Point 2
- Point 3

Regular paragraph after list.

1. Numbered item 1
2. Numbered item 2
  3. Indented numbered item`;

      mockClipboard.setData('text/plain', content);
      
      const result = pasteHandler.processPastedContent(mockClipboard);
      
      expect(result.success).toBe(true);
      
      // Check hierarchy is preserved
      const bulletBlocks = result.blocks.filter(block => block.type === 'bullet');
      expect(bulletBlocks.length).toBeGreaterThan(5);
      
      // Check that some blocks have levels
      const hasLevels = bulletBlocks.some(block => block.level !== undefined);
      expect(hasLevels).toBe(true);
    });

    it('should handle large content with maxBlocks limit', () => {
      const largeContent = Array.from({ length: 200 }, (_, i) => `Line ${i + 1}`).join('\n');
      
      mockClipboard.setData('text/plain', largeContent);
      
      const result = pasteHandler.processPastedContent(mockClipboard, { maxBlocks: 50 });
      
      expect(result.success).toBe(true);
      expect(result.blocks.length).toBeLessThanOrEqual(50);
    });

    it('should handle content with special characters and formatting', () => {
      const content = `Special Characters Test
• Unicode bullet point
→ Arrow character
★ Star character
- Regular dash bullet
* Asterisk bullet

Mixed formatting:
- Item with "quotes"
- Item with 'single quotes'
- Item with (parentheses)
- Item with [brackets]
- Item with {braces}`;

      mockClipboard.setData('text/plain', content);
      
      const result = pasteHandler.processPastedContent(mockClipboard);
      
      expect(result.success).toBe(true);
      expect(result.blocks.length).toBeGreaterThan(5);
      
      // Verify special characters are preserved
      const allContent = result.blocks.map(block => block.content).join(' ');
      expect(allContent).toContain('"quotes"');
      expect(allContent).toContain("'single quotes'");
      expect(allContent).toContain('(parentheses)');
      expect(allContent).toContain('[brackets]');
      expect(allContent).toContain('{braces}');
    });
  });

  describe('Error Recovery', () => {
    it('should gracefully handle corrupted HTML', () => {
      const corruptedHtml = '<p>Unclosed paragraph<div>Nested <span>incorrectly</p></div></span>';
      
      mockClipboard.setData('text/html', corruptedHtml);
      
      const result = pasteHandler.processPastedContent(mockClipboard);
      
      // Should still succeed due to browser's HTML parsing
      expect(result.success).toBe(true);
      expect(result.blocks.length).toBeGreaterThan(0);
    });

    it('should handle empty or whitespace-only content', () => {
      mockClipboard.setData('text/plain', '   \n\n   \n   ');
      
      const result = pasteHandler.processPastedContent(mockClipboard);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('No valid content found');
    });

    it('should handle very long single lines', () => {
      const longLine = 'A'.repeat(10000);
      
      mockClipboard.setData('text/plain', longLine);
      
      const result = pasteHandler.processPastedContent(mockClipboard);
      
      expect(result.success).toBe(true);
      expect(result.blocks).toHaveLength(1);
      expect(result.blocks[0].content).toBe(longLine);
    });
  });
});