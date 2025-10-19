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
  { type: 'sub-bullet', icon: List, label: 'Sub Bullet', placeholder: 'Sub item' },
  { type: 'quote', icon: Quote, label: 'Quote', placeholder: 'Quote' },
  { type: 'divider', icon: Minus, label: 'Divider', placeholder: '' }
];

type Block = {
  id: number;
  type: string;
  content: string;
  placeholder?: string;
  level?: number; // For nested bullets: 0 = main bullet, 1 = sub-bullet, 2 = sub-sub-bullet, etc.
};

const NotesTab: React.FC<NotesTabProps> = ({ problem, onNotesSaved }) => {
  const [blocks, setBlocks] = useState<Block[]>([
    { id: 1, type: 'text', content: '', placeholder: 'Type "/" for commands' }
  ]);
  const [showMenu, setShowMenu] = useState<{ show: boolean; blockId: number | null; x?: number; y?: number }>({ show: false, blockId: null });
  const [activeBlock, setActiveBlock] = useState(1);
  const [, setStatus] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const textareaRefs = useRef<{ [key: number]: HTMLTextAreaElement | null }>({});
  const codeBlockRefs = useRef<{ [key: number]: any }>({});
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuPositionRef = useRef<'top' | 'bottom'>('bottom');
  const blocksRef = useRef<Block[]>([]);

  // Load notes from problem object when problem ID changes (not when notes content changes)
  useEffect(() => {
    console.log('📝 NotesTab: Problem changed, ID:', problem.id, 'Title:', problem.title);
    console.log('📝 NotesTab: Raw notes data:', problem.notes);
    console.log('📝 NotesTab: Notes type:', typeof problem.notes);
    
    if (problem.notes) {
      try {
        // Check if notes is already parsed (array) or needs parsing (string)
        let parsed;
        if (typeof problem.notes === 'string') {
          parsed = JSON.parse(problem.notes);
        } else if (Array.isArray(problem.notes)) {
          parsed = problem.notes;
        } else {
          console.warn('📝 NotesTab: Unexpected notes type:', typeof problem.notes);
          parsed = problem.notes;
        }
        
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id && parsed[0].type) {
          console.log('✅ NotesTab: Loading parsed notes:', parsed);
          setBlocks(parsed);
          setActiveBlock(parsed[0].id);
          return;
        } else {
          console.warn('📝 NotesTab: Parsed notes not in expected format:', parsed);
        }
      } catch (error) {
        console.error('❌ NotesTab: Error parsing notes:', error);
      }
    }
    
    console.log('📝 NotesTab: Using default blocks');
    const defaultBlocks = [{ id: 1, type: 'text', content: '', placeholder: 'Type "/" for commands' }];
    setBlocks(defaultBlocks);
    setActiveBlock(1);
  }, [problem.id]); // Only watch problem.id, not problem.notes

  // Update blocksRef whenever blocks change
  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);

  // Debounced save when blocks change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      console.log('⏰ Debounce timeout reached, calling saveNotes with latest blocks');
      saveNotesRef.current(blocks);
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [blocks]);

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
      return newBlocks;
    });
    setActiveBlock(newBlockId);
    setTimeout(() => {
      const textarea = textareaRefs.current[newBlockId];
      if (textarea) textarea.focus();
    }, 0);
  };

  const clearNotes = useCallback(async () => {
    try {
      setStatus('Clearing...');
      const response = await fetch(`/api/problems/${problem.id}/notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: JSON.stringify([{ id: 1, type: 'text', content: '', placeholder: 'Type "/" for commands' }])
        })
      });
      
      if (response.ok) {
        setStatus('Cleared!');
        setTimeout(() => setStatus(''), 1200);
        
        // Reset to default blocks
        const defaultBlocks = [{ id: 1, type: 'text', content: '', placeholder: 'Type "/" for commands' }];
        setBlocks(defaultBlocks);
        setActiveBlock(1);
        
        // Update parent component
        onNotesSaved?.(problem.id, JSON.stringify(defaultBlocks));
        console.log('✅ Notes cleared successfully');
      } else {
        setStatus('Failed to clear');
        setTimeout(() => setStatus(''), 3000);
        const errorText = await response.text();
        console.error('❌ Clear failed:', response.status, errorText);
      }
    } catch (error) {
      setStatus('Failed to clear');
      setTimeout(() => setStatus(''), 3000);
      console.error('❌ Clear error:', error);
    }
  }, [problem.id, onNotesSaved]);

  const handleClearConfirm = useCallback(() => {
    clearNotes();
    setShowClearConfirm(false);
  }, [clearNotes]);

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

  const moveBlockUp = useCallback((blockId: number) => {
    setBlocks(prevBlocks => {
      const currentIndex = prevBlocks.findIndex(b => b.id === blockId);
      if (currentIndex > 0) {
        const updated = [...prevBlocks];
        [updated[currentIndex - 1], updated[currentIndex]] = [updated[currentIndex], updated[currentIndex - 1]];
        return updated;
      }
      return prevBlocks;
    });
  }, []);

  const deleteBlock = useCallback((blockId: number) => {
    setBlocks(prevBlocks => {
      if (prevBlocks.length > 1) {
        const updated = prevBlocks.filter(block => block.id !== blockId);
        
        // Set active block to the previous one or next one
        const deletedIndex = prevBlocks.findIndex(b => b.id === blockId);
        const newActiveBlock = updated[Math.max(0, deletedIndex - 1)];
        if (newActiveBlock) {
          setActiveBlock(newActiveBlock.id);
          setTimeout(() => {
            const textarea = textareaRefs.current[newActiveBlock.id];
            if (textarea) textarea.focus();
          }, 0);
        }
        
        return updated;
      }
      return prevBlocks;
    });
  }, []);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>, blockId: number) => {
    console.log('📋 handlePaste called:', { blockId });
    const clipboardData = e.clipboardData;
    const htmlData = clipboardData.getData('text/html');
    const textData = clipboardData.getData('text/plain');
    
    console.log('📋 Clipboard data:', { htmlData: !!htmlData, textData, textLength: textData?.length });
    
    // Only handle multi-line content or HTML content
    if (htmlData || (textData && textData.includes('\n'))) {
      console.log('📋 Preventing default and handling paste');
      e.preventDefault();
      
      if (htmlData) {
        console.log('📋 Processing HTML data:', htmlData.substring(0, 100) + '...');
        // Parse HTML content and convert to blocks
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlData, 'text/html');
        const parsedBlocks = parseHtmlToBlocks(doc.body);
        
        console.log('📋 Parsed blocks from HTML:', parsedBlocks);
        
        if (parsedBlocks.length > 0) {
          setBlocks(currentBlocks => {
            console.log('📋 Current blocks before HTML paste:', currentBlocks);
            const currentIndex = currentBlocks.findIndex(b => b.id === blockId);
            console.log('📋 Current index for block', blockId, ':', currentIndex);
            
            if (currentIndex !== -1) {
              const newBlocks = [...currentBlocks];
              const currentBlock = currentBlocks[currentIndex];
              
              // Preserve the current block's type for the first parsed block
              const firstParsedBlock = {
                ...parsedBlocks[0],
                type: currentBlock.type, // Keep the current block's type
                placeholder: currentBlock.placeholder // Keep the current block's placeholder
              };
              
              // Replace current block with first parsed block (preserving type)
              newBlocks[currentIndex] = firstParsedBlock;
              
              // Add remaining blocks after current one (these can keep their default 'text' type)
              for (let i = 1; i < parsedBlocks.length; i++) {
                newBlocks.splice(currentIndex + i, 0, parsedBlocks[i]);
              }
              
              console.log('📋 New blocks after HTML paste:', newBlocks);
              
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
              
              return newBlocks;
            }
            return currentBlocks;
          });
        }
      } else if (textData && textData.includes('\n')) {
        console.log('📋 Processing multi-line text data:', textData);
        // Handle plain text with multiple lines
        const lines = textData.split('\n').filter(line => line.trim() !== '');
        console.log('📋 Split lines:', lines);
        
        if (lines.length > 1) {
          setBlocks(currentBlocks => {
            console.log('📋 Current blocks before text paste:', currentBlocks);
            const currentIndex = currentBlocks.findIndex(b => b.id === blockId);
            console.log('📋 Current index for block', blockId, ':', currentIndex);
            
            if (currentIndex !== -1) {
              const newBlocks = [...currentBlocks];
              const currentBlock = currentBlocks[currentIndex];
              
              // Replace current block with first line (preserving type and placeholder)
              newBlocks[currentIndex] = {
                ...currentBlock,
                content: lines[0]
              };
              
              // Add remaining lines as new blocks (these can keep their default 'text' type)
              for (let i = 1; i < lines.length; i++) {
                const newBlockId = Math.max(...currentBlocks.map(b => b.id)) + i;
                newBlocks.splice(currentIndex + i, 0, {
                  id: newBlockId,
                  type: 'text',
                  content: lines[i],
                  placeholder: 'Type something...'
                });
              }
              
              console.log('📋 New blocks after text paste:', newBlocks);
              
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
              
              return newBlocks;
            }
            return currentBlocks;
          });
        } else {
          console.log('📋 Single line or empty lines, not processing');
        }
      }
    } else {
      console.log('📋 Single-line text or no special handling needed, allowing default paste behavior');
    }
    // For single-line text, let the default paste behavior handle it
  }, []);


  const parseHtmlToBlocks = (element: HTMLElement): Block[] => {
    console.log('📋 parseHtmlToBlocks called with element:', element);
    console.log('📋 blocksRef.current:', blocksRef.current);
    const parsedBlocks: Block[] = [];
    let blockId = Math.max(...blocksRef.current.map(b => b.id)) + 1;
    console.log('📋 Starting blockId:', blockId);
    
    const processElement = (el: HTMLElement | Node) => {
      if (el.nodeType === Node.ELEMENT_NODE) {
        const tagName = (el as HTMLElement).tagName.toLowerCase();
        
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
            const listItems = (el as HTMLElement).querySelectorAll('li');
            listItems.forEach((li: Element) => {
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
            Array.from((el as HTMLElement).children).forEach(child => {
              processElement(child as HTMLElement);
            });
            return;
          }
          case 'body': {
            // For body element, process all child nodes (including text nodes)
            Array.from(el.childNodes).forEach(child => {
              processElement(child);
            });
            return;
          }
          default: {
            // For other elements, process their children
            Array.from((el as HTMLElement).children).forEach(child => {
              processElement(child as HTMLElement);
            });
            return;
          }
        }
      } else if (el.nodeType === Node.TEXT_NODE) {
        // Handle text nodes
        const textContent = el.textContent?.trim();
        if (textContent) {
          console.log('📋 Processing text node:', textContent);
          parsedBlocks.push({
            id: blockId++,
            type: 'text',
            content: textContent,
            placeholder: 'Type something...'
          });
        }
      }
    };
    
    processElement(element);
    console.log('📋 parseHtmlToBlocks returning:', parsedBlocks);
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
      if (value === '/sub-bullet') {
        setTimeout(() => {
          changeBlockType(blockId, 'sub-bullet');
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
    
    // Update blocks immediately using functional update
    setBlocks(prevBlocks => {
      const newBlocks = prevBlocks.map(block => 
        block.id === blockId ? { ...block, content: value } : block
      );
      console.log('📝 Updated blocks:', newBlocks);
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
        // If it's a bullet block, create a new bullet block at the same level
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
    } else if (e.key === 'Tab') {
      const currentBlock = blocks.find(b => b.id === blockId);
      if (currentBlock?.type === 'bullet') {
        e.preventDefault();
        console.log('🔧 Tab pressed on bullet block:', currentBlock, 'Current level:', currentBlock.level || 0);
        // Increase nesting level
        setBlocks(prevBlocks => {
          const newBlocks = prevBlocks.map(block =>
            block.id === blockId ? { ...block, level: (block.level || 0) + 1 } : block
          );
          console.log('🔧 Updated blocks with new level:', newBlocks.find(b => b.id === blockId));
          return newBlocks;
        });
      }
    } else if (e.key === 'Tab' && e.shiftKey) {
      const currentBlock = blocks.find(b => b.id === blockId);
      if (currentBlock?.type === 'bullet' && (currentBlock.level || 0) > 0) {
        e.preventDefault();
        // Decrease nesting level
        setBlocks(prevBlocks => {
          const newBlocks = prevBlocks.map(block =>
            block.id === blockId ? { ...block, level: Math.max(0, (block.level || 0) - 1) } : block
          );
          return newBlocks;
        });
      }
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
              block.id === blockId ? { ...block, type: 'text', placeholder: 'Type something...', level: undefined } : block
            );
            return newBlocks;
          });
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
          } else {
            // Delete current block if no previous block or previous is divider
            setBlocks(prevBlocks => {
              const newBlocks = prevBlocks.filter(block => block.id !== blockId);
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

  // Auto-resize textareas when blocks change
  useEffect(() => {
    Object.values(textareaRefs.current).forEach(textarea => {
      if (textarea) {
        textarea.style.height = 'auto';
        // Find the block type to determine min height
        const blockId = Object.keys(textareaRefs.current).find(id => 
          textareaRefs.current[parseInt(id)] === textarea
        );
        const block = blocks.find(b => b.id === parseInt(blockId || '0'));
        const minHeight = block?.type === 'heading' ? 30 : 24;
        textarea.style.height = `${Math.max(textarea.scrollHeight, minHeight)}px`;
      }
    });
  }, [blocks]);

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
    const getBulletClasses = (block: Block) => {
      return "text-gray-800 text-base leading-6";
    };

    const getBulletStyle = (block: Block) => {
      if (block.type === 'bullet') {
        const level = block.level || 0;
        const paddingLeft = 24 + (level * 24); // 24px base + 24px per level
        console.log('🔧 Bullet style for block:', block.id, 'level:', level, 'paddingLeft:', paddingLeft);
        return { paddingLeft: `${paddingLeft}px` };
      }
      return {};
    };

    const typeClasses: { [key: string]: string } = {
      text: "text-gray-800 text-base leading-6",
      code: "font-mono text-sm bg-gray-900 rounded px-3 py-2 text-green-400 border border-gray-700 whitespace-pre-wrap",
      heading: "text-2xl font-bold text-gray-900 leading-8",
      bullet: "text-gray-800 text-base leading-6",
      'sub-bullet': "text-gray-800 text-base leading-6",
      quote: "text-gray-700 text-base leading-6 border-l-4 border-gray-300 pl-4 italic"
    };
    return (
      <div key={block.id} className="relative group mb-2" onClick={() => setActiveBlock(block.id)}>
        <div className="flex items-start">
          {block.type === 'bullet' && (
            <span 
              className="absolute top-2 w-1.5 h-1.5 bg-gray-800 rounded-full"
              style={{ left: `${8 + ((block.level || 0) * 24)}px` }}
              title={`Level ${block.level || 0}`}
            ></span>
          )}
          <div className="flex-1">
            <textarea
              ref={el => { textareaRefs.current[block.id] = el; }}
              value={block.content}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange(block.id, e.target.value)}
              onFocus={() => setActiveBlock(block.id)}
              placeholder={block.placeholder}
              className={`${baseClasses} ${block.type === 'bullet' ? getBulletClasses(block) : typeClasses[block.type]} placeholder-gray-400`}
              data-block-id={block.id}
              rows={1}
              style={{
                minHeight: block.type === 'heading' ? '30px' : '24px',
                height: 'auto',
                resize: 'none',
                overflow: 'hidden',
                ...getBulletStyle(block)
              }}
              onInput={(e: React.FormEvent<HTMLTextAreaElement>) => {
                const target = e.target as HTMLTextAreaElement;
                // Reset height to auto to get the correct scrollHeight
                target.style.height = 'auto';
                // Set height to scrollHeight to fit content, with a minimum height
                const minHeight = block.type === 'heading' ? 30 : 24;
                target.style.height = `${Math.max(target.scrollHeight, minHeight)}px`;
              }}
              onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                handleKeyDown(e, block.id);
                // Also handle auto-resize on key events
                const target = e.target as HTMLTextAreaElement;
                setTimeout(() => {
                  target.style.height = 'auto';
                  const minHeight = block.type === 'heading' ? 30 : 24;
                  target.style.height = `${Math.max(target.scrollHeight, minHeight)}px`;
                }, 0);
              }}
              onPaste={(e: React.ClipboardEvent<HTMLTextAreaElement>) => {
                console.log('📋 onPaste event triggered for block:', block.id);
                handlePaste(e, block.id);
              }}
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
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
            <button
              onClick={() => moveBlockUp(block.id)}
              className="p-1 hover:bg-gray-100 rounded"
              title="Move up"
            >
              ↑
            </button>
            <button
              onClick={() => moveBlockDown(block.id)}
              className="p-1 hover:bg-gray-100 rounded"
              title="Move down"
            >
              ↓
            </button>
            <button
              onClick={() => deleteBlock(block.id)}
              className="p-1 hover:bg-gray-100 rounded text-red-500"
              title="Delete"
            >
              ×
            </button>
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
  }, [blocks]);

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
        
        // Handle Tab key for bullet nesting
        if (e.key === 'Tab') {
          const activeElement = document.activeElement as HTMLTextAreaElement;
          if (activeElement && activeElement.tagName === 'TEXTAREA') {
            const blockId = parseInt(activeElement.getAttribute('data-block-id') || '0');
            const currentBlock = blocks.find(b => b.id === blockId);
            if (currentBlock?.type === 'bullet') {
              e.preventDefault();
              console.log('🔧 Global Tab pressed on bullet block:', currentBlock, 'Current level:', currentBlock.level || 0);
              // Increase nesting level
              setBlocks(prevBlocks => {
                const newBlocks = prevBlocks.map(block =>
                  block.id === blockId ? { ...block, level: (block.level || 0) + 1 } : block
                );
                console.log('🔧 Global updated blocks with new level:', newBlocks.find(b => b.id === blockId));
                return newBlocks;
              });
            }
          }
          return;
        }
        
        // Handle Shift+Tab key for bullet un-nesting
        if (e.key === 'Tab' && e.shiftKey) {
          const activeElement = document.activeElement as HTMLTextAreaElement;
          if (activeElement && activeElement.tagName === 'TEXTAREA') {
            const blockId = parseInt(activeElement.getAttribute('data-block-id') || '0');
            const currentBlock = blocks.find(b => b.id === blockId);
            if (currentBlock?.type === 'bullet' && (currentBlock.level || 0) > 0) {
              e.preventDefault();
              console.log('🔧 Global Shift+Tab pressed on bullet block:', currentBlock, 'Current level:', currentBlock.level || 0);
              // Decrease nesting level
              setBlocks(prevBlocks => {
                const newBlocks = prevBlocks.map(block =>
                  block.id === blockId ? { ...block, level: Math.max(0, (block.level || 0) - 1) } : block
                );
                console.log('🔧 Global updated blocks with decreased level:', newBlocks.find(b => b.id === blockId));
                return newBlocks;
              });
            }
          }
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
      {/* Action Buttons */}
      <div className={`flex justify-end gap-2 ${isFullscreen ? 'mb-4' : 'mb-2'}`}>
        <button
          onClick={() => setShowClearConfirm(true)}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
          title="Clear all notes"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Clear Notes
        </button>
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

      {/* Clear Confirmation Dialog */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">Clear Notes</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Are you sure you want to clear all notes for this problem? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClearConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Clear Notes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotesTab; 