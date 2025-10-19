import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Code, Type, Hash, List, Quote, Minus, CheckSquare } from 'lucide-react';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs';
import 'prismjs/components/prism-python';
import 'prismjs/themes/prism-tomorrow.css';
import '../notionEditor.css';
import '../styles/media-blocks.css';
import { pasteHandler, ProcessedContent } from '../services/PasteHandler';
import ExtendedSlashCommand from './ExtendedSlashCommand';
import ImageWithDescription from './media/ImageWithDescription';
import YouTubeWithDescription from './media/YouTubeWithDescription';

export interface SharedRichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onSave?: (content: string) => void;
  autoSave?: boolean;
  autoSaveDelay?: number;
}

export type Block = {
  id: number;
  type: string;
  content: string;
  placeholder?: string;
  level?: number; // For nested lists: 0 = main level, 1 = sub-level, 2 = sub-sub-level, etc.
  checked?: boolean; // For todo items
  // Media block properties
  src?: string; // For image blocks
  alt?: string; // For image blocks
  videoId?: string; // For YouTube blocks
  videoUrl?: string; // For YouTube blocks
  description?: string; // For media blocks with descriptions
};

const blockTypes = [
  { type: 'text', icon: Type, label: 'Text', placeholder: 'Type something...' },
  { type: 'code', icon: Code, label: 'Code', placeholder: 'Write your code here...' },
  { type: 'heading', icon: Hash, label: 'Heading', placeholder: 'Heading' },
  { type: 'bullet', icon: List, label: 'Bullet List', placeholder: 'List item' },
  { type: 'numbered', icon: List, label: 'Numbered List', placeholder: 'List item' },
  { type: 'todo', icon: CheckSquare, label: 'To-do List', placeholder: 'Task item' },
  { type: 'quote', icon: Quote, label: 'Quote', placeholder: 'Quote' },
  { type: 'divider', icon: Minus, label: 'Divider', placeholder: '' }
];

const SharedRichTextEditor: React.FC<SharedRichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Type "/" for commands',
  className = '',
  onSave,
  autoSave = false,
  autoSaveDelay = 500
}) => {
  const [blocks, setBlocks] = useState<Block[]>([
    { id: 1, type: 'text', content: '', placeholder }
  ]);
  const [showMenu, setShowMenu] = useState<{ show: boolean; blockId: number | null; x?: number; y?: number }>({ show: false, blockId: null });
  const [activeBlock, setActiveBlock] = useState(1);
  const [isDirty, setIsDirty] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  const textareaRefs = useRef<{ [key: number]: HTMLTextAreaElement | null }>({});
  const codeBlockRefs = useRef<{ [key: number]: any }>({});
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Use refs to track initialization and prevent infinite loops
  const isInitializingRef = useRef(true);
  const lastValueRef = useRef(value);

  // Initialize blocks from value prop
  useEffect(() => {
    // Only initialize if the value actually changed
    if (value === lastValueRef.current) {
      return;
    }
    
    lastValueRef.current = value;
    isInitializingRef.current = true;
    
    if (value) {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setBlocks(parsed);
          setActiveBlock(parsed[0].id);
          setTimeout(() => { isInitializingRef.current = false; }, 0);
          return;
        }
      } catch (error) {
        // If parsing fails, treat as plain text
        setBlocks([{ id: 1, type: 'text', content: value, placeholder }]);
        setActiveBlock(1);
        setTimeout(() => { isInitializingRef.current = false; }, 0);
        return;
      }
    }
    setBlocks([{ id: 1, type: 'text', content: '', placeholder }]);
    setActiveBlock(1);
    setTimeout(() => { isInitializingRef.current = false; }, 0);
  }, [value, placeholder]);

  // Call onChange only when blocks change due to user interaction (not initialization)
  useEffect(() => {
    if (!isInitializingRef.current) {
      const content = JSON.stringify(blocks);
      onChange(content);
      setIsDirty(true);
    }
  }, [blocks, onChange]);

  // Auto-save functionality with debouncing
  useEffect(() => {
    if (autoSave && isDirty && onSave && !isInitializingRef.current) {
      setIsAutoSaving(true);
      const timeoutId = setTimeout(() => {
        const content = JSON.stringify(blocks);
        onSave(content);
        setIsDirty(false);
        setIsAutoSaving(false);
        setLastSaved(new Date());
      }, autoSaveDelay);

      return () => {
        clearTimeout(timeoutId);
        setIsAutoSaving(false);
      };
    }
  }, [autoSave, autoSaveDelay, onSave, isDirty, blocks]);

  // Paste event handler
  const handlePaste = useCallback((e: ClipboardEvent) => {
    e.preventDefault();
    
    if (!e.clipboardData) {
      console.warn('No clipboard data available');
      return;
    }

    try {
      // Set starting block ID to avoid conflicts
      const maxId = Math.max(...blocks.map(b => b.id));
      pasteHandler.setStartingBlockId(maxId + 1);

      // Process pasted content
      const result: ProcessedContent = pasteHandler.processPastedContent(e.clipboardData, {
        startingBlockId: maxId + 1,
        maxBlocks: 50 // Reasonable limit to prevent performance issues
      });

      if (result.success && result.blocks.length > 0) {
        // Find the current active block
        const currentBlockIndex = blocks.findIndex(b => b.id === activeBlock);
        
        if (currentBlockIndex !== -1) {
          // Insert the new blocks after the current active block
          const newBlocks = [...blocks];
          newBlocks.splice(currentBlockIndex + 1, 0, ...result.blocks);
          setBlocks(newBlocks);

          // Set focus to the first pasted block
          const firstPastedBlock = result.blocks[0];
          setActiveBlock(firstPastedBlock.id);

          // Focus the textarea after a short delay
          setTimeout(() => {
            const textarea = textareaRefs.current[firstPastedBlock.id];
            if (textarea) {
              textarea.focus();
              textarea.setSelectionRange(firstPastedBlock.content.length, firstPastedBlock.content.length);
            }
          }, 100);
        } else {
          // If no active block found, append to the end
          setBlocks(prevBlocks => [...prevBlocks, ...result.blocks]);
          
          // Set focus to the first pasted block
          const firstPastedBlock = result.blocks[0];
          setActiveBlock(firstPastedBlock.id);

          setTimeout(() => {
            const textarea = textareaRefs.current[firstPastedBlock.id];
            if (textarea) {
              textarea.focus();
              textarea.setSelectionRange(firstPastedBlock.content.length, firstPastedBlock.content.length);
            }
          }, 100);
        }
      } else if (result.error) {
        console.error('Paste error:', result.error);
        // Could show a user-friendly error message here
      }
    } catch (error) {
      console.error('Error handling paste:', error);
      // Fallback: let the default paste behavior happen
      // by not preventing the default action
    }
  }, [blocks, activeBlock]);

  // Add paste event listener to the document
  useEffect(() => {
    const handleDocumentPaste = (e: ClipboardEvent) => {
      // Only handle paste if the focus is within our editor
      const activeElement = document.activeElement;
      const editorElement = document.querySelector('.shared-rich-text-editor');
      
      if (editorElement && editorElement.contains(activeElement)) {
        handlePaste(e);
      }
    };

    document.addEventListener('paste', handleDocumentPaste);
    
    return () => {
      document.removeEventListener('paste', handleDocumentPaste);
    };
  }, [handlePaste]);

  const addNewBlock = useCallback((afterBlockId: number, type = 'text', level?: number) => {
    const newBlockId = Math.max(...blocks.map(b => b.id)) + 1;
    const newBlock: Block = {
      id: newBlockId,
      type: type,
      content: '',
      placeholder: blockTypes.find(t => t.type === type)?.placeholder || '',
      level: ['bullet', 'numbered', 'todo'].includes(type) ? (level || 0) : undefined
    };

    const currentIndex = blocks.findIndex(b => b.id === afterBlockId);
    const newBlocks = [...blocks];
    newBlocks.splice(currentIndex + 1, 0, newBlock);
    setBlocks(newBlocks);
    setActiveBlock(newBlockId);

    setTimeout(() => {
      const textarea = textareaRefs.current[newBlockId];
      if (textarea) textarea.focus();
    }, 0);
  }, [blocks]);

  const deleteBlock = useCallback((blockId: number) => {
    if (blocks.length > 1) {
      const deletedIndex = blocks.findIndex(b => b.id === blockId);
      const newBlocks = blocks.filter(block => block.id !== blockId);
      setBlocks(newBlocks);

      // Set active block to the previous one or next one
      const newActiveBlock = newBlocks[Math.max(0, deletedIndex - 1)];
      if (newActiveBlock) {
        setActiveBlock(newActiveBlock.id);
        setTimeout(() => {
          const textarea = textareaRefs.current[newActiveBlock.id];
          if (textarea) textarea.focus();
        }, 0);
      }
    }
  }, [blocks]);

  const changeBlockType = useCallback((blockId: number, newType: string) => {
    const currentBlock = blocks.find(b => b.id === blockId);
    if (!currentBlock) return;

    const cleanContent = newType === 'divider' ? '' : currentBlock.content.replace(/^\/\w*/, '').trim();
    
    let newBlock: Block = {
      ...currentBlock,
      type: newType,
      content: cleanContent,
      placeholder: blockTypes.find(t => t.type === newType)?.placeholder || '',
      level: ['bullet', 'numbered', 'todo'].includes(newType) ? (currentBlock.level || 0) : undefined,
      checked: newType === 'todo' ? false : undefined
    };

    // Handle media block types
    if (newType === 'image-with-description') {
      newBlock = {
        ...newBlock,
        type: 'image-with-description',
        src: '',
        alt: '',
        description: '',
        placeholder: ''
      };
    } else if (newType === 'youtube-with-description') {
      newBlock = {
        ...newBlock,
        type: 'youtube-with-description',
        videoId: '',
        videoUrl: '',
        description: '',
        placeholder: ''
      };
    }

    const newBlocks = blocks.map(block =>
      block.id === blockId ? newBlock : block
    );

    setBlocks(newBlocks);
    setShowMenu({ show: false, blockId: null });

    setTimeout(() => {
      if (newType !== 'divider' && !['image-with-description', 'youtube-with-description'].includes(newType)) {
        const textarea = textareaRefs.current[blockId];
        if (textarea) {
          textarea.focus();
          textarea.setSelectionRange(cleanContent.length, cleanContent.length);
        }
      }
    }, 150);
  }, [blocks]);

  const handleInputChange = useCallback((blockId: number, value: string) => {
    // Handle slash commands
    if (value.startsWith('/')) {
      const textarea = textareaRefs.current[blockId];
      if (textarea) {
        const rect = textarea.getBoundingClientRect();
        const blockContainer = textarea.closest('.relative.group.mb-2');
        const containerRect = blockContainer?.getBoundingClientRect();

        if (containerRect) {
          let relativeX = rect.left - containerRect.left;
          const cursorPosition = textarea.selectionStart || 0;
          const textBeforeCursor = textarea.value.substring(0, cursorPosition);
          const lines = textBeforeCursor.split('\n');
          const currentLine = lines.length - 1;
          const lineHeight = 24;
          let relativeY = rect.top - containerRect.top + (currentLine * lineHeight) + lineHeight + 5;

          const menuWidth = 256;
          const menuHeight = 200;

          if (relativeX + menuWidth > containerRect.width) {
            relativeX = containerRect.width - menuWidth - 10;
          }

          if (relativeY + menuHeight > containerRect.height) {
            relativeY = rect.top - containerRect.top - menuHeight - 10;
          }

          if (relativeX < 0) {
            relativeX = 10;
          }

          setShowMenu({ show: true, blockId, x: relativeX, y: relativeY });
        }
      }

      // Handle specific slash commands
      const commands = {
        '/code': 'code',
        '/heading': 'heading',
        '/bullet': 'bullet',
        '/numbered': 'numbered',
        '/todo': 'todo',
        '/quote': 'quote',
        '/divider': 'divider',
        '/image': 'image-with-description',
        '/youtube': 'youtube-with-description'
      };

      if (commands[value as keyof typeof commands]) {
        setTimeout(() => {
          changeBlockType(blockId, commands[value as keyof typeof commands]);
        }, 100);
        return;
      }
    } else {
      if (showMenu.show && showMenu.blockId === blockId) {
        setShowMenu({ show: false, blockId: null });
      }
    }

    // Update blocks
    const newBlocks = blocks.map(block =>
      block.id === blockId ? { ...block, content: value } : block
    );
    setBlocks(newBlocks);
  }, [blocks, showMenu, changeBlockType]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>, blockId: number) => {
    const currentBlock = blocks.find(b => b.id === blockId);
    const textarea = e.target as HTMLTextAreaElement;
    const cursorPosition = textarea.selectionStart || 0;

    // Handle keyboard shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault();
          toggleTextFormatting(blockId, 'bold');
          return;
        case 'i':
          e.preventDefault();
          toggleTextFormatting(blockId, 'italic');
          return;
        case 'k':
          e.preventDefault();
          showLinkDialog(blockId);
          return;
      }
    }

    // Handle slash command menu navigation
    if (showMenu.show && showMenu.blockId === blockId) {
      if (['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(e.key)) {
        // Let the menu handle these keys
        const menuElement = menuRef.current;
        if (menuElement) {
          // Create a synthetic keyboard event for the menu
          const syntheticEvent = new KeyboardEvent('keydown', {
            key: e.key,
            code: e.code,
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey,
            shiftKey: e.shiftKey,
            altKey: e.altKey,
            bubbles: true,
            cancelable: true
          });
          menuElement.dispatchEvent(syntheticEvent);
          e.preventDefault();
          return;
        }
      }
    }

    // Handle Escape key
    if (e.key === 'Escape' && showMenu.show) {
      setShowMenu({ show: false, blockId: null });
      return;
    }

    // Handle Enter key
    if (e.key === 'Enter' && !showMenu.show) {
      e.preventDefault();

      // Check for double Enter to exit list
      if (currentBlock && ['bullet', 'numbered', 'todo'].includes(currentBlock.type) && currentBlock.content.trim() === '') {
        // Convert empty list item to text block
        const newBlocks = blocks.map(block =>
          block.id === blockId ? {
            ...block,
            type: 'text',
            placeholder: 'Type something...',
            level: undefined,
            checked: undefined
          } : block
        );
        setBlocks(newBlocks);
        return;
      }

      // If cursor is at the start, move current block down
      if (cursorPosition === 0) {
        const newBlockId = Math.max(...blocks.map(b => b.id)) + 1;
        const newBlock: Block = {
          id: newBlockId,
          type: 'text',
          content: '',
          placeholder: 'Type something...'
        };

        const currentIndex = blocks.findIndex(b => b.id === blockId);
        const newBlocks = [...blocks];
        newBlocks.splice(currentIndex, 0, newBlock);
        setBlocks(newBlocks);
        setActiveBlock(blockId);

        setTimeout(() => {
          const textarea = textareaRefs.current[blockId];
          if (textarea) {
            textarea.focus();
            textarea.setSelectionRange(0, 0);
          }
        }, 0);
        return;
      }

      // Create new block based on current block type
      if (currentBlock && ['bullet', 'numbered', 'todo'].includes(currentBlock.type)) {
        addNewBlock(blockId, currentBlock.type, currentBlock.level);
      } else {
        addNewBlock(blockId);
      }
    }

    // Handle Tab key for list indentation
    if (e.key === 'Tab') {
      if (currentBlock && ['bullet', 'numbered', 'todo'].includes(currentBlock.type)) {
        e.preventDefault();

        if (e.shiftKey) {
          // Shift+Tab: Decrease indentation
          if ((currentBlock.level || 0) > 0) {
            const newBlocks = blocks.map(block =>
              block.id === blockId ? {
                ...block,
                level: Math.max(0, (block.level || 0) - 1)
              } : block
            );
            setBlocks(newBlocks);
          }
        } else {
          // Tab: Increase indentation (max 3 levels)
          if ((currentBlock.level || 0) < 3) {
            const newBlocks = blocks.map(block =>
              block.id === blockId ? {
                ...block,
                level: (block.level || 0) + 1
              } : block
            );
            setBlocks(newBlocks);
          }
        }
      }
    }

    // Handle Backspace key
    if (e.key === 'Backspace' && cursorPosition === 0) {
      e.preventDefault();

      // Convert list item to text block if at beginning
      if (currentBlock && ['bullet', 'numbered', 'todo'].includes(currentBlock.type)) {
        if ((currentBlock.level || 0) > 0) {
          // Decrease indentation level first
          const newBlocks = blocks.map(block =>
            block.id === blockId ? {
              ...block,
              level: Math.max(0, (block.level || 0) - 1)
            } : block
          );
          setBlocks(newBlocks);
        } else {
          // Convert to text block
          const newBlocks = blocks.map(block =>
            block.id === blockId ? {
              ...block,
              type: 'text',
              placeholder: 'Type something...',
              level: undefined,
              checked: undefined
            } : block
          );
          setBlocks(newBlocks);
        }
        return;
      }

      // Handle merging with previous block
      if (blocks.length > 1) {
        const currentIndex = blocks.findIndex(b => b.id === blockId);
        const prevBlock = blocks[currentIndex - 1];

        if (prevBlock && prevBlock.type !== 'divider') {
          const newContent = prevBlock.content + textarea.value;
          const newBlocks = blocks.map(block =>
            block.id === prevBlock.id ? { ...block, content: newContent } : block
          ).filter(block => block.id !== blockId);

          setBlocks(newBlocks);
          setActiveBlock(prevBlock.id);

          setTimeout(() => {
            const prevTextarea = textareaRefs.current[prevBlock.id];
            if (prevTextarea) {
              prevTextarea.focus();
              prevTextarea.setSelectionRange(prevBlock.content.length, prevBlock.content.length);
            }
          }, 0);
        } else {
          deleteBlock(blockId);
        }
      }
    }
  }, [blocks, showMenu, addNewBlock, deleteBlock]);

  const toggleTodoItem = useCallback((blockId: number) => {
    const newBlocks = blocks.map(block =>
      block.id === blockId ? { ...block, checked: !block.checked } : block
    );
    setBlocks(newBlocks);
  }, [blocks]);

  const toggleTextFormatting = useCallback((blockId: number, format: 'bold' | 'italic') => {
    const textarea = textareaRefs.current[blockId];
    if (!textarea) return;

    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const selectedText = textarea.value.substring(start, end);
    
    if (selectedText) {
      const currentBlock = blocks.find(b => b.id === blockId);
      if (!currentBlock) return;

      let newText: string;
      const formatTag = format === 'bold' ? '**' : '*';
      const formatRegex = format === 'bold' ? /^\*\*(.*)\*\*$/ : /^\*(.*)\*$/;

      // Check if selected text is already formatted
      if (formatRegex.test(selectedText)) {
        // Remove formatting
        newText = selectedText.replace(formatRegex, '$1');
      } else {
        // Add formatting
        newText = `${formatTag}${selectedText}${formatTag}`;
      }

      const beforeSelection = currentBlock.content.substring(0, start);
      const afterSelection = currentBlock.content.substring(end);
      const newContent = beforeSelection + newText + afterSelection;

      const newBlocks = blocks.map(block =>
        block.id === blockId ? { ...block, content: newContent } : block
      );
      setBlocks(newBlocks);

      // Restore selection
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start, start + newText.length);
      }, 0);
    }
  }, [blocks]);

  const showLinkDialog = useCallback((blockId: number) => {
    const textarea = textareaRefs.current[blockId];
    if (!textarea) return;

    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const selectedText = textarea.value.substring(start, end);
    
    const url = prompt('Enter URL:', 'https://');
    if (url && url.trim()) {
      const currentBlock = blocks.find(b => b.id === blockId);
      if (!currentBlock) return;

      const linkText = selectedText || 'link';
      const linkMarkdown = `[${linkText}](${url.trim()})`;
      
      const beforeSelection = currentBlock.content.substring(0, start);
      const afterSelection = currentBlock.content.substring(end);
      const newContent = beforeSelection + linkMarkdown + afterSelection;

      const newBlocks = blocks.map(block =>
        block.id === blockId ? { ...block, content: newContent } : block
      );
      setBlocks(newBlocks);

      // Restore focus and position cursor after the link
      setTimeout(() => {
        textarea.focus();
        const newCursorPosition = start + linkMarkdown.length;
        textarea.setSelectionRange(newCursorPosition, newCursorPosition);
      }, 0);
    }
  }, [blocks]);

  // Handle media block updates
  const handleMediaBlockUpdate = useCallback((blockId: number, updates: Partial<Block>) => {
    const newBlocks = blocks.map(block =>
      block.id === blockId ? { ...block, ...updates } : block
    );
    setBlocks(newBlocks);
  }, [blocks]);

  // Handle media block removal
  const handleMediaBlockRemove = useCallback((blockId: number) => {
    deleteBlock(blockId);
  }, [deleteBlock]);

  const renderBlock = (block: Block) => {
    const isActive = activeBlock === block.id;
    const indentLevel = block.level || 0;
    const indentClass = indentLevel > 0 ? `ml-${indentLevel * 6}` : '';

    switch (block.type) {
      case 'text':
        return (
          <div key={block.id} className={`relative group mb-2 ${indentClass}`}>
            <textarea
              ref={(el) => (textareaRefs.current[block.id] = el)}
              value={block.content}
              onChange={(e) => handleInputChange(block.id, e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, block.id)}
              onFocus={() => setActiveBlock(block.id)}
              placeholder={block.placeholder}
              className="w-full p-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={Math.max(1, Math.ceil(block.content.length / 50))}
            />
          </div>
        );

      case 'heading':
        return (
          <div key={block.id} className={`relative group mb-2 ${indentClass}`}>
            <textarea
              ref={(el) => (textareaRefs.current[block.id] = el)}
              value={block.content}
              onChange={(e) => handleInputChange(block.id, e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, block.id)}
              onFocus={() => setActiveBlock(block.id)}
              placeholder={block.placeholder}
              className="w-full p-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-2xl font-bold"
              rows={1}
            />
          </div>
        );

      case 'code':
        return (
          <div key={block.id} className={`relative group mb-2 ${indentClass}`}>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <Editor
                ref={(el) => (codeBlockRefs.current[block.id] = el)}
                value={block.content}
                onValueChange={(code) => handleInputChange(block.id, code)}
                highlight={(code) => highlight(code, languages.python, 'python')}
                padding={12}
                style={{
                  fontFamily: '"Fira code", "Fira Mono", monospace',
                  fontSize: 14,
                  backgroundColor: '#2d3748',
                  color: '#e2e8f0',
                  minHeight: '60px'
                }}
                placeholder={block.placeholder}
                onFocus={() => setActiveBlock(block.id)}
              />
            </div>
          </div>
        );

      case 'bullet':
        return (
          <div key={block.id} className={`relative group mb-2 ${indentClass} flex items-start`}>
            <span className="text-gray-500 mr-2 mt-3 select-none">•</span>
            <textarea
              ref={(el) => (textareaRefs.current[block.id] = el)}
              value={block.content}
              onChange={(e) => handleInputChange(block.id, e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, block.id)}
              onFocus={() => setActiveBlock(block.id)}
              placeholder={block.placeholder}
              className="flex-1 p-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={Math.max(1, Math.ceil(block.content.length / 50))}
            />
          </div>
        );

      case 'numbered':
        const blockIndex = blocks.findIndex(b => b.id === block.id);
        const numberedIndex = blocks.slice(0, blockIndex + 1).filter(b => b.type === 'numbered' && (b.level || 0) === (block.level || 0)).length;
        return (
          <div key={block.id} className={`relative group mb-2 ${indentClass} flex items-start`}>
            <span className="text-gray-500 mr-2 mt-3 select-none">{numberedIndex}.</span>
            <textarea
              ref={(el) => (textareaRefs.current[block.id] = el)}
              value={block.content}
              onChange={(e) => handleInputChange(block.id, e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, block.id)}
              onFocus={() => setActiveBlock(block.id)}
              placeholder={block.placeholder}
              className="flex-1 p-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={Math.max(1, Math.ceil(block.content.length / 50))}
            />
          </div>
        );

      case 'todo':
        return (
          <div key={block.id} className={`relative group mb-2 ${indentClass} flex items-start`}>
            <input
              type="checkbox"
              checked={block.checked || false}
              onChange={() => toggleTodoItem(block.id)}
              className="mr-2 mt-4 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <textarea
              ref={(el) => (textareaRefs.current[block.id] = el)}
              value={block.content}
              onChange={(e) => handleInputChange(block.id, e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, block.id)}
              onFocus={() => setActiveBlock(block.id)}
              placeholder={block.placeholder}
              className={`flex-1 p-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                block.checked ? 'line-through text-gray-500' : ''
              }`}
              rows={Math.max(1, Math.ceil(block.content.length / 50))}
            />
          </div>
        );

      case 'quote':
        return (
          <div key={block.id} className={`relative group mb-2 ${indentClass}`}>
            <div className="border-l-4 border-gray-300 pl-4">
              <textarea
                ref={(el) => (textareaRefs.current[block.id] = el)}
                value={block.content}
                onChange={(e) => handleInputChange(block.id, e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, block.id)}
                onFocus={() => setActiveBlock(block.id)}
                placeholder={block.placeholder}
                className="w-full p-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent italic text-gray-600"
                rows={Math.max(1, Math.ceil(block.content.length / 50))}
              />
            </div>
          </div>
        );

      case 'divider':
        return (
          <div key={block.id} className={`relative group mb-4 ${indentClass}`}>
            <hr className="border-gray-300" />
          </div>
        );

      case 'image-with-description':
        return (
          <div key={block.id} className={`relative group mb-4 ${indentClass}`}>
            <ImageWithDescription
              src={block.src}
              alt={block.alt}
              description={block.description}
              onDescriptionChange={(description) => 
                handleMediaBlockUpdate(block.id, { description })
              }
              onImageChange={(src, alt) => 
                handleMediaBlockUpdate(block.id, { src, alt })
              }
              onRemove={() => handleMediaBlockRemove(block.id)}
            />
          </div>
        );

      case 'youtube-with-description':
        return (
          <div key={block.id} className={`relative group mb-4 ${indentClass}`}>
            <YouTubeWithDescription
              videoId={block.videoId}
              videoUrl={block.videoUrl}
              description={block.description}
              onDescriptionChange={(description) => 
                handleMediaBlockUpdate(block.id, { description })
              }
              onVideoChange={(videoId, videoUrl) => 
                handleMediaBlockUpdate(block.id, { videoId, videoUrl })
              }
              onRemove={() => handleMediaBlockRemove(block.id)}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`shared-rich-text-editor ${className}`}>
      {/* Auto-save status indicator */}
      {autoSave && (
        <div className="flex items-center justify-between mb-4 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            {isAutoSaving && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span>Saving...</span>
              </div>
            )}
            {!isAutoSaving && lastSaved && (
              <span>Last saved: {lastSaved.toLocaleTimeString()}</span>
            )}
            {!isAutoSaving && !lastSaved && isDirty && (
              <span>Unsaved changes</span>
            )}
          </div>
          <div className="text-xs">
            Ctrl+B: Bold | Ctrl+I: Italic | Ctrl+K: Link | /: Commands
          </div>
        </div>
      )}

      {/* Editor blocks */}
      <div className="space-y-2">
        {blocks.map(renderBlock)}
      </div>

      {/* Extended slash command menu */}
      <ExtendedSlashCommand
        show={showMenu.show}
        blockId={showMenu.blockId}
        x={showMenu.x}
        y={showMenu.y}
        currentContent={showMenu.blockId ? blocks.find(b => b.id === showMenu.blockId)?.content || '' : ''}
        onSelectCommand={changeBlockType}
        onClose={() => setShowMenu({ show: false, blockId: null })}
        menuRef={menuRef}
      />
    </div>
  );
};

export default SharedRichTextEditor;