import { PasteHandler, ProcessedContent, Block } from '../PasteHandler';

// Mock DataTransfer for testing
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

describe('PasteHandler', () => {
  let pasteHandler: PasteHandler;
  let mockClipboard: MockDataTransfer;

  beforeEach(() => {
    pasteHandler = PasteHandler.getInstance();
    pasteHandler.resetBlockIdCounter(1000);
    mockClipboard = new MockDataTransfer();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = PasteHandler.getInstance();
      const instance2 = PasteHandler.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Plain Text Processing', () => {
    it('should process simple plain text', () => {
      mockClipboard.setData('text/plain', 'Hello world\nSecond line');
      
      const result = pasteHandler.processPastedContent(mockClipboard);
      
      expect(result.success).toBe(true);
      expect(result.blocks).toHaveLength(2);
      expect(result.blocks[0].content).toBe('Hello world');
      expect(result.blocks[0].type).toBe('text');
      expect(result.blocks[1].content).toBe('Second line');
      expect(result.blocks[1].type).toBe('text');
    });

    it('should handle bullet points with dashes', () => {
      mockClipboard.setData('text/plain', '- First item\n- Second item\n  - Sub item');
      
      const result = pasteHandler.processPastedContent(mockClipboard);
      
      expect(result.success).toBe(true);
      expect(result.blocks).toHaveLength(3);
      expect(result.blocks[0].type).toBe('bullet');
      expect(result.blocks[0].content).toBe('First item');
      expect(result.blocks[0].level).toBeUndefined();
      expect(result.blocks[2].type).toBe('bullet');
      expect(result.blocks[2].content).toBe('Sub item');
      expect(result.blocks[2].level).toBe(1);
    });

    it('should handle bullet points with asterisks', () => {
      mockClipboard.setData('text/plain', '* First item\n* Second item\n    * Sub item');
      
      const result = pasteHandler.processPastedContent(mockClipboard);
      
      expect(result.success).toBe(true);
      expect(result.blocks).toHaveLength(3);
      expect(result.blocks[0].type).toBe('bullet');
      expect(result.blocks[0].content).toBe('First item');
      expect(result.blocks[2].level).toBe(2); // 4 spaces = level 2
    });

    it('should handle bullet points with bullet characters', () => {
      mockClipboard.setData('text/plain', '• First item\n• Second item\n  • Sub item');
      
      const result = pasteHandler.processPastedContent(mockClipboard);
      
      expect(result.success).toBe(true);
      expect(result.blocks).toHaveLength(3);
      expect(result.blocks[0].type).toBe('bullet');
      expect(result.blocks[0].content).toBe('First item');
      expect(result.blocks[2].level).toBe(1);
    });

    it('should handle numbered lists', () => {
      mockClipboard.setData('text/plain', '1. First item\n2. Second item\n  3. Sub item');
      
      const result = pasteHandler.processPastedContent(mockClipboard);
      
      expect(result.success).toBe(true);
      expect(result.blocks).toHaveLength(3);
      expect(result.blocks[0].type).toBe('bullet');
      expect(result.blocks[0].content).toBe('First item');
      expect(result.blocks[2].level).toBe(1);
    });

    it('should handle task lists', () => {
      mockClipboard.setData('text/plain', '- [ ] Unchecked task\n- [x] Checked task\n  - [ ] Sub task');
      
      const result = pasteHandler.processPastedContent(mockClipboard);
      
      expect(result.success).toBe(true);
      expect(result.blocks).toHaveLength(3);
      expect(result.blocks[0].type).toBe('bullet');
      expect(result.blocks[0].content).toBe('Unchecked task');
      expect(result.blocks[1].content).toBe('Checked task');
      expect(result.blocks[2].level).toBe(1);
    });

    it('should filter out empty lines', () => {
      mockClipboard.setData('text/plain', 'First line\n\n\nSecond line\n\n');
      
      const result = pasteHandler.processPastedContent(mockClipboard);
      
      expect(result.success).toBe(true);
      expect(result.blocks).toHaveLength(2);
      expect(result.blocks[0].content).toBe('First line');
      expect(result.blocks[1].content).toBe('Second line');
    });
  });

  describe('HTML Processing', () => {
    it('should process simple HTML paragraphs', () => {
      mockClipboard.setData('text/html', '<p>First paragraph</p><p>Second paragraph</p>');
      
      const result = pasteHandler.processPastedContent(mockClipboard);
      
      expect(result.success).toBe(true);
      expect(result.blocks).toHaveLength(2);
      expect(result.blocks[0].type).toBe('text');
      expect(result.blocks[0].content).toBe('First paragraph');
      expect(result.blocks[1].content).toBe('Second paragraph');
    });

    it('should process HTML headings', () => {
      mockClipboard.setData('text/html', '<h1>Main Title</h1><h2>Subtitle</h2><p>Content</p>');
      
      const result = pasteHandler.processPastedContent(mockClipboard);
      
      expect(result.success).toBe(true);
      expect(result.blocks).toHaveLength(3);
      expect(result.blocks[0].type).toBe('heading');
      expect(result.blocks[0].content).toBe('Main Title');
      expect(result.blocks[1].type).toBe('heading');
      expect(result.blocks[1].content).toBe('Subtitle');
      expect(result.blocks[2].type).toBe('text');
    });

    it('should process HTML unordered lists', () => {
      mockClipboard.setData('text/html', '<ul><li>First item</li><li>Second item</li></ul>');
      
      const result = pasteHandler.processPastedContent(mockClipboard);
      
      expect(result.success).toBe(true);
      expect(result.blocks).toHaveLength(2);
      expect(result.blocks[0].type).toBe('bullet');
      expect(result.blocks[0].content).toBe('First item');
      expect(result.blocks[1].type).toBe('bullet');
      expect(result.blocks[1].content).toBe('Second item');
    });

    it('should process HTML ordered lists', () => {
      mockClipboard.setData('text/html', '<ol><li>First item</li><li>Second item</li></ol>');
      
      const result = pasteHandler.processPastedContent(mockClipboard);
      
      expect(result.success).toBe(true);
      expect(result.blocks).toHaveLength(2);
      expect(result.blocks[0].type).toBe('bullet');
      expect(result.blocks[0].content).toBe('First item');
      expect(result.blocks[1].type).toBe('bullet');
      expect(result.blocks[1].content).toBe('Second item');
    });

    it('should process nested HTML lists', () => {
      mockClipboard.setData('text/html', 
        '<ul><li>First item<ul><li>Sub item 1</li><li>Sub item 2</li></ul></li><li>Second item</li></ul>'
      );
      
      const result = pasteHandler.processPastedContent(mockClipboard);
      
      expect(result.success).toBe(true);
      expect(result.blocks).toHaveLength(4);
      expect(result.blocks[0].type).toBe('bullet');
      expect(result.blocks[0].content).toBe('First item');
      expect(result.blocks[0].level).toBeUndefined();
      expect(result.blocks[1].type).toBe('bullet');
      expect(result.blocks[1].content).toBe('Sub item 1');
      expect(result.blocks[1].level).toBe(1);
      expect(result.blocks[2].level).toBe(1);
      expect(result.blocks[3].level).toBeUndefined();
    });

    it('should process HTML blockquotes', () => {
      mockClipboard.setData('text/html', '<blockquote>This is a quote</blockquote>');
      
      const result = pasteHandler.processPastedContent(mockClipboard);
      
      expect(result.success).toBe(true);
      expect(result.blocks).toHaveLength(1);
      expect(result.blocks[0].type).toBe('quote');
      expect(result.blocks[0].content).toBe('This is a quote');
    });

    it('should process HTML code blocks', () => {
      mockClipboard.setData('text/html', '<pre><code>console.log("Hello");</code></pre>');
      
      const result = pasteHandler.processPastedContent(mockClipboard);
      
      expect(result.success).toBe(true);
      expect(result.blocks).toHaveLength(1);
      expect(result.blocks[0].type).toBe('code');
      expect(result.blocks[0].content).toBe('console.log("Hello");');
    });

    it('should handle inline code elements', () => {
      mockClipboard.setData('text/html', '<p>Use <code>console.log()</code> for debugging</p>');
      
      const result = pasteHandler.processPastedContent(mockClipboard);
      
      expect(result.success).toBe(true);
      expect(result.blocks).toHaveLength(1);
      expect(result.blocks[0].type).toBe('text');
      expect(result.blocks[0].content).toBe('Use console.log() for debugging');
    });

    it('should handle mixed HTML content', () => {
      mockClipboard.setData('text/html', 
        '<h1>Title</h1><p>Paragraph</p><ul><li>List item</li></ul><blockquote>Quote</blockquote>'
      );
      
      const result = pasteHandler.processPastedContent(mockClipboard);
      
      expect(result.success).toBe(true);
      expect(result.blocks).toHaveLength(4);
      expect(result.blocks[0].type).toBe('heading');
      expect(result.blocks[1].type).toBe('text');
      expect(result.blocks[2].type).toBe('bullet');
      expect(result.blocks[3].type).toBe('quote');
    });
  });

  describe('HTML Sanitization', () => {
    it('should remove script tags', () => {
      mockClipboard.setData('text/html', '<p>Safe content</p><script>alert("xss")</script>');
      
      const result = pasteHandler.processPastedContent(mockClipboard);
      
      expect(result.success).toBe(true);
      expect(result.blocks).toHaveLength(1);
      expect(result.blocks[0].content).toBe('Safe content');
    });

    it('should remove event handlers', () => {
      mockClipboard.setData('text/html', '<p onclick="alert(\'xss\')">Click me</p>');
      
      const result = pasteHandler.processPastedContent(mockClipboard);
      
      expect(result.success).toBe(true);
      expect(result.blocks).toHaveLength(1);
      expect(result.blocks[0].content).toBe('Click me');
    });

    it('should remove dangerous elements', () => {
      mockClipboard.setData('text/html', 
        '<p>Safe</p><iframe src="evil.com"></iframe><object data="evil.swf"></object>'
      );
      
      const result = pasteHandler.processPastedContent(mockClipboard);
      
      expect(result.success).toBe(true);
      expect(result.blocks).toHaveLength(1);
      expect(result.blocks[0].content).toBe('Safe');
    });
  });

  describe('Error Handling', () => {
    it('should handle empty clipboard data', () => {
      const result = pasteHandler.processPastedContent(mockClipboard);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('No valid content found');
      expect(result.blocks).toHaveLength(0);
    });

    it('should handle malformed HTML', () => {
      mockClipboard.setData('text/html', '<p>Unclosed paragraph<div>Nested incorrectly</p></div>');
      
      const result = pasteHandler.processPastedContent(mockClipboard);
      
      // Should still process successfully due to browser's HTML parsing
      expect(result.success).toBe(true);
      expect(result.blocks.length).toBeGreaterThan(0);
    });

    it('should respect maxBlocks option', () => {
      const longText = Array.from({ length: 150 }, (_, i) => `Line ${i + 1}`).join('\n');
      mockClipboard.setData('text/plain', longText);
      
      const result = pasteHandler.processPastedContent(mockClipboard, { maxBlocks: 50 });
      
      expect(result.success).toBe(true);
      expect(result.blocks.length).toBeLessThanOrEqual(50);
    });
  });

  describe('Options Handling', () => {
    it('should handle startingBlockId option', () => {
      mockClipboard.setData('text/plain', 'Test content');
      pasteHandler.setStartingBlockId(5000);
      
      const result = pasteHandler.processPastedContent(mockClipboard);
      
      expect(result.success).toBe(true);
      expect(result.blocks[0].id).toBeGreaterThanOrEqual(5000);
    });

    it('should handle maxBlocks option', () => {
      mockClipboard.setData('text/plain', 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5');
      
      const result = pasteHandler.processPastedContent(mockClipboard, { maxBlocks: 3 });
      
      expect(result.success).toBe(true);
      expect(result.blocks).toHaveLength(3);
    });
  });

  describe('Block ID Management', () => {
    it('should generate unique block IDs', () => {
      mockClipboard.setData('text/plain', 'Line 1\nLine 2\nLine 3');
      
      const result = pasteHandler.processPastedContent(mockClipboard);
      
      expect(result.success).toBe(true);
      const ids = result.blocks.map(block => block.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should reset block ID counter', () => {
      pasteHandler.resetBlockIdCounter(2000);
      mockClipboard.setData('text/plain', 'Test content');
      
      const result = pasteHandler.processPastedContent(mockClipboard);
      
      expect(result.success).toBe(true);
      expect(result.blocks[0].id).toBeGreaterThanOrEqual(2000);
    });
  });

  describe('Placeholder Text', () => {
    it('should set appropriate placeholders for different block types', () => {
      mockClipboard.setData('text/html', 
        '<h1>Title</h1><p>Text</p><ul><li>Item</li></ul><blockquote>Quote</blockquote><pre>Code</pre>'
      );
      
      const result = pasteHandler.processPastedContent(mockClipboard);
      
      expect(result.success).toBe(true);
      expect(result.blocks[0].placeholder).toBe('Heading'); // heading
      expect(result.blocks[1].placeholder).toBe('Type something...'); // text
      expect(result.blocks[2].placeholder).toBe('List item'); // bullet
      expect(result.blocks[3].placeholder).toBe('Quote'); // quote
      expect(result.blocks[4].placeholder).toBe('Write your code here...'); // code
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle content from Google Docs', () => {
      // Simulate Google Docs HTML structure
      mockClipboard.setData('text/html', 
        '<div><p><span>Title</span></p><p><span>Paragraph with </span><span style="font-weight:bold">bold</span><span> text</span></p></div>'
      );
      
      const result = pasteHandler.processPastedContent(mockClipboard);
      
      expect(result.success).toBe(true);
      expect(result.blocks.length).toBeGreaterThan(0);
    });

    it('should handle content from Microsoft Word', () => {
      // Simulate Word HTML structure
      mockClipboard.setData('text/html', 
        '<div class="WordSection1"><p class="MsoNormal">Normal paragraph</p><p class="MsoListParagraph">• List item</p></div>'
      );
      
      const result = pasteHandler.processPastedContent(mockClipboard);
      
      expect(result.success).toBe(true);
      expect(result.blocks.length).toBeGreaterThan(0);
    });

    it('should handle content with both HTML and plain text', () => {
      mockClipboard.setData('text/html', '<p>HTML content</p>');
      mockClipboard.setData('text/plain', 'Plain text content');
      
      const result = pasteHandler.processPastedContent(mockClipboard);
      
      // Should prefer HTML content
      expect(result.success).toBe(true);
      expect(result.blocks[0].content).toBe('HTML content');
    });
  });
});