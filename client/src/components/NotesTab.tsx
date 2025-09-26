import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Code, Type, Hash, List, Quote, Minus } from 'lucide-react';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs';
import 'prismjs/components/prism-python';
import 'prismjs/themes/prism-tomorrow.css';
import { Problem } from './ProblemList';
import '../notionEditor.css';

interface NotesTabProps {
  problem: Problem;
  onNotesSaved?: (problemId: number, notes: string) => void;
}

const blockTypes = [
  { type: 'text', icon: Type, label: 'Text'},
  { type: 'code', icon: Code, label: 'Code', placeholder: 'Write your code here...' },
  { type: 'heading', icon: Hash, label: 'Heading', placeholder: 'Heading' },
  { type: 'bullet', icon: List, label: 'Bullet List', placeholder: 'List item' },
  { type: 'quote', icon: Quote, label: 'Quote', placeholder: 'Quote' },
  { type: 'divider', icon: Minus, label: 'Divider', placeholder: '' }
];

type Block = {
  id: number;
  type: string;
  content: string;
  placeholder?: string;
};

const NotesTab: React.FC<NotesTabProps> = ({ problem, onNotesSaved }) => {
  const [blocks, setBlocks] = useState<Block[]>([
    { id: 1, type: 'text', content: '', placeholder: 'Type "/" for commands' }
  ]);
  const [showMenu, setShowMenu] = useState<{ show: boolean; blockId: number | null; x?: number; y?: number }>({ show: false, blockId: null });
  const [activeBlock, setActiveBlock] = useState(1);
  const [, setStatus] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const textareaRefs = useRef<{ [key: number]: HTMLTextAreaElement | null }>({});
  const codeBlockRefs = useRef<{ [key: number]: any }>({});
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuPositionRef = useRef<'top' | 'bottom'>('bottom');
  const blocksRef = useRef<Block[]>([]);

  // Load notes from problem object when problem changes
  useEffect(() => {
    if (problem.notes) {
      try {
        const parsed = JSON.parse(problem.notes);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id && parsed[0].type) {
          setBlocks(parsed);
          blocksRef.current = parsed;
          setActiveBlock(parsed[0].id);
          return;
        }
      } catch {}
    }
    const defaultBlocks = [{ id: 1, type: 'text', content: '', placeholder: 'Type "/" for commands' }];
    setBlocks(defaultBlocks);
    blocksRef.current = defaultBlocks;
    setActiveBlock(1);
  }, [problem.id, problem.notes]);

  // Save notes to backend with debouncing
  const saveNotes = useCallback(async (blocksToSave: Block[]) => {
    console.log('🔄 saveNotes called with blocks:', blocksToSave);
    setStatus('Saving...');
    try {
      const content = JSON.stringify(blocksToSave);
      console.log('📤 Sending request to save notes:', content);
      const response = await fetch(`/api/problems/${problem.id}/notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: content
        })
      });
      console.log('📥 Response status:', response.status);
      if (response.ok) {
        setStatus('Saved!');
        setTimeout(() => setStatus(''), 1200);
        problem.notes = content;
        onNotesSaved?.(problem.id, content);
        console.log('✅ Notes saved successfully');
      } else {
        setStatus('Failed to save');
        setTimeout(() => setStatus(''), 3000);
        const errorText = await response.text();
        console.error('❌ Save failed:', response.status, errorText);
      }
    } catch (error) {
      setStatus('Failed to save');
      setTimeout(() => setStatus(''), 3000);
      console.error('❌ Save error:', error);
    }
  }, [problem.id, problem.solved, problem.solution, onNotesSaved]);

  // Store the latest saveNotes function in a ref
  const saveNotesRef = useRef(saveNotes);
  saveNotesRef.current = saveNotes;
  
  // Debounced save function using useRef to prevent recreation
  const debouncedSaveRef = useRef<(() => void) | null>(null);
  
  // Create the debounced function only once
  if (!debouncedSaveRef.current) {
    let timeoutId: NodeJS.Timeout;
    debouncedSaveRef.current = () => {
      console.log('⏰ debouncedSave called');
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        console.log('⏰ Debounce timeout reached, calling saveNotes with latest blocks');
        // Always use the latest blocks from the ref
        saveNotesRef.current(blocksRef.current);
      }, 500); // 500ms debounce
    };
  }
  
  const debouncedSave = debouncedSaveRef.current;

  // Save on blocks change with debouncing - removed to prevent infinite loops
  // The save will be triggered by individual input changes instead

  const addNewBlock = (afterBlockId: number, type = 'text') => {
    const newBlockId = Math.max(...blocks.map(b => b.id)) + 1;
    const newBlock: Block = {
      id: newBlockId,
      type: type,
      content: '',
      placeholder: blockTypes.find(t => t.type === type)?.placeholder || ''
    };
    const currentIndex = blocks.findIndex(b => b.id === afterBlockId);
    const newBlocks = [...blocks];
    newBlocks.splice(currentIndex + 1, 0, newBlock);
    setBlocks(prevBlocks => {
      blocksRef.current = newBlocks;
      // Trigger debounced save (will use latest blocks from ref)
      debouncedSave();
      return newBlocks;
    });
    setActiveBlock(newBlockId);
    setTimeout(() => {
      const textarea = textareaRefs.current[newBlockId];
      if (textarea) textarea.focus();
    }, 0);
  };

  const moveBlockDown = (blockId: number) => {
    const currentIndex = blocks.findIndex(b => b.id === blockId);
    if (currentIndex === -1) return;
    
    // Create a new empty text block to insert above the current block
    const newBlockId = Math.max(...blocks.map(b => b.id)) + 1;
    const newBlock: Block = {
      id: newBlockId,
      type: 'text',
      content: '',
      placeholder: blockTypes.find(t => t.type === 'text')?.placeholder || ''
    };
    
    // Insert the new block at the current position, pushing the current block down
    const newBlocks = [...blocks];
    newBlocks.splice(currentIndex, 0, newBlock);
    
    setBlocks(prevBlocks => {
      blocksRef.current = newBlocks;
      // Trigger debounced save (will use latest blocks from ref)
      debouncedSave();
      return newBlocks;
    });
    
    // Focus the original block (which is now below)
    setActiveBlock(blockId);
    setTimeout(() => {
      const textarea = textareaRefs.current[blockId];
      if (textarea) {
        textarea.focus();
        // Ensure cursor is at the start of the original block
        textarea.setSelectionRange(0, 0);
      }
    }, 0);
  };

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>, blockId: number) => {
    const clipboardData = e.clipboardData;
    const htmlData = clipboardData.getData('text/html');
    const textData = clipboardData.getData('text/plain');
    
    // Only handle multi-line content or HTML content
    if (htmlData || (textData && textData.includes('\n'))) {
      e.preventDefault();
      
      if (htmlData) {
        // Parse HTML content and convert to blocks
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlData, 'text/html');
        const parsedBlocks = parseHtmlToBlocks(doc.body);
        
        if (parsedBlocks.length > 0) {
          const currentIndex = blocks.findIndex(b => b.id === blockId);
          if (currentIndex !== -1) {
            const newBlocks = [...blocks];
            
            // Replace current block with first parsed block
            newBlocks[currentIndex] = parsedBlocks[0];
            
            // Add remaining blocks after current one
            for (let i = 1; i < parsedBlocks.length; i++) {
              newBlocks.splice(currentIndex + i, 0, parsedBlocks[i]);
            }
            
            setBlocks(prevBlocks => {
              blocksRef.current = newBlocks;
              debouncedSave();
              return newBlocks;
            });
            
            // Focus the last added block
            const lastBlock = parsedBlocks[parsedBlocks.length - 1];
            setActiveBlock(lastBlock.id);
            setTimeout(() => {
              const textarea = textareaRefs.current[lastBlock.id];
              if (textarea) {
                textarea.focus();
                textarea.setSelectionRange(lastBlock.content.length, lastBlock.content.length);
              }
            }, 0);
          }
        }
      } else if (textData && textData.includes('\n')) {
        // Handle plain text with multiple lines
        const lines = textData.split('\n').filter(line => line.trim() !== '');
        if (lines.length > 1) {
          const currentIndex = blocks.findIndex(b => b.id === blockId);
          if (currentIndex !== -1) {
            const newBlocks = [...blocks];
            
            // Replace current block with first line
            newBlocks[currentIndex] = {
              ...newBlocks[currentIndex],
              content: lines[0]
            };
            
            // Add remaining lines as new blocks
            for (let i = 1; i < lines.length; i++) {
              const newBlockId = Math.max(...blocks.map(b => b.id)) + i;
              newBlocks.splice(currentIndex + i, 0, {
                id: newBlockId,
                type: 'text',
                content: lines[i],
                placeholder: 'Type something...'
              });
            }
            
            setBlocks(prevBlocks => {
              blocksRef.current = newBlocks;
              debouncedSave();
              return newBlocks;
            });
            
            // Focus the last added block
            const lastBlockId = newBlocks[currentIndex + lines.length - 1].id;
            setActiveBlock(lastBlockId);
            setTimeout(() => {
              const textarea = textareaRefs.current[lastBlockId];
              if (textarea) {
                textarea.focus();
                textarea.setSelectionRange(lines[lines.length - 1].length, lines[lines.length - 1].length);
              }
            }, 0);
          }
        }
      }
    }
    // For single-line text, let the default paste behavior handle it
  }, [blocks, debouncedSave]);

  const parseHtmlToBlocks = (element: HTMLElement): Block[] => {
    const parsedBlocks: Block[] = [];
    let blockId = Math.max(...blocks.map(b => b.id)) + 1;
    
    const processElement = (el: HTMLElement) => {
      if (el.nodeType === Node.ELEMENT_NODE) {
        const tagName = el.tagName.toLowerCase();
        
        // Handle specific elements first
        switch (tagName) {
          case 'h1':
          case 'h2':
          case 'h3':
          case 'h4':
          case 'h5':
          case 'h6': {
            const textContent = el.textContent?.trim() || '';
            if (textContent) {
              parsedBlocks.push({
                id: blockId++,
                type: 'heading',
                content: textContent,
                placeholder: 'Type something...'
              });
            }
            return; // Don't process children of headings
          }
          case 'ul':
          case 'ol': {
            // Handle lists - create bullet blocks for each li
            const listItems = el.querySelectorAll('li');
            listItems.forEach(li => {
              const textContent = li.textContent?.trim() || '';
              if (textContent) {
                parsedBlocks.push({
                  id: blockId++,
                  type: 'bullet',
                  content: textContent,
                  placeholder: 'Type something...'
                });
              }
            });
            return; // Don't process children of lists
          }
          case 'blockquote': {
            const textContent = el.textContent?.trim() || '';
            if (textContent) {
              parsedBlocks.push({
                id: blockId++,
                type: 'quote',
                content: textContent,
                placeholder: 'Type something...'
              });
            }
            return; // Don't process children of blockquotes
          }
          case 'pre':
          case 'code': {
            const textContent = el.textContent?.trim() || '';
            if (textContent) {
              parsedBlocks.push({
                id: blockId++,
                type: 'code',
                content: textContent,
                placeholder: 'Type something...'
              });
            }
            return; // Don't process children of code blocks
          }
          case 'p': {
            // Only process paragraphs that are not inside list items
            if (el.parentElement?.tagName.toLowerCase() !== 'li') {
              const textContent = el.textContent?.trim() || '';
              if (textContent) {
                parsedBlocks.push({
                  id: blockId++,
                  type: 'text',
                  content: textContent,
                  placeholder: 'Type something...'
                });
              }
            }
            return; // Don't process children of paragraphs
          }
          case 'div': {
            // Process div children but don't create a block for the div itself
            Array.from(el.children).forEach(child => {
              processElement(child as HTMLElement);
            });
            return;
          }
          default: {
            // For other elements, process their children
            Array.from(el.children).forEach(child => {
              processElement(child as HTMLElement);
            });
            return;
          }
        }
      }
    };
    
    processElement(element);
    return parsedBlocks;
  };

  const handleInputChange = useCallback((blockId: number, value: string) => {
    console.log('⌨️ handleInputChange called:', { blockId, value });
    
    // Handle slash commands
    if (value.startsWith('/')) {
      const textarea = textareaRefs.current[blockId];
      if (textarea) {
        const rect = textarea.getBoundingClientRect();
        // Find the specific block container (div with class "relative group mb-2")
        const blockContainer = textarea.closest('.relative.group.mb-2');
        const containerRect = blockContainer?.getBoundingClientRect();
        
        if (containerRect) {
          // Position relative to the specific block container
          let relativeX = rect.left - containerRect.left;
          // Calculate cursor position within the textarea
          const cursorPosition = textarea.selectionStart || 0;
          const textBeforeCursor = textarea.value.substring(0, cursorPosition);
          const lines = textBeforeCursor.split('\n');
          const currentLine = lines.length - 1;
          const lineHeight = 24; // Approximate line height
          let relativeY = rect.top - containerRect.top + (currentLine * lineHeight) + lineHeight + 5; // Position at cursor line
          
          // Ensure menu stays within the notes editor bounds
          const menuWidth = 256; // w-64 = 16rem = 256px
          const menuHeight = 200; // Approximate height
          
          // Adjust X position if menu would go outside right edge
          if (relativeX + menuWidth > containerRect.width) {
            relativeX = containerRect.width - menuWidth - 10; // 10px margin
          }
          
          // Adjust Y position if menu would go outside bottom edge
          if (relativeY + menuHeight > containerRect.height) {
            relativeY = rect.top - containerRect.top - menuHeight - 10; // Position above
          }
          
          // Ensure menu doesn't go outside left edge
          if (relativeX < 0) {
            relativeX = 10; // 10px margin from left
          }
          
          setShowMenu({ show: true, blockId, x: relativeX, y: relativeY });
        } else {
          // Fallback to original positioning
        setShowMenu({ show: true, blockId, x: rect.left, y: rect.bottom + window.scrollY });
        }
      }
      
      // Handle specific slash commands
    if (value === '/code') {
      setTimeout(() => {
        changeBlockType(blockId, 'code');
      }, 100);
      return;
    }
      if (value === '/heading') {
        setTimeout(() => {
          changeBlockType(blockId, 'heading');
        }, 100);
        return;
      }
      if (value === '/bullet') {
        setTimeout(() => {
          changeBlockType(blockId, 'bullet');
        }, 100);
        return;
      }
      if (value === '/quote') {
        setTimeout(() => {
          changeBlockType(blockId, 'quote');
        }, 100);
        return;
      }
      if (value === '/divider') {
        setTimeout(() => {
          changeBlockType(blockId, 'divider');
        }, 100);
        return;
      }
    } else {
      // Hide menu if not typing slash commands
      if (showMenu.show && showMenu.blockId === blockId) {
      setShowMenu({ show: false, blockId: null });
      }
    }
    
    // Update blocks immediately and trigger debounced save
    setBlocks(prevBlocks => {
      const newBlocks = prevBlocks.map(block => block.id === blockId ? { ...block, content: value } : block);
      console.log('📝 Updated blocks:', newBlocks);
      // Store the latest blocks in a ref
      blocksRef.current = newBlocks;
      // Trigger debounced save (will use latest blocks from ref)
      debouncedSave();
      return newBlocks;
    });
  }, [showMenu.show, showMenu.blockId]);

  const changeBlockType = useCallback((blockId: number, newType: string) => {
    let cleanContent = '';
    setBlocks(prevBlocks => {
      const currentBlock = prevBlocks.find(b => b.id === blockId);
      if (!currentBlock) return prevBlocks;
      cleanContent = newType === 'divider' ? '' : currentBlock.content.replace(/^\/\w*/, '').trim();
      const newBlocks = prevBlocks.map(block =>
      block.id === blockId ? {
        ...block,
        type: newType,
        content: cleanContent,
        placeholder: blockTypes.find(t => t.type === newType)?.placeholder || ''
      } : block
    );
      blocksRef.current = newBlocks;
      // Trigger debounced save (will use latest blocks from ref)
      debouncedSave();
      return newBlocks;
    });
    setShowMenu({ show: false, blockId: null });
    setTimeout(() => {
      if (newType !== 'divider') {
        const textarea = textareaRefs.current[blockId];
        if (textarea) {
          textarea.focus();
          textarea.setSelectionRange(cleanContent.length, cleanContent.length);
        }
      }
    }, 150);
  }, []);

  const selectAllContent = useCallback(() => {
    // Get the currently active textarea
    const activeTextarea = textareaRefs.current[activeBlock];
    
    if (activeTextarea && activeTextarea.value.trim() !== '') {
      // If active block has content, select all content in that block
      activeTextarea.focus();
      activeTextarea.setSelectionRange(0, activeTextarea.value.length);
      console.log('📋 Selected all content in active block:', activeBlock);
    } else {
      // If active block is empty, select all content across all blocks
      const allTextareas = Object.values(textareaRefs.current).filter(Boolean) as HTMLTextAreaElement[];
      
      if (allTextareas.length > 0) {
        // Select all content in all blocks simultaneously
        allTextareas.forEach((textarea, index) => {
          if (textarea.value.trim() !== '') {
            // Select all content in this textarea
            textarea.setSelectionRange(0, textarea.value.length);
            console.log(`📋 Selected content in block ${index + 1}:`, textarea.value.substring(0, 50) + '...');
          }
        });
        
        // Focus the first non-empty block
        const firstNonEmpty = allTextareas.find(textarea => textarea.value.trim() !== '');
        if (firstNonEmpty) {
          firstNonEmpty.focus();
          console.log('📋 Focused first non-empty block after selecting all content');
        } else {
          // If all blocks are empty, focus the first block
          allTextareas[0].focus();
          console.log('📋 All blocks are empty, focused first block');
        }
      }
    }
  }, [activeBlock]);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, blockId: number) => {
    if (e.key === 'Escape' && showMenu.show) {
      setShowMenu({ show: false, blockId: null });
      return;
    }
    if (e.key === '/') {
      menuPositionRef.current = 'bottom';
      const textarea = textareaRefs.current[blockId];
      if (textarea) {
        const rect = textarea.getBoundingClientRect();
        // Find the specific block container (div with class "relative group mb-2")
        const blockContainer = textarea.closest('.relative.group.mb-2');
        const containerRect = blockContainer?.getBoundingClientRect();
        
        if (containerRect) {
          // Position relative to the specific block container
          let relativeX = rect.left - containerRect.left;
          // Calculate cursor position within the textarea
          const cursorPosition = textarea.selectionStart || 0;
          const textBeforeCursor = textarea.value.substring(0, cursorPosition);
          const lines = textBeforeCursor.split('\n');
          const currentLine = lines.length - 1;
          const lineHeight = 24; // Approximate line height
          let relativeY = rect.top - containerRect.top + (currentLine * lineHeight) + lineHeight + 5; // Position at cursor line
          
          // Ensure menu stays within the notes editor bounds
          const menuWidth = 256; // w-64 = 16rem = 256px
          const menuHeight = 200; // Approximate height
          
          // Adjust X position if menu would go outside right edge
          if (relativeX + menuWidth > containerRect.width) {
            relativeX = containerRect.width - menuWidth - 10; // 10px margin
          }
          
          // Adjust Y position if menu would go outside bottom edge
          if (relativeY + menuHeight > containerRect.height) {
            relativeY = rect.top - containerRect.top - menuHeight - 10; // Position above
          }
          
          // Ensure menu doesn't go outside left edge
          if (relativeX < 0) {
            relativeX = 10; // 10px margin from left
          }
          
          setShowMenu({ show: true, blockId, x: relativeX, y: relativeY });
        } else {
          // Fallback to original positioning
          setShowMenu({ show: true, blockId });
        }
      } else {
      setShowMenu({ show: true, blockId });
      }
      setTimeout(() => {
        if (textarea) {
          const pos = textarea.selectionStart || 0;
          textarea.focus();
          textarea.setSelectionRange(pos, pos);
        }
      }, 0);
    } else if (e.key === 'Enter' && !showMenu.show) {
      e.preventDefault();
      const textarea = e.target as HTMLTextAreaElement;
      const cursorPosition = textarea.selectionStart || 0;
      const currentBlock = blocks.find(b => b.id === blockId);
      
      // If cursor is at the start of the block, move current block down and create new block above
      if (cursorPosition === 0) {
        moveBlockDown(blockId);
      } else if (currentBlock?.type === 'bullet') {
        // If it's a bullet block, create a new bullet block below
        addNewBlock(blockId, 'bullet');
      } else {
        // Normal behavior: add new text block after current one
      addNewBlock(blockId);
      }
    } else if (e.key === 'Enter' && showMenu.show) {
      // If menu is open and Enter is pressed, select the first option
      e.preventDefault();
      const firstOption = blockTypes[0];
      if (firstOption) {
        changeBlockType(blockId, firstOption.type);
      }
    } else if (e.key === 'ArrowDown' && showMenu.show) {
      // Handle arrow key navigation in menu (simplified)
      e.preventDefault();
    } else if (e.key === 'ArrowUp' && showMenu.show) {
      // Handle arrow key navigation in menu (simplified)
      e.preventDefault();
    } else if (e.key === 'Backspace') {
      const textarea = e.target as HTMLTextAreaElement;
      const cursorPosition = textarea.selectionStart || 0;
      const currentBlock = blocks.find(b => b.id === blockId);
      
      // If cursor is at the start of the line (position 0)
      if (cursorPosition === 0) {
        e.preventDefault();
        
        // Special case: Convert bullet block to text block
        if (currentBlock?.type === 'bullet') {
          setBlocks(prevBlocks => {
            const newBlocks = prevBlocks.map(block =>
              block.id === blockId ? { ...block, type: 'text', placeholder: 'Type something...' } : block
            );
            blocksRef.current = newBlocks;
            return newBlocks;
          });
          // Trigger debounced save
          debouncedSave();
          return;
        }
        
        // If there are multiple blocks, handle merging or deletion
        if (blocks.length > 1) {
          const currentIndex = blocks.findIndex(b => b.id === blockId);
          const prevBlock = blocks[currentIndex - 1];
          
          if (prevBlock && prevBlock.type !== 'divider') {
            // Merge current block content with previous block
            const newContent = prevBlock.content + textarea.value;
            setBlocks(prevBlocks => {
              const newBlocks = prevBlocks.map(block =>
                block.id === prevBlock.id ? { ...block, content: newContent } : block
              ).filter(block => block.id !== blockId);
              blocksRef.current = newBlocks;
              return newBlocks;
            });
            setActiveBlock(prevBlock.id);
            setTimeout(() => {
                const prevTextarea = textareaRefs.current[prevBlock.id];
                if (prevTextarea) {
                  prevTextarea.focus();
                prevTextarea.setSelectionRange(newContent.length, newContent.length);
              }
            }, 0);
            // Trigger debounced save
            debouncedSave();
          } else {
            // Delete current block if no previous block or previous is divider
            setBlocks(prevBlocks => {
              const newBlocks = prevBlocks.filter(block => block.id !== blockId);
              blocksRef.current = newBlocks;
              return newBlocks;
            });
            const nextBlock = blocks[currentIndex + 1] || blocks[currentIndex - 1];
            if (nextBlock) {
              setActiveBlock(nextBlock.id);
              setTimeout(() => {
                const textarea = textareaRefs.current[nextBlock.id];
                if (textarea) textarea.focus();
              }, 0);
            }
            // Trigger debounced save
            debouncedSave();
          }
        }
      }
    }
  };

  // Separate keydown handler for divider (div)
  const handleDividerKeyDown = (e: React.KeyboardEvent<HTMLDivElement>, blockId: number) => {
    if ((e.key === 'Backspace' || e.key === 'Delete') && blocks.length > 1) {
      setBlocks(prevBlocks => prevBlocks.filter(b => b.id !== blockId));
      const currentIndex = blocks.findIndex(b => b.id === blockId);
      const nextBlock = blocks[currentIndex + 1] || blocks[currentIndex - 1];
      if (nextBlock) {
        setActiveBlock(nextBlock.id);
        setTimeout(() => {
          const textarea = textareaRefs.current[nextBlock.id];
          if (textarea) textarea.focus();
        }, 0);
      }
    }
  };


  useEffect(() => {
    if (showMenu.show && menuRef.current) {
      const blockElement = textareaRefs.current[showMenu.blockId!]?.parentElement?.parentElement;
      if (!blockElement) return;
      const blockRect = blockElement.getBoundingClientRect();
      const menuRect = menuRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - blockRect.bottom;
      const spaceAbove = blockRect.top;
      if (spaceBelow < menuRect.height && spaceAbove > menuRect.height) {
        menuPositionRef.current = 'top';
      } else {
        menuPositionRef.current = 'bottom';
      }
      if (menuRef.current) menuRef.current.style.display = 'none';
      if (menuRef.current) void menuRef.current.offsetHeight;
      if (menuRef.current) menuRef.current.style.display = '';
    }
  }, [showMenu.show, showMenu.blockId]);

  const renderCodeBlock = (block: Block) => {
    return (
      <div key={block.id} className="relative group mb-2">
        <div className="flex items-start">
          <div className="flex-1 relative">
            <Editor
              value={block.content}
              onValueChange={(code: string) => handleInputChange(block.id, code)}
              highlight={(code: string) => {
                let highlighted = highlight(code, languages.python, 'python');
                const builtins = ['set', 'print', 'len', 'range', 'list', 'dict', 'tuple', 'str', 'int', 'float', 'bool'];
                builtins.forEach(func => {
                  const regex = new RegExp(`\\b${func}\\b(?=\\()`, 'g');
                  highlighted = highlighted.replace(regex, `<span class=\"token function\" style=\"color: #669900 !important;\">${func}</span>`);
                });
                return highlighted;
              }}
              padding={22}
              style={{
                fontFamily: '"Fira code", "Fira Mono", monospace',
                fontSize: 14,
                backgroundColor: 'rgb(247, 246, 243)',
                color: '#32302C',
                borderRadius: '0.375rem',
                minHeight: '1.5rem',
                height: 'auto',
                resize: 'none',
                outline: 'none',
                border: 'none',
                boxShadow: 'none'
              }}
              onFocus={() => setActiveBlock(block.id)}
              ref={(el) => { codeBlockRefs.current[block.id] = el; }}
              onKeyDown={e => {
                const value = (e.target as HTMLTextAreaElement).value;
                if (
                  e.key === 'Backspace' &&
                  (!value || value === '')
                ) {
                  e.preventDefault();
                  if (blocks.length === 1) {
                    // Replace with a new empty text block
                    const newId = Date.now();
                    setBlocks([{ id: newId, type: 'text', content: '', placeholder: 'Type "/" for commands' }]);
                    setActiveBlock(newId);
                  } else {
                    setBlocks(prevBlocks => prevBlocks.filter(b => b.id !== block.id));
                    // Focus previous or next block
                    const currentIndex = blocks.findIndex(b => b.id === block.id);
                    const nextBlock = blocks[currentIndex + 1] || blocks[currentIndex - 1];
                    if (nextBlock) {
                      setActiveBlock(nextBlock.id);
                      setTimeout(() => {
                        const textarea = textareaRefs.current[nextBlock.id];
                        if (textarea) textarea.focus();
                      }, 0);
                    }
                  }
                }
              }}
              placeholder={block.placeholder}
              textareaId={`editor-${block.id}`}
              preClassName="language-python"
            />
          </div>
        </div>
      </div>
    );
  };

  const renderBlock = (block: Block) => {
    const blockType = blockTypes.find(t => t.type === block.type);
    if (block.type === 'code') {
      return renderCodeBlock(block);
    }
    if (block.type === 'divider') {
      return (
        <div
          key={block.id}
          className="flex items-center my-4 outline-none"
          tabIndex={0}
          onFocus={() => setActiveBlock(block.id)}
          onKeyDown={e => handleDividerKeyDown(e, block.id)}
        >
          <div className="flex-1 h-2 border-t-2 border-gray-800"></div>
        </div>
      );
    }
    const baseClasses = "w-full resize-none border-none outline-none bg-transparent";
    const typeClasses: { [key: string]: string } = {
      text: "text-gray-800 text-base leading-6",
      code: "font-mono text-sm bg-gray-900 rounded px-3 py-2 text-green-400 border border-gray-700 whitespace-pre-wrap",
      heading: "text-2xl font-bold text-gray-900 leading-8",
      bullet: "text-gray-800 text-base leading-6 pl-6",
      quote: "text-gray-700 text-base leading-6 border-l-4 border-gray-300 pl-4 italic"
    };
    return (
      <div key={block.id} className="relative group mb-2" onClick={() => setActiveBlock(block.id)}>
        <div className="flex items-start">
          {block.type === 'bullet' && (
            <span className="absolute left-2 top-1 w-1 h-1 bg-gray-400 rounded-full"></span>
          )}
          <div className="flex-1">
            <textarea
              ref={el => { textareaRefs.current[block.id] = el; }}
              value={block.content}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange(block.id, e.target.value)}
              onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => handleKeyDown(e, block.id)}
              onFocus={() => setActiveBlock(block.id)}
              placeholder={block.placeholder}
              className={`${baseClasses} ${typeClasses[block.type]} placeholder-gray-400`}
              rows={block.type === 'heading' ? 1 : 1}
              style={{
                minHeight: block.type === 'heading' ? '30px' : '1.5rem',
                height: 'auto',
                resize: 'none'
              }}
              onInput={(e: React.FormEvent<HTMLTextAreaElement>) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = target.scrollHeight + 'px';
              }}
              onPaste={(e: React.ClipboardEvent<HTMLTextAreaElement>) => handlePaste(e, block.id)}
            />
            {showMenu.show && showMenu.blockId === block.id && (
              <div
                ref={menuRef}
                className="z-10 bg-white border border-gray-200 rounded-lg shadow-lg py-2 w-64"
                style={{
                  left: showMenu.x ? `${showMenu.x}px` : '0px',
                  top: showMenu.y ? `${showMenu.y}px` : (menuPositionRef.current === 'bottom' ? 'calc(100% + 8px)' : undefined),
                  bottom: !showMenu.y && menuPositionRef.current === 'top' ? 'calc(100% + 8px)' : undefined,
                }}
              >
                <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-100">
                  BASIC BLOCKS
                  {(() => {
                    const currentContent = blocks.find(b => b.id === showMenu.blockId)?.content || '';
                    if (currentContent.startsWith('/') && currentContent.length > 1) {
                      return ` - Filtering by "${currentContent}"`;
                    }
                    return '';
                  })()}
                </div>
                {blockTypes
                  .filter(option => {
                    const currentContent = blocks.find(b => b.id === showMenu.blockId)?.content || '';
                    if (!currentContent.startsWith('/')) return true;
                    const searchTerm = currentContent.toLowerCase().replace('/', '');
                    return option.type.toLowerCase().includes(searchTerm) || 
                           option.label.toLowerCase().includes(searchTerm);
                  })
                  .map(option => (
                  <MenuOption
                    key={option.type}
                    option={option}
                    onClick={(type: string) => changeBlockType(showMenu.blockId!, type)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const MenuOption: React.FC<{ option: typeof blockTypes[0]; onClick: (type: string) => void }> = ({ option, onClick }) => {
    const Icon = option.icon as React.ComponentType<{ className?: string }>;
    return (
      <button
        onClick={e => {
          e.preventDefault();
          e.stopPropagation();
          onClick(option.type);
        }}
        className="w-full flex items-center px-3 py-2 text-left hover:bg-gray-100 rounded transition-colors"
      >
        <Icon className="w-4 h-4 mr-3 text-gray-500" />
        <span className="text-gray-700">{option.label}</span>
      </button>
    );
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showMenu.show && menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setTimeout(() => {
          setShowMenu({ show: false, blockId: null });
        }, 0);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showMenu.show]);

  // Simple drag and drop handler
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    const textData = e.dataTransfer.getData('text/plain');
    if (textData) {
      // Add dropped text as a new block
      const newBlock: Block = {
        id: Math.max(...blocks.map(b => b.id)) + 1,
        type: 'text',
        content: textData,
        placeholder: 'Type something...'
      };
      
      setBlocks(prevBlocks => {
        const newBlocks = [...prevBlocks, newBlock];
        blocksRef.current = newBlocks;
        debouncedSave();
        return newBlocks;
      });
      
      // Focus the new block
      setActiveBlock(newBlock.id);
      setTimeout(() => {
        const textarea = textareaRefs.current[newBlock.id];
        if (textarea) {
          textarea.focus();
        }
      }, 0);
    }
  }, [blocks, debouncedSave]);

  return (
    <div 
      className={`notes-editor ${isFullscreen ? 'fixed inset-0 z-50 bg-white' : ''}`}
      style={{ 
        background: '#fff', 
        minHeight: isFullscreen ? '100vh' : 200,
        ...(isFullscreen && { padding: '20px' })
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onKeyDown={(e) => {
        // Handle Ctrl+A (Select All) globally in the notes editor
        if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          console.log('🎯 Ctrl+A pressed in notes editor');
          selectAllContent();
          return;
        }
        
        // Handle F11 for fullscreen toggle
        if (e.key === 'F11') {
          e.preventDefault();
          toggleFullscreen();
          return;
        }
        
        // Handle Escape to exit fullscreen
        if (e.key === 'Escape' && isFullscreen) {
          e.preventDefault();
          setIsFullscreen(false);
          return;
        }
        
        // Handle Backspace when cursor is not in any block
        if (e.key === 'Backspace' && document.activeElement === e.currentTarget) {
          
          const currentIndex = blocks.findIndex(b => b.id === activeBlock);
          const prevBlock = blocks[currentIndex - 1];
          
          if (prevBlock && prevBlock.type !== 'divider') {
            e.preventDefault();
            setActiveBlock(prevBlock.id);
            setTimeout(() => {
              const prevTextarea = textareaRefs.current[prevBlock.id];
              if (prevTextarea) {
                prevTextarea.focus();
                prevTextarea.setSelectionRange(prevBlock.content.length, prevBlock.content.length);
              }
            }, 0);
          }
        }
      }}
      tabIndex={0}
    >
      {/* Fullscreen Toggle Button */}
      <div className={`flex justify-end ${isFullscreen ? 'mb-4' : 'mb-2'}`}>
        <button
          onClick={toggleFullscreen}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          {isFullscreen ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Exit Fullscreen
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
              Fullscreen
            </>
          )}
        </button>
      </div>
      
      {blocks.map(renderBlock)}
      <div
        className="min-h-[100px] cursor-pointer"
        onClick={() => {
          const lastBlockId = blocks[blocks.length - 1].id;
          addNewBlock(lastBlockId, 'text');
        }}
      />
    </div>
  );
};

export default NotesTab; 