/**
 * PasteHandler utility class for processing different content types from clipboard
 * Supports HTML content sanitization and conversion to editor format
 * Preserves bullet point and numbered list structures from pasted content
 */

export interface ProcessedContent {
  blocks: Block[];
  success: boolean;
  error?: string;
}

export interface Block {
  id: number;
  type: string;
  content: string;
  placeholder?: string;
  level?: number;
}

export interface PasteOptions {
  startingBlockId?: number;
  preserveCurrentBlockType?: boolean;
  maxBlocks?: number;
}

export class PasteHandler {
  private static instance: PasteHandler;
  private blockIdCounter: number = 1000; // Start high to avoid conflicts

  private constructor() {}

  public static getInstance(): PasteHandler {
    if (!PasteHandler.instance) {
      PasteHandler.instance = new PasteHandler();
    }
    return PasteHandler.instance;
  }

  /**
   * Main method to process pasted content from clipboard
   */
  public processPastedContent(
    clipboardData: DataTransfer,
    options: PasteOptions = {}
  ): ProcessedContent {
    try {
      const htmlData = clipboardData.getData('text/html');
      const textData = clipboardData.getData('text/plain');

      // Determine content type and process accordingly
      if (htmlData && htmlData.trim()) {
        return this.processHTMLContent(htmlData, options);
      } else if (textData && textData.trim()) {
        return this.processPlainTextContent(textData, options);
      } else {
        return {
          blocks: [],
          success: false,
          error: 'No valid content found in clipboard'
        };
      }
    } catch (error) {
      return {
        blocks: [],
        success: false,
        error: `Error processing clipboard content: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Process HTML content and convert to editor format
   */
  private processHTMLContent(html: string, options: PasteOptions): ProcessedContent {
    try {
      // Sanitize HTML content
      const sanitizedHtml = this.sanitizeHTML(html);
      
      // Parse HTML to DOM
      const parser = new DOMParser();
      const doc = parser.parseFromString(sanitizedHtml, 'text/html');
      
      // Convert HTML to blocks
      const blocks = this.convertHTMLToEditorFormat(doc.body, options);
      
      return {
        blocks,
        success: true
      };
    } catch (error) {
      return {
        blocks: [],
        success: false,
        error: `Error processing HTML content: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Process plain text content and preserve list structures
   */
  private processPlainTextContent(text: string, options: PasteOptions): ProcessedContent {
    try {
      const blocks = this.handlePlainTextLists(text, options);
      
      return {
        blocks,
        success: true
      };
    } catch (error) {
      return {
        blocks: [],
        success: false,
        error: `Error processing plain text content: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Sanitize HTML content to prevent XSS attacks
   */
  private sanitizeHTML(html: string): string {
    // Create a temporary div to parse HTML safely
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    // Remove script tags and event handlers
    const scripts = tempDiv.querySelectorAll('script');
    scripts.forEach(script => script.remove());

    // Remove dangerous attributes
    const allElements = tempDiv.querySelectorAll('*');
    allElements.forEach(element => {
      // Remove event handler attributes
      const attributes = Array.from(element.attributes);
      attributes.forEach(attr => {
        if (attr.name.startsWith('on') || attr.name === 'javascript:') {
          element.removeAttribute(attr.name);
        }
      });

      // Remove dangerous elements
      const dangerousTags = ['script', 'object', 'embed', 'iframe', 'form', 'input'];
      if (dangerousTags.includes(element.tagName.toLowerCase())) {
        element.remove();
      }
    });

    return tempDiv.innerHTML;
  }

  /**
   * Convert HTML DOM to editor block format
   */
  private convertHTMLToEditorFormat(element: HTMLElement, options: PasteOptions): Block[] {
    const blocks: Block[] = [];
    const maxBlocks = options.maxBlocks || 100;

    const processElement = (el: HTMLElement | Node, level: number = 0) => {
      if (blocks.length >= maxBlocks) return;

      if (el.nodeType === Node.ELEMENT_NODE) {
        const htmlElement = el as HTMLElement;
        const tagName = htmlElement.tagName.toLowerCase();

        switch (tagName) {
          case 'h1':
          case 'h2':
          case 'h3':
          case 'h4':
          case 'h5':
          case 'h6':
            if (blocks.length < maxBlocks) {
              this.addBlock(blocks, 'heading', htmlElement.textContent?.trim() || '');
            }
            break;

          case 'p':
            const pContent = htmlElement.textContent?.trim();
            if (pContent && blocks.length < maxBlocks) {
              this.addBlock(blocks, 'text', pContent);
            }
            break;

          case 'ul':
          case 'ol':
            this.processListElement(htmlElement, blocks, level, maxBlocks);
            break;

          case 'li':
            // Handle list items (processed by parent ul/ol)
            break;

          case 'blockquote':
            if (blocks.length < maxBlocks) {
              this.addBlock(blocks, 'quote', htmlElement.textContent?.trim() || '');
            }
            break;

          case 'pre':
          case 'code':
            if (blocks.length < maxBlocks) {
              this.addBlock(blocks, 'code', htmlElement.textContent?.trim() || '');
            }
            break;

          case 'br':
            // Skip line breaks as they're handled by paragraph structure
            break;

          case 'div':
            // Process div children
            Array.from(htmlElement.childNodes).forEach(child => {
              if (blocks.length < maxBlocks) {
                processElement(child, level);
              }
            });
            break;

          case 'strong':
          case 'b':
          case 'em':
          case 'i':
            // For inline formatting, extract text content
            const inlineContent = htmlElement.textContent?.trim();
            if (inlineContent && blocks.length < maxBlocks) {
              this.addBlock(blocks, 'text', inlineContent);
            }
            break;

          default:
            // For other elements, process their children
            Array.from(htmlElement.childNodes).forEach(child => {
              if (blocks.length < maxBlocks) {
                processElement(child, level);
              }
            });
            break;
        }
      } else if (el.nodeType === Node.TEXT_NODE) {
        const textContent = el.textContent?.trim();
        if (textContent && blocks.length < maxBlocks) {
          this.addBlock(blocks, 'text', textContent);
        }
      }
    };

    processElement(element);
    return blocks;
  }

  /**
   * Process list elements (ul/ol) and maintain hierarchy
   */
  private processListElement(listElement: HTMLElement, blocks: Block[], level: number = 0, maxBlocks: number = 100) {
    const listItems = Array.from(listElement.children).filter(
      child => child.tagName.toLowerCase() === 'li'
    );

    listItems.forEach(li => {
      if (blocks.length >= maxBlocks) return;
      
      const liElement = li as HTMLElement;
      
      // Extract text content, excluding nested lists
      let textContent = '';
      Array.from(liElement.childNodes).forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
          textContent += node.textContent || '';
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as HTMLElement;
          if (!['ul', 'ol'].includes(element.tagName.toLowerCase())) {
            textContent += element.textContent || '';
          }
        }
      });

      if (textContent.trim() && blocks.length < maxBlocks) {
        this.addBlock(blocks, 'bullet', textContent.trim(), level > 0 ? level : undefined);
      }

      // Process nested lists
      const nestedLists = liElement.querySelectorAll(':scope > ul, :scope > ol');
      nestedLists.forEach(nestedList => {
        if (blocks.length < maxBlocks) {
          this.processListElement(nestedList as HTMLElement, blocks, level + 1, maxBlocks);
        }
      });
    });
  }

  /**
   * Handle plain text with list structures
   */
  private handlePlainTextLists(text: string, options: PasteOptions): Block[] {
    const blocks: Block[] = [];
    const lines = text.split('\n').filter(line => line.trim() !== '');
    const maxBlocks = options.maxBlocks || 100;

    for (const line of lines) {
      if (blocks.length >= maxBlocks) break;
      
      const trimmedLine = line.trim();
      
      // Check for task lists first (more specific pattern) - capture leading whitespace from original line
      const taskMatch = line.match(/^(\s*)[-*]\s+\[([ xX])\]\s+(.+)$/);
      if (taskMatch) {
        const [, indent, , content] = taskMatch;
        const level = Math.floor(indent.length / 2);
        this.addBlock(blocks, 'bullet', content, level > 0 ? level : undefined); // Convert to bullet for now
        continue;
      }

      // Check for bullet points - capture leading whitespace from original line
      const bulletMatch = line.match(/^(\s*)([-*•])\s+(.+)$/);
      if (bulletMatch) {
        const [, indent, , content] = bulletMatch;
        const level = Math.floor(indent.length / 2); // 2 spaces per level
        this.addBlock(blocks, 'bullet', content, level > 0 ? level : undefined);
        continue;
      }

      // Check for numbered lists - capture leading whitespace from original line
      const numberedMatch = line.match(/^(\s*)(\d+\.)\s+(.+)$/);
      if (numberedMatch) {
        const [, indent, , content] = numberedMatch;
        const level = Math.floor(indent.length / 2); // 2 spaces per level
        this.addBlock(blocks, 'bullet', content, level > 0 ? level : undefined); // Use bullet type for consistency
        continue;
      }

      // Regular text
      if (trimmedLine) {
        this.addBlock(blocks, 'text', trimmedLine);
      }
    }

    return blocks;
  }

  /**
   * Add a new block to the blocks array
   */
  private addBlock(blocks: Block[], type: string, content: string, level?: number) {
    if (!content.trim()) return;

    const block: Block = {
      id: this.blockIdCounter++,
      type,
      content: content.trim(),
      placeholder: this.getPlaceholderForType(type)
    };

    if (level !== undefined) {
      block.level = level;
    }

    blocks.push(block);
  }

  /**
   * Get appropriate placeholder text for block type
   */
  private getPlaceholderForType(type: string): string {
    const placeholders: { [key: string]: string } = {
      text: 'Type something...',
      heading: 'Heading',
      bullet: 'List item',
      quote: 'Quote',
      code: 'Write your code here...',
      divider: ''
    };

    return placeholders[type] || 'Type something...';
  }

  /**
   * Preserve list structure from HTML
   */
  public preserveListStructure(html: string): string {
    // This method can be used for more advanced list structure preservation
    // For now, it returns the sanitized HTML
    return this.sanitizeHTML(html);
  }

  /**
   * Reset the block ID counter (useful for testing)
   */
  public resetBlockIdCounter(startId: number = 1000) {
    this.blockIdCounter = startId;
  }

  /**
   * Set the starting block ID for new blocks
   */
  public setStartingBlockId(id: number) {
    this.blockIdCounter = Math.max(id, this.blockIdCounter);
  }
}

// Export singleton instance
export const pasteHandler = PasteHandler.getInstance();