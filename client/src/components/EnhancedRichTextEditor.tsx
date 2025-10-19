import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Code, Type, Hash, List, Quote, Minus, CheckSquare } from 'lucide-react';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs';
import 'prismjs/components/prism-python';
import 'prismjs/themes/prism-tomorrow.css';
import '../notionEditor.css';
import { pasteHandler, ProcessedContent } from '../services/PasteHandler';

interface EnhancedRichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    onSave?: (content: string) => void;
    autoSave?: boolean;
    autoSaveDelay?: number;
}

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

type Block = {
    id: number;
    type: string;
    content: string;
    placeholder?: string;
    level?: number; // For nested lists: 0 = main level, 1 = sub-level, 2 = sub-sub-level, etc.
    checked?: boolean; // For todo items
};

const EnhancedRichTextEditor: React.FC<EnhancedRichTextEditorProps> = ({
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
    const textareaRefs = useRef<{ [key: number]: HTMLTextAreaElement | null }>({});
    const codeBlockRefs = useRef<{ [key: number]: any }>({});
    const menuRef = useRef<HTMLDivElement | null>(null);

    // Initialize blocks from value prop
    useEffect(() => {
        if (value) {
            try {
                const parsed = JSON.parse(value);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setBlocks(parsed);
                    setActiveBlock(parsed[0].id);
                    return;
                }
            } catch (error) {
                // If parsing fails, treat as plain text
                setBlocks([{ id: 1, type: 'text', content: value, placeholder }]);
                setActiveBlock(1);
                return;
            }
        }
        setBlocks([{ id: 1, type: 'text', content: '', placeholder }]);
        setActiveBlock(1);
    }, [value, placeholder]);

    // Auto-save functionality
    useEffect(() => {
        if (autoSave && onChange) {
            const timeoutId = setTimeout(() => {
                const content = JSON.stringify(blocks);
                onChange(content);
                onSave?.(content);
            }, autoSaveDelay);

            return () => clearTimeout(timeoutId);
        }
    }, [blocks, autoSave, autoSaveDelay, onChange, onSave]);

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
            const editorElement = document.querySelector('.enhanced-rich-text-editor');
            
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
        const newBlocks = blocks.map(block =>
            block.id === blockId ? {
                ...block,
                type: newType,
                content: cleanContent,
                placeholder: blockTypes.find(t => t.type === newType)?.placeholder || '',
                level: ['bullet', 'numbered', 'todo'].includes(newType) ? (block.level || 0) : undefined,
                checked: newType === 'todo' ? false : undefined
            } : block
        );

        setBlocks(newBlocks);
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
                    const cursorPosition = 'selectionStart' in textarea ? (textarea.selectionStart || 0) : 0;
                    const textBeforeCursor = 'value' in textarea ? textarea.value.substring(0, cursorPosition) : '';
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
                '/divider': 'divider'
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

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement | HTMLDivElement>, blockId: number) => {
        const currentBlock = blocks.find(b => b.id === blockId);
        const textarea = e.target as HTMLTextAreaElement | HTMLDivElement;
        const cursorPosition = 'selectionStart' in textarea ? (textarea.selectionStart || 0) : 0;

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
                    const newContent = prevBlock.content + ('value' in textarea ? textarea.value : '');
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

        const start = 'selectionStart' in textarea ? (textarea.selectionStart || 0) : 0;
        const end = 'selectionEnd' in textarea ? (textarea.selectionEnd || 0) : 0;
        const selectedText = 'value' in textarea ? textarea.value.substring(start, end) : '';
        
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

        const start = 'selectionStart' in textarea ? (textarea.selectionStart || 0) : 0;
        const end = 'selectionEnd' in textarea ? (textarea.selectionEnd || 0) : 0;
        const selectedText = 'value' in textarea ? textarea.value.substring(start, end) : '';
        
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

    // Handle paste at cursor position within a specific block
    const handleBlockPaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>, blockId: number) => {
        e.preventDefault();
        
        if (!e.clipboardData) {
            console.warn('No clipboard data available');
            return;
        }

        try {
            const textarea = e.target as HTMLTextAreaElement;
            const cursorPosition = 'selectionStart' in textarea ? (textarea.selectionStart || 0) : 0;
            const currentBlock = blocks.find(b => b.id === blockId);
            
            if (!currentBlock) return;

            // Set starting block ID to avoid conflicts
            const maxId = Math.max(...blocks.map(b => b.id));
            pasteHandler.setStartingBlockId(maxId + 1);

            // Process pasted content
            const result: ProcessedContent = pasteHandler.processPastedContent(e.clipboardData, {
                startingBlockId: maxId + 1,
                maxBlocks: 50
            });

            if (result.success && result.blocks.length > 0) {
                const currentBlockIndex = blocks.findIndex(b => b.id === blockId);
                
                if (result.blocks.length === 1) {
                    // Single block: insert content at cursor position
                    const pastedContent = result.blocks[0].content;
                    const beforeCursor = currentBlock.content.substring(0, cursorPosition);
                    const afterCursor = currentBlock.content.substring(cursorPosition);
                    const newContent = beforeCursor + pastedContent + afterCursor;
                    
                    const newBlocks = blocks.map(block =>
                        block.id === blockId ? { ...block, content: newContent } : block
                    );
                    setBlocks(newBlocks);

                    // Set cursor position after pasted content
                    setTimeout(() => {
                        const newCursorPosition = beforeCursor.length + pastedContent.length;
                        textarea.setSelectionRange(newCursorPosition, newCursorPosition);
                        textarea.focus();
                    }, 0);
                } else {
                    // Multiple blocks: split current block and insert new blocks
                    const beforeCursor = currentBlock.content.substring(0, cursorPosition);
                    const afterCursor = currentBlock.content.substring(cursorPosition);
                    
                    // Update current block with content before cursor
                    const updatedCurrentBlock = { ...currentBlock, content: beforeCursor };
                    
                    // Create a new block with content after cursor (if any)
                    const newBlocks = [...blocks];
                    newBlocks[currentBlockIndex] = updatedCurrentBlock;
                    
                    if (afterCursor.trim()) {
                        const afterBlock = {
                            id: maxId + result.blocks.length + 1,
                            type: currentBlock.type,
                            content: afterCursor,
                            placeholder: currentBlock.placeholder,
                            level: currentBlock.level
                        };
                        newBlocks.splice(currentBlockIndex + 1, 0, ...result.blocks, afterBlock);
                    } else {
                        newBlocks.splice(currentBlockIndex + 1, 0, ...result.blocks);
                    }
                    
                    setBlocks(newBlocks);

                    // Set focus to the first pasted block
                    const firstPastedBlock = result.blocks[0];
                    setActiveBlock(firstPastedBlock.id);

                    setTimeout(() => {
                        const pastedTextarea = textareaRefs.current[firstPastedBlock.id];
                        if (pastedTextarea) {
                            pastedTextarea.focus();
                            pastedTextarea.setSelectionRange(0, 0);
                        }
                    }, 100);
                }
            } else if (result.error) {
                console.error('Block paste error:', result.error);
                // Fallback: insert plain text
                const plainText = e.clipboardData.getData('text/plain');
                if (plainText) {
                    const beforeCursor = currentBlock.content.substring(0, cursorPosition);
                    const afterCursor = currentBlock.content.substring(cursorPosition);
                    const newContent = beforeCursor + plainText + afterCursor;
                    
                    const newBlocks = blocks.map(block =>
                        block.id === blockId ? { ...block, content: newContent } : block
                    );
                    setBlocks(newBlocks);

                    setTimeout(() => {
                        const newCursorPosition = beforeCursor.length + plainText.length;
                        textarea.setSelectionRange(newCursorPosition, newCursorPosition);
                        textarea.focus();
                    }, 0);
                }
            }
        } catch (error) {
            console.error('Error handling block paste:', error);
            // Fallback: insert plain text
            const plainText = e.clipboardData?.getData('text/plain');
            if (plainText) {
                const textarea = e.target as HTMLTextAreaElement;
                const cursorPosition = 'selectionStart' in textarea ? (textarea.selectionStart || 0) : 0;
                const currentBlock = blocks.find(b => b.id === blockId);
                
                if (currentBlock) {
                    const beforeCursor = currentBlock.content.substring(0, cursorPosition);
                    const afterCursor = currentBlock.content.substring(cursorPosition);
                    const newContent = beforeCursor + plainText + afterCursor;
                    
                    const newBlocks = blocks.map(block =>
                        block.id === blockId ? { ...block, content: newContent } : block
                    );
                    setBlocks(newBlocks);

                    setTimeout(() => {
                        const newCursorPosition = beforeCursor.length + plainText.length;
                        textarea.setSelectionRange(newCursorPosition, newCursorPosition);
                        textarea.focus();
                    }, 0);
                }
            }
        }
    }, [blocks]);

    const renderBlock = (block: Block) => {
        const indentLevel = block.level || 0;
        const indentClass = indentLevel > 0 ? `ml-${indentLevel * 6}` : '';

        switch (block.type) {
            case 'heading':
                return (
                    <div key={block.id} className={`relative group mb-2 ${indentClass}`}>
                        <textarea
                            ref={(el) => { textareaRefs.current[block.id] = el; }}
                            value={block.content}
                            onChange={(e) => handleInputChange(block.id, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, block.id)}
                            onPaste={(e) => handleBlockPaste(e, block.id)}
                            onFocus={() => setActiveBlock(block.id)}
                            placeholder={block.placeholder}
                            className="w-full text-2xl font-bold bg-transparent border-none outline-none resize-none overflow-hidden"
                            rows={1}
                            style={{ minHeight: '2rem' }}
                        />
                    </div>
                );

            case 'bullet':
                return (
                    <div key={block.id} className={`relative group mb-2 ${indentClass}`}>
                        <div className="flex items-start gap-2">
                            <span className="text-gray-600 mt-1 select-none">•</span>
                            <textarea
                                ref={(el) => { textareaRefs.current[block.id] = el; }}
                                value={block.content}
                                onChange={(e) => handleInputChange(block.id, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, block.id)}
                                onPaste={(e) => handleBlockPaste(e, block.id)}
                                onFocus={() => setActiveBlock(block.id)}
                                placeholder={block.placeholder}
                                className="flex-1 bg-transparent border-none outline-none resize-none overflow-hidden"
                                rows={1}
                                style={{ minHeight: '1.5rem' }}
                            />
                        </div>
                    </div>
                );

            case 'numbered':
                // Calculate the number for this item based on its position among numbered items at the same level
                const sameLevel = blocks.filter(b => b.type === 'numbered' && (b.level || 0) === (block.level || 0));
                const blockIndex = sameLevel.findIndex(b => b.id === block.id) + 1;
                return (
                    <div key={block.id} className={`relative group mb-2 ${indentClass}`}>
                        <div className="flex items-start gap-2">
                            <span className="text-gray-600 mt-1 select-none min-w-[1.5rem]">{blockIndex}.</span>
                            <textarea
                                ref={(el) => { textareaRefs.current[block.id] = el; }}
                                value={block.content}
                                onChange={(e) => handleInputChange(block.id, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, block.id)}
                                onPaste={(e) => handleBlockPaste(e, block.id)}
                                onFocus={() => setActiveBlock(block.id)}
                                placeholder={block.placeholder}
                                className="flex-1 bg-transparent border-none outline-none resize-none overflow-hidden"
                                rows={1}
                                style={{ minHeight: '1.5rem' }}
                            />
                        </div>
                    </div>
                );

            case 'todo':
                return (
                    <div key={block.id} className={`relative group mb-2 ${indentClass}`}>
                        <div className="flex items-start gap-2">
                            <input
                                type="checkbox"
                                checked={block.checked || false}
                                onChange={() => toggleTodoItem(block.id)}
                                className="mt-1 cursor-pointer"
                            />
                            <textarea
                                ref={(el) => { textareaRefs.current[block.id] = el; }}
                                value={block.content}
                                onChange={(e) => handleInputChange(block.id, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, block.id)}
                                onPaste={(e) => handleBlockPaste(e, block.id)}
                                onFocus={() => setActiveBlock(block.id)}
                                placeholder={block.placeholder}
                                className={`flex-1 bg-transparent border-none outline-none resize-none overflow-hidden ${block.checked ? 'line-through text-gray-500' : ''
                                    }`}
                                rows={1}
                                style={{ minHeight: '1.5rem' }}
                            />
                        </div>
                    </div>
                );

            case 'quote':
                return (
                    <div key={block.id} className={`relative group mb-2 ${indentClass}`}>
                        <div className="flex items-start gap-2">
                            <div className="w-1 bg-gray-400 rounded-full mt-1 mb-1 flex-shrink-0" style={{ minHeight: '1.5rem' }}></div>
                            <textarea
                                ref={(el) => { textareaRefs.current[block.id] = el; }}
                                value={block.content}
                                onChange={(e) => handleInputChange(block.id, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, block.id)}
                                onPaste={(e) => handleBlockPaste(e, block.id)}
                                onFocus={() => setActiveBlock(block.id)}
                                placeholder={block.placeholder}
                                className="flex-1 bg-transparent border-none outline-none resize-none overflow-hidden italic text-gray-700"
                                rows={1}
                                style={{ minHeight: '1.5rem' }}
                            />
                        </div>
                    </div>
                );

            case 'code':
                return (
                    <div key={block.id} className={`relative group mb-2 ${indentClass}`}>
                        <div className="bg-gray-100 rounded-md p-3 font-mono text-sm">
                            <Editor
                                value={block.content}
                                onValueChange={(value) => handleInputChange(block.id, value)}
                                highlight={(code) => highlight(code, languages.python, 'python')}
                                padding={0}
                                style={{
                                    fontFamily: '"Fira code", "Fira Mono", monospace',
                                    fontSize: 14,
                                    backgroundColor: 'transparent',
                                    minHeight: '1.5rem'
                                }}
                                ref={(el) => { codeBlockRefs.current[block.id] = el; }}
                                onKeyDown={(e) => handleKeyDown(e, block.id)}
                                onFocus={() => setActiveBlock(block.id)}
                            />
                        </div>
                    </div>
                );

            case 'divider':
                return (
                    <div key={block.id} className={`relative group mb-4 ${indentClass}`}>
                        <div className="flex items-center py-2">
                            <div className="flex-1 h-px bg-gray-300"></div>
                        </div>
                    </div>
                );

            default:
                return (
                    <div key={block.id} className={`relative group mb-2 ${indentClass}`}>
                        <textarea
                            ref={(el) => { textareaRefs.current[block.id] = el; }}
                            value={block.content}
                            onChange={(e) => handleInputChange(block.id, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, block.id)}
                            onPaste={(e) => handleBlockPaste(e, block.id)}
                            onFocus={() => setActiveBlock(block.id)}
                            placeholder={block.placeholder}
                            className="w-full bg-transparent border-none outline-none resize-none overflow-hidden"
                            rows={1}
                            style={{ minHeight: '1.5rem' }}
                        />
                    </div>
                );
        }
    };

    return (
        <div className={`enhanced-rich-text-editor ${className}`}>
            <div className="space-y-1">
                {blocks.map(renderBlock)}
            </div>

            {/* Slash Command Menu */}
            {showMenu.show && (
                <div
                    ref={menuRef}
                    className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-2 w-64"
                    style={{
                        left: showMenu.x || 0,
                        top: showMenu.y || 0,
                    }}
                >
                    <div className="text-xs text-gray-500 mb-2 px-2">BASIC BLOCKS</div>
                    {blockTypes.map((blockType) => (
                        <button
                            key={blockType.type}
                            onClick={() => showMenu.blockId && changeBlockType(showMenu.blockId, blockType.type)}
                            className="w-full flex items-center gap-3 px-2 py-2 text-left hover:bg-gray-100 rounded-md text-sm"
                        >
                            <blockType.icon size={16} className="text-gray-600" />
                            <div>
                                <div className="font-medium">{blockType.label}</div>
                                <div className="text-xs text-gray-500">{blockType.placeholder}</div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default EnhancedRichTextEditor;