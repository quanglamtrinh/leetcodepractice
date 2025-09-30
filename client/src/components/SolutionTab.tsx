import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Code, Type, Hash, List, Quote, Minus } from 'lucide-react';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs';
import 'prismjs/components/prism-python';
import 'prismjs/themes/prism-tomorrow.css';
import { Problem } from './ProblemList';
import '../notionEditor.css';

interface SolutionTabProps {
  problem: Problem;
  onSolutionSaved?: (problemId: number, solution: string) => void;
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

const SolutionTab: React.FC<SolutionTabProps> = ({ problem, onSolutionSaved }) => {
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

  // Load solution from problem object when problem changes
  useEffect(() => {
    if (problem.solution) {
      try {
        const parsed = JSON.parse(problem.solution);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id && parsed[0].type) {
          setBlocks(parsed);
          setActiveBlock(parsed[0].id);
    } else {
          // If it's not a valid block structure, treat as plain text
          setBlocks([{ id: 1, type: 'text', content: problem.solution, placeholder: 'Type "/" for commands' }]);
          setActiveBlock(1);
        }
      } catch (error) {
        // If parsing fails, treat as plain text
        setBlocks([{ id: 1, type: 'text', content: problem.solution, placeholder: 'Type "/" for commands' }]);
        setActiveBlock(1);
      }
      } else {
      // Default empty state
      setBlocks([{ id: 1, type: 'text', content: '', placeholder: 'Type "/" for commands' }]);
      setActiveBlock(1);
    }
  }, [problem.id, problem.solution]);

  // Update blocksRef whenever blocks change
  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);

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

  // Debounced save function
  const saveSolutionRef = useRef<((blocks: Block[]) => void) | null>(null);
  const debouncedSaveRef = useRef<(() => void) | null>(null);

  const saveSolution = useCallback(async (blocks: Block[]) => {
    setStatus('Saving...');
    try {
      const response = await fetch(`/api/problems/${problem.id}/solution`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          solution: JSON.stringify(blocks)
        })
      });

      if (response.ok) {
        setStatus('Saved!');
        setTimeout(() => setStatus(''), 1200);
        onSolutionSaved?.(problem.id, JSON.stringify(blocks));
      } else {
        setStatus('Failed to save');
        setTimeout(() => setStatus(''), 2000);
      }
    } catch (error) {
      console.error('Error saving solution:', error);
      setStatus('Failed to save');
      setTimeout(() => setStatus(''), 2000);
    }
  }, [problem.id, onSolutionSaved]);

  // Initialize debounced save
  useEffect(() => {
    saveSolutionRef.current = saveSolution;
    
    debouncedSaveRef.current = () => {
      setTimeout(() => {
        if (saveSolutionRef.current && blocksRef.current) {
          saveSolutionRef.current(blocksRef.current);
        }
      }, 500);
    };

    return () => {
      if (debouncedSaveRef.current) {
        clearTimeout(debouncedSaveRef.current as any);
      }
    };
  }, [saveSolution]);

  const handleInputChange = useCallback((blockId: number, value: string) => {
    console.log('⌨️ handleInputChange called:', { blockId, value });
    
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
        } else {
          setShowMenu({ show: true, blockId, x: rect.left, y: rect.bottom + window.scrollY });
        }
      }
      
      // Handle specific slash commands with immediate execution
      const commandMap: { [key: string]: string } = {
        '/code': 'code',
        '/heading': 'heading',
        '/bullet': 'bullet',
        '/quote': 'quote',
        '/divider': 'divider'
      };
      
      if (commandMap[value]) {
        // Use startTransition to avoid blocking input
        React.startTransition(() => {
          changeBlockType(blockId, commandMap[value]);
        });
        return;
      }
    } else {
      // Hide menu if not typing slash commands - use functional update to avoid stale state
      setShowMenu(prev => prev.show && prev.blockId === blockId 
        ? { show: false, blockId: null } 
        : prev
      );
    }
    
    // Update blocks using functional update to avoid stale closure
    setBlocks(prevBlocks => {
      const newBlocks = prevBlocks.map(block => 
        block.id === blockId ? { ...block, content: value } : block
      );
      console.log('📝 Updated blocks:', newBlocks);
      
      // Update the ref immediately with the new blocks
      blocksRef.current = newBlocks;
      
      // Trigger debounced save
      if (debouncedSaveRef.current) {
        debouncedSaveRef.current();
      }
      
      return newBlocks;
    });
  }, []); // Remove dependencies to avoid stale closures

  const handleKeyDown = useCallback((e: React.KeyboardEvent, blockId: number) => {
    if (e.key === 'Escape' && showMenu.show) {
      setShowMenu({ show: false, blockId: null });
      return;
    }
    
    if (e.key === '/') {
      menuPositionRef.current = 'bottom';
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
        } else {
          setShowMenu({ show: true, blockId });
        }
      } else {
        setShowMenu({ show: true, blockId });
      }
    } else if (e.key === 'Enter' && !showMenu.show) {
      e.preventDefault();
      const textarea = e.target as HTMLTextAreaElement;
      const cursorPosition = textarea.selectionStart || 0;
      
      // Use functional update to get current blocks
      setBlocks(currentBlocks => {
        const currentBlock = currentBlocks.find(b => b.id === blockId);
        
        if (cursorPosition === 0) {
          moveBlockDown(blockId);
        } else if (currentBlock?.type === 'bullet') {
          addNewBlock(blockId, 'bullet');
        } else {
          addNewBlock(blockId);
        }
        
        return currentBlocks; // Return unchanged since other functions handle the update
      });
    } else if (e.key === 'Enter' && showMenu.show) {
      e.preventDefault();
      const firstOption = blockTypes[0];
      if (firstOption) {
        changeBlockType(blockId, firstOption.type);
      }
    } else if (e.key === 'ArrowDown' && showMenu.show) {
      e.preventDefault();
    } else if (e.key === 'ArrowUp' && showMenu.show) {
      e.preventDefault();
    } else if (e.key === 'Backspace') {
      const textarea = e.target as HTMLTextAreaElement;
      const cursorPosition = textarea.selectionStart || 0;
      
      if (cursorPosition === 0) {
        e.preventDefault();
        
        // Use functional update to access current state
        setBlocks(currentBlocks => {
          const currentBlock = currentBlocks.find(b => b.id === blockId);
          
          if (currentBlock?.type === 'bullet') {
            const newBlocks = currentBlocks.map(block =>
              block.id === blockId ? { ...block, type: 'text', placeholder: 'Type something...' } : block
            );
            blocksRef.current = newBlocks;
            if (debouncedSaveRef.current) {
              debouncedSaveRef.current();
            }
            return newBlocks;
          }
          
          if (currentBlocks.length > 1) {
            const currentIndex = currentBlocks.findIndex(b => b.id === blockId);
            const prevBlock = currentBlocks[currentIndex - 1];
            
            if (prevBlock && prevBlock.type !== 'divider') {
              const newContent = prevBlock.content + textarea.value;
              const newBlocks = currentBlocks.map(block =>
                block.id === prevBlock.id ? { ...block, content: newContent } : block
              ).filter(block => block.id !== blockId);
              
              blocksRef.current = newBlocks;
              if (debouncedSaveRef.current) {
                debouncedSaveRef.current();
              }
              
              setActiveBlock(prevBlock.id);
              setTimeout(() => {
                const prevTextarea = textareaRefs.current[prevBlock.id];
                if (prevTextarea) {
                  prevTextarea.focus();
                  prevTextarea.setSelectionRange(newContent.length, newContent.length);
                }
              }, 0);
              
              return newBlocks;
            } else {
              const newBlocks = currentBlocks.filter(block => block.id !== blockId);
              blocksRef.current = newBlocks;
              if (debouncedSaveRef.current) {
                debouncedSaveRef.current();
              }
              
              const nextBlock = currentBlocks[currentIndex + 1] || currentBlocks[currentIndex - 1];
              if (nextBlock) {
                setActiveBlock(nextBlock.id);
                setTimeout(() => {
                  const textarea = textareaRefs.current[nextBlock.id];
                  if (textarea) textarea.focus();
                }, 0);
              }
              
              return newBlocks;
            }
          }
          
          return currentBlocks;
        });
      }
    }
  }, []);

  const addNewBlock = useCallback((afterBlockId: number, type: string = 'text') => {
    setBlocks(prevBlocks => {
      const newBlockId = Math.max(...prevBlocks.map(b => b.id), 0) + 1;
      const afterIndex = prevBlocks.findIndex(b => b.id === afterBlockId);
      
      const updated = [...prevBlocks];
      updated.splice(afterIndex + 1, 0, {
        id: newBlockId,
        type,
        content: '',
        placeholder: blockTypes.find(bt => bt.type === type)?.placeholder
      });
      blocksRef.current = updated;
      
      setActiveBlock(newBlockId);
      setTimeout(() => {
        const newTextarea = textareaRefs.current[newBlockId];
        if (newTextarea) {
          newTextarea.focus();
        }
      }, 0);
      
      return updated;
    });
  }, []);

  const changeBlockType = useCallback((blockId: number, newType: string) => {
    setBlocks(prevBlocks => {
      const updated = prevBlocks.map(block => 
        block.id === blockId 
          ? { 
              ...block, 
              type: newType, 
              content: newType === 'divider' ? '' : block.content,
              placeholder: blockTypes.find(bt => bt.type === newType)?.placeholder
            } 
          : block
      );
      blocksRef.current = updated;
      return updated;
    });
    
    setShowMenu({ show: false, blockId: null });
    
    setTimeout(() => {
      const textarea = textareaRefs.current[blockId];
      if (textarea) {
        textarea.focus();
      }
    }, 0);
  }, []);

  const moveBlockUp = useCallback((blockId: number) => {
    setBlocks(prevBlocks => {
      const currentIndex = prevBlocks.findIndex(b => b.id === blockId);
      if (currentIndex > 0) {
        const updated = [...prevBlocks];
        [updated[currentIndex - 1], updated[currentIndex]] = [updated[currentIndex], updated[currentIndex - 1]];
        blocksRef.current = updated;
        return updated;
      }
      return prevBlocks;
    });
  }, []);

  const moveBlockDown = useCallback((blockId: number) => {
    setBlocks(prevBlocks => {
      const currentIndex = prevBlocks.findIndex(b => b.id === blockId);
      if (currentIndex < prevBlocks.length - 1) {
        const updated = [...prevBlocks];
        [updated[currentIndex], updated[currentIndex + 1]] = [updated[currentIndex + 1], updated[currentIndex]];
        blocksRef.current = updated;
        
        // Move cursor to the block that moved down
        setTimeout(() => {
          setActiveBlock(blockId);
          const textarea = textareaRefs.current[blockId];
          if (textarea) {
            textarea.focus();
            textarea.setSelectionRange(0, 0);
          }
        }, 0);
        
        return updated;
      }
      return prevBlocks;
    });
  }, []);

  const deleteBlock = useCallback((blockId: number) => {
    setBlocks(prevBlocks => {
      if (prevBlocks.length > 1) {
        const updated = prevBlocks.filter(block => block.id !== blockId);
        blocksRef.current = updated;
        
        // Set active block to the previous one or next one
        const deletedIndex = prevBlocks.findIndex(b => b.id === blockId);
        const newActiveBlock = updated[Math.max(0, deletedIndex - 1)];
        if (newActiveBlock) {
          setActiveBlock(newActiveBlock.id);
        }
        
        return updated;
      }
      return prevBlocks;
    });
  }, []);

  const renderCodeBlock = useCallback((block: Block) => {
    return (
      <div key={block.id} className="relative group mb-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Code size={16} className="text-gray-500" />
            <span className="text-sm text-gray-500 font-medium">Code Block</span>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
        <Editor
          value={block.content}
          onValueChange={(code) => handleInputChange(block.id, code)}
          highlight={(code) => highlight(code, languages.python, 'python')}
          padding={10}
          style={{
            fontFamily: '"Fira code", "Fira Mono", monospace',
            fontSize: 14,
            backgroundColor: '#2d3748',
            color: '#e2e8f0',
            borderRadius: '6px',
            minHeight: '100px'
          }}
          ref={(ref) => {
            codeBlockRefs.current[block.id] = ref;
          }}
        />
      </div>
    );
  }, [handleInputChange, moveBlockUp, moveBlockDown, deleteBlock]);

  const renderBlock = useCallback((block: Block) => {
    if (block.type === 'code') {
      return renderCodeBlock(block);
    }

    if (block.type === 'divider') {
      return (
        <div key={block.id} className="relative group mb-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Minus size={16} className="text-gray-500" />
            <span className="text-sm text-gray-500 font-medium">Divider</span>
          </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
          <div className="border-t border-gray-300 h-px"></div>
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
          <div className="flex-1">
            <textarea
              ref={el => { textareaRefs.current[block.id] = el; }}
              value={block.content}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange(block.id, e.target.value)}
              onFocus={() => setActiveBlock(block.id)}
              placeholder={block.placeholder}
              className={`${baseClasses} ${typeClasses[block.type]} placeholder-gray-400`}
              rows={1}
              style={{
                minHeight: block.type === 'heading' ? '30px' : '24px',
                height: 'auto',
                resize: 'none',
                overflow: 'hidden'
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
                  .map(option => {
                    const IconComponent = option.icon;
                    return (
                      <button
                        key={option.type}
                        onClick={() => {
                          if (showMenu.blockId) {
                            changeBlockType(showMenu.blockId, option.type);
                          }
                          setShowMenu({ show: false, blockId: null });
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-100 transition-colors"
                      >
                        <IconComponent size={16} className="text-gray-500" />
                        <span className="text-sm">{option.label}</span>
                      </button>
                    );
                  })}
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
  }, [renderCodeBlock, moveBlockUp, moveBlockDown, deleteBlock, handleInputChange, handleKeyDown]);

  const handlePaste = useCallback((e: React.ClipboardEvent, blockId: number) => {
    const text = e.clipboardData.getData('text/plain');
    const html = e.clipboardData.getData('text/html');
    
    if (html && (text.includes('\n') || html.includes('<p>') || html.includes('<div>'))) {
      e.preventDefault();
      
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const parsedBlocks = parseHtmlToBlocks(doc.body);
        
        if (parsedBlocks.length > 0) {
          setBlocks(prevBlocks => {
            const currentIndex = prevBlocks.findIndex(b => b.id === blockId);
            const updated = [...prevBlocks];
            
            // Replace current block with first parsed block
            updated[currentIndex] = parsedBlocks[0];
            
            // Insert remaining blocks after current block
            parsedBlocks.slice(1).forEach((block, index) => {
              updated.splice(currentIndex + 1 + index, 0, block);
            });
            
            blocksRef.current = updated;
            return updated;
          });
        }
      } catch (error) {
        console.error('Error parsing HTML:', error);
        // Fallback to plain text
        handleInputChange(blockId, text);
      }
    }
  }, [handleInputChange]);

  const parseHtmlToBlocks = (element: Element): Block[] => {
    const blocks: Block[] = [];
    let blockId = 1;

    const processElement = (el: Element) => {
      if (el.tagName === 'H1' || el.tagName === 'H2' || el.tagName === 'H3' || el.tagName === 'H4' || el.tagName === 'H5' || el.tagName === 'H6') {
        blocks.push({
          id: blockId++,
          type: 'heading',
          content: el.textContent || '',
          placeholder: 'Heading'
        });
        return;
      }
      
      if (el.tagName === 'UL' || el.tagName === 'OL') {
        const listItems = el.querySelectorAll('li');
        listItems.forEach(li => {
          blocks.push({
            id: blockId++,
            type: 'bullet',
            content: li.textContent || '',
            placeholder: 'List item'
          });
        });
        return;
      }
      
      if (el.tagName === 'BLOCKQUOTE') {
        blocks.push({
          id: blockId++,
          type: 'quote',
          content: el.textContent || '',
          placeholder: 'Quote'
        });
        return;
      }
      
      if (el.tagName === 'PRE' || el.tagName === 'CODE') {
        blocks.push({
          id: blockId++,
          type: 'code',
          content: el.textContent || '',
          placeholder: 'Write your code here...'
        });
        return;
      }
      
      if (el.tagName === 'P' && el.textContent?.trim()) {
        blocks.push({
          id: blockId++,
          type: 'text',
          content: el.textContent || '',
          placeholder: 'Type "/" for commands'
        });
        return;
      }
      
      // Process children if no direct content
      Array.from(el.children).forEach(child => {
        processElement(child as Element);
      });
    };

    processElement(element);
    
    if (blocks.length === 0) {
      blocks.push({
        id: blockId++,
        type: 'text',
        content: element.textContent || '',
        placeholder: 'Type "/" for commands'
      });
    }
    
    return blocks;
  };

  const selectAllContent = useCallback(() => {
    if (blocks.length === 0) return;
    
    // If active block is empty, select all blocks
    const activeBlockContent = blocks.find(b => b.id === activeBlock)?.content || '';
    if (activeBlockContent.trim() === '') {
      // Select all non-empty textareas
      const textareas = Object.values(textareaRefs.current).filter(textarea => 
        textarea && textarea.value.trim() !== ''
      );
      
      textareas.forEach(textarea => {
        if (textarea) {
          textarea.setSelectionRange(0, textarea.value.length);
        }
      });
      
      // Focus the first non-empty textarea
      if (textareas.length > 0) {
        textareas[0]?.focus();
      }
    } else {
      // Select content in active block
      const activeTextarea = textareaRefs.current[activeBlock];
      if (activeTextarea) {
        activeTextarea.setSelectionRange(0, activeTextarea.value.length);
        activeTextarea.focus();
      }
    }
  }, [blocks, activeBlock]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const text = e.dataTransfer.getData('text/plain');
    if (text) {
      setBlocks(currentBlocks => {
        const lastBlockId = currentBlocks[currentBlocks.length - 1].id;
        addNewBlock(lastBlockId, 'text');
        setTimeout(() => {
          const newBlockId = Math.max(...currentBlocks.map(b => b.id), 0) + 1;
          handleInputChange(newBlockId, text);
        }, 0);
        return currentBlocks;
      });
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

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

export default SolutionTab; 