import { JSONContent } from 'novel';

/**
 * Interface for old block format used in the previous editor
 */
interface Block {
  id?: string;
  type: string;
  content: string;
  level?: number;
  language?: string;
  checked?: boolean;
}

/**
 * BackwardCompatibilityConverter utility for converting various note formats
 * to Novel's JSONContent format while preserving content structure and meaning.
 */
export class BackwardCompatibilityConverter {
  /**
   * Main conversion function that detects format and converts to Novel JSONContent
   * @param notes - Notes in any supported format (string, Block[], or JSONContent)
   * @returns JSONContent compatible with Novel editor
   */
  static convertToNovelFormat(notes: string | Block[] | JSONContent): JSONContent {
    // Handle null/undefined/empty cases
    if (!notes) {
      return this.createEmptyDocument();
    }

    // If it's already a JSONContent object, validate and return
    if (typeof notes === 'object' && !Array.isArray(notes)) {
      if (this.isValidJSONContent(notes)) {
        return notes;
      }
      // If it's an invalid object, convert to string and process as text
      try {
        return this.convertPlainTextToNovel(JSON.stringify(notes, null, 2));
      } catch (error) {
        // Handle circular references or other JSON.stringify errors
        console.warn('Failed to stringify object, using fallback:', error);
        return this.convertPlainTextToNovel('[Object with circular reference or invalid structure]');
      }
    }

    // If it's an array, treat as block format
    if (Array.isArray(notes)) {
      return this.convertBlocksToNovelContent(notes);
    }

    // If it's a string, determine the format
    if (typeof notes === 'string') {
      // Try parsing as JSON first
      try {
        const parsed = JSON.parse(notes);
        
        // Check if it's already Novel JSONContent
        if (this.isValidJSONContent(parsed)) {
          return parsed;
        }
        
        // Check if it's block format
        if (Array.isArray(parsed) && this.isBlockFormat(parsed)) {
          return this.convertBlocksToNovelContent(parsed);
        }
        
        // If it's some other JSON, convert to text
        return this.convertPlainTextToNovel(JSON.stringify(parsed, null, 2));
      } catch {
        // Not valid JSON, check if it's HTML or plain text
        if (this.isHtmlContent(notes)) {
          return this.convertHtmlToNovel(notes);
        } else {
          return this.convertPlainTextToNovel(notes);
        }
      }
    }

    // Fallback to empty document
    return this.createEmptyDocument();
  }

  /**
   * Convert old block format to Novel JSONContent
   * @param blocks - Array of Block objects from the old editor
   * @returns JSONContent with converted blocks
   */
  static convertBlocksToNovelContent(blocks: Block[]): JSONContent {
    if (!Array.isArray(blocks)) {
      throw new Error('Invalid blocks format: expected array');
    }

    const content = blocks.map((block, index) => {
      try {
        if (!block || typeof block !== 'object') {
          console.warn(`⚠️ Block ${index} is not a valid object, converting to paragraph:`, block);
          return this.createParagraph(String(block || ''));
        }

        const blockType = block.type || 'text';
        const blockContent = block.content || '';
        
        // Optional debug logging (disabled in production for performance)
        if (process.env.NODE_ENV === 'development') {
          console.log(`🔄 Converting block ${index}: type="${blockType}", content="${blockContent.substring(0, 50)}${blockContent.length > 50 ? '...' : ''}"`);
        }

        switch (blockType) {
          case 'heading':
            return this.createHeading(blockContent, block.level || 1);
          
          case 'bullet':
            return this.createBulletList(blockContent);
          
          case 'numbered':
            return this.createOrderedList(blockContent);
          
          case 'todo':
            return this.createTaskList(blockContent, Boolean(block.checked));
          
          case 'code':
            return this.createCodeBlock(blockContent, block.language);
          
          case 'quote':
            return this.createBlockquote(blockContent);
          
          case 'divider':
            return this.createHorizontalRule();
          
          default: // text or unknown
            return this.createParagraph(blockContent);
        }
      } catch (blockError) {
        console.error(`❌ Error converting block ${index}:`, blockError, block);
        // Fallback to paragraph with error indication
        return this.createParagraph(`[Conversion Error: ${block?.content || 'Invalid block'}]`);
      }
    });

    const result = {
      type: 'doc' as const,
      content: content.length > 0 ? content : [this.createParagraph('')]
    };

    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ Successfully converted ${blocks.length} blocks to Novel format`);
    }
    return result;
  }

  /**
   * Convert HTML content to Novel JSONContent
   * @param html - HTML string to convert
   * @returns JSONContent with HTML converted to Novel format
   */
  static convertHtmlToNovel(html: string): JSONContent {
    if (!html || typeof html !== 'string') {
      return this.createEmptyDocument();
    }

    // Create a temporary DOM element to parse HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html.trim();

    const content: JSONContent[] = [];
    
    // Process each child node
    Array.from(tempDiv.childNodes).forEach(node => {
      const converted = this.convertHtmlNode(node);
      if (converted) {
        content.push(converted);
      }
    });

    return {
      type: 'doc',
      content: content.length > 0 ? content : [this.createParagraph('')]
    };
  }

  /**
   * Convert plain text to Novel JSONContent
   * @param text - Plain text string to convert
   * @returns JSONContent with text as paragraphs
   */
  static convertPlainTextToNovel(text: string): JSONContent {
    if (!text || typeof text !== 'string') {
      return this.createEmptyDocument();
    }

    // Replace literal \n with actual line breaks first
    text = text.replace(/\\n/g, '\n');

    // Split text by double newlines to create paragraphs
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());
    
    if (paragraphs.length === 0) {
      return this.createEmptyDocument();
    }

    const content = paragraphs.map(paragraph => {
      // Handle single line breaks within paragraphs
      const lines = paragraph.split('\n').filter(line => line.trim());
      const text = lines.join(' ').trim();
      return this.createParagraph(text);
    });

    return {
      type: 'doc',
      content
    };
  }

  // Helper methods for creating Novel JSONContent nodes

  private static createEmptyDocument(): JSONContent {
    return {
      type: 'doc',
      content: [{ type: 'paragraph', content: [] }]
    };
  }

  private static createParagraph(text: string): JSONContent {
    return {
      type: 'paragraph',
      content: text ? [{ type: 'text', text: String(text) }] : []
    };
  }

  private static createHeading(text: string, level: number = 1): JSONContent {
    // Ensure level is between 1 and 6
    const validLevel = Math.max(1, Math.min(6, level));
    return {
      type: 'heading',
      attrs: { level: validLevel },
      content: text ? [{ type: 'text', text: String(text) }] : []
    };
  }

  private static createBulletList(text: string): JSONContent {
    return {
      type: 'bulletList',
      content: [{
        type: 'listItem',
        content: [{
          type: 'paragraph',
          content: text ? [{ type: 'text', text: String(text) }] : []
        }]
      }]
    };
  }

  private static createOrderedList(text: string): JSONContent {
    return {
      type: 'orderedList',
      content: [{
        type: 'listItem',
        content: [{
          type: 'paragraph',
          content: text ? [{ type: 'text', text: String(text) }] : []
        }]
      }]
    };
  }

  private static createTaskList(text: string, checked: boolean = false): JSONContent {
    return {
      type: 'taskList',
      content: [{
        type: 'taskItem',
        attrs: { checked },
        content: [{
          type: 'paragraph',
          content: text ? [{ type: 'text', text: String(text) }] : []
        }]
      }]
    };
  }

  private static createCodeBlock(text: string, language?: string): JSONContent {
    // Replace literal \n with actual line breaks
    // Also handle double-escaped \\n and other escape sequences
    let processedText = text ? String(text) : '';
    
    // Debug log to see what we're receiving
    if (processedText.includes('\\n') || processedText.includes('\\\\n')) {
      console.log('🔍 Code block before processing:', processedText.substring(0, 100));
    }
    
    // Handle various escape levels
    processedText = processedText.replace(/\\\\n/g, '\n'); // Handle \\n
    processedText = processedText.replace(/\\n/g, '\n');   // Handle \n
    
    if (text && text !== processedText) {
      console.log('✅ Code block after processing:', processedText.substring(0, 100));
    }
    
    return {
      type: 'codeBlock',
      attrs: language ? { language } : {},
      content: processedText ? [{ type: 'text', text: processedText }] : []
    };
  }

  private static createBlockquote(text: string): JSONContent {
    return {
      type: 'blockquote',
      content: [{
        type: 'paragraph',
        content: text ? [{ type: 'text', text: String(text) }] : []
      }]
    };
  }

  private static createHorizontalRule(): JSONContent {
    return { type: 'horizontalRule' };
  }

  // Validation and detection helper methods

  private static isValidJSONContent(obj: any): obj is JSONContent {
    return obj && 
           typeof obj === 'object' && 
           obj.type === 'doc' && 
           Array.isArray(obj.content);
  }

  private static isBlockFormat(arr: any[]): boolean {
    if (!Array.isArray(arr) || arr.length === 0) {
      return false;
    }
    
    // Check if first element looks like a block
    const firstElement = arr[0];
    return firstElement && 
           typeof firstElement === 'object' && 
           ('id' in firstElement || 'type' in firstElement);
  }

  private static isHtmlContent(text: string): boolean {
    // Simple check for HTML tags
    return text.includes('<') && text.includes('>') && 
           /<[^>]+>/.test(text);
  }

  private static convertHtmlNode(node: Node): JSONContent | null {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      return text ? this.createParagraph(text) : null;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      const tagName = element.tagName.toLowerCase();
      const textContent = element.textContent?.trim() || '';

      switch (tagName) {
        case 'h1':
          return this.createHeading(textContent, 1);
        case 'h2':
          return this.createHeading(textContent, 2);
        case 'h3':
          return this.createHeading(textContent, 3);
        case 'h4':
          return this.createHeading(textContent, 4);
        case 'h5':
          return this.createHeading(textContent, 5);
        case 'h6':
          return this.createHeading(textContent, 6);
        case 'p':
          return this.createParagraph(textContent);
        case 'ul':
          // For now, convert to single bullet list item
          // In a more sophisticated implementation, we'd parse child <li> elements
          return this.createBulletList(textContent);
        case 'ol':
          return this.createOrderedList(textContent);
        case 'li':
          return this.createParagraph(textContent);
        case 'blockquote':
          return this.createBlockquote(textContent);
        case 'pre':
        case 'code':
          return this.createCodeBlock(textContent);
        case 'hr':
          return this.createHorizontalRule();
        case 'br':
          return null; // Skip line breaks
        case 'div':
        case 'span':
          return textContent ? this.createParagraph(textContent) : null;
        default:
          // For unknown tags, extract text content
          return textContent ? this.createParagraph(textContent) : null;
      }
    }

    return null;
  }
}

// Export individual functions for convenience
export const convertToNovelFormat = BackwardCompatibilityConverter.convertToNovelFormat.bind(BackwardCompatibilityConverter);
export const convertBlocksToNovelContent = BackwardCompatibilityConverter.convertBlocksToNovelContent.bind(BackwardCompatibilityConverter);
export const convertHtmlToNovel = BackwardCompatibilityConverter.convertHtmlToNovel.bind(BackwardCompatibilityConverter);
export const convertPlainTextToNovel = BackwardCompatibilityConverter.convertPlainTextToNovel.bind(BackwardCompatibilityConverter);