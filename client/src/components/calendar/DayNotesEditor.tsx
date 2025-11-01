import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  EditorRoot,
  EditorContent,
  EditorCommand,
  EditorCommandItem,
  EditorCommandEmpty,
  EditorBubble,
  EditorBubbleItem,
  type JSONContent,
  StarterKit,
  TaskList,
  TaskItem,
  TiptapUnderline,
  Placeholder,
  TiptapLink,
  UpdatedImage,
  HorizontalRule,
  Command,
  renderItems
} from 'novel';
import { Editor } from '@tiptap/react';
import { Range } from '@tiptap/core';
import {
  List,
  ListOrdered,
  Text,
  Code,
  CheckSquare,
  Heading1,
  Quote
} from 'lucide-react';
import { calendarService } from '../../services/calendarService';
import { formatDateForDisplay } from '../../utils/dateUtils';
import { BackwardCompatibilityConverter } from '../../utils/BackwardCompatibilityConverter';
import AskAI from '../AskAI';
import '../../styles/novel-editor.css';
import '../../styles/ask-ai.css';

interface DayNotesEditorProps {
  selectedDate: Date;
  className?: string;
  autoSaveDelay?: number;
}

const DayNotesEditor: React.FC<DayNotesEditorProps> = ({
  selectedDate,
  className = '',
  autoSaveDelay = 1000,
}) => {
  const [content, setContent] = useState<JSONContent | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Ask AI state
  const [showAskAI, setShowAskAI] = useState(false);
  const [selectedTextForAI, setSelectedTextForAI] = useState('');

  const editorRef = useRef<Editor | null>(null);
  const isUnmountedRef = useRef(false);

  // Cleanup effect
  useEffect(() => {
    return () => {
      isUnmountedRef.current = true;
      if (editorRef.current) {
        try {
          editorRef.current.destroy();
        } catch (error) {
          console.error('Error destroying editor', error);
        }
        editorRef.current = null;
      }
    };
  }, []);

  // Reset unmounted flag when date changes
  useEffect(() => {
    isUnmountedRef.current = false;
  }, [selectedDate]);

  // Load content when date changes
  useEffect(() => {
    const loadContent = async () => {
      if (isUnmountedRef.current) return;

      setIsLoading(true);
      setError(null);

      try {
        console.log(`Loading day notes for: ${formatDateForDisplay(selectedDate)}`);
        
        // Load day notes from calendar service
        const dayNotes = await calendarService.getDayNotes(selectedDate);

        // Convert to Novel format
        const novelContent = BackwardCompatibilityConverter.convertToNovelFormat(dayNotes || '');

        if (!isUnmountedRef.current) {
          console.log('Setting day notes content:', novelContent);
          setContent(novelContent);
        }

      } catch (error) {
        if (isUnmountedRef.current) return;

        console.error('Failed to load day notes content', error);
        
        const fallbackContent: JSONContent = {
          type: 'doc',
          content: [{ type: 'paragraph', content: [] }]
        };

        setContent(fallbackContent);
        setError('Failed to load day notes');

      } finally {
        if (!isUnmountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    loadContent();
  }, [selectedDate]);

  // Save notes function - silent save without loading indicators
  const saveNotes = useCallback(async (content: JSONContent) => {
    console.log('Save day notes called');

    setError(null);

    try {
      if (!content || content.type !== 'doc') {
        throw new Error('Invalid content format');
      }

      const contentString = JSON.stringify(content);
      await calendarService.saveDayNotes(selectedDate, contentString);

      console.log('Day notes saved successfully');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save day notes';
      setError(errorMessage);

      // Clear error after 3 seconds
      setTimeout(() => {
        setError(null);
      }, 3000);

      console.error('Save failed', error);
    }
  }, [selectedDate]);

  // Debounced save function
  const debouncedSave = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;

      return (content: JSONContent) => {
        if (isUnmountedRef.current) return;

        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          if (!isUnmountedRef.current) {
            console.log(`Auto-save triggered after ${autoSaveDelay}ms delay`);
            saveNotes(content);
          }
        }, autoSaveDelay);
      };
    })(),
    [autoSaveDelay, saveNotes]
  );

  // Enhanced content change handler with slash command detection (from NovelNotesTab)
  const lastContentRef = useRef<JSONContent | null>(null);
  const isTypingSlashCommandRef = useRef(false);
  const slashCommandTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleContentChange = useCallback((content: JSONContent) => {
    setContent(content);

    // Store current content for comparison
    const currentContentStr = JSON.stringify(content);
    const lastContentStr = lastContentRef.current ? JSON.stringify(lastContentRef.current) : '';

    // Only proceed if content actually changed
    if (currentContentStr === lastContentStr) {
      return;
    }

    lastContentRef.current = content;

    // Check if the current editor has an active slash command by examining the content
    let hasActiveSlashCommand = false;

    if (content && content.content) {
      // Look for slash commands in the content
      const contentStr = JSON.stringify(content);

      // Check for patterns that indicate active slash command typing
      // This is more reliable than checking editor state
      hasActiveSlashCommand = (
        contentStr.includes('"/') || // Slash at start of text node
        contentStr.includes(' /') || // Slash after space
        (contentStr.includes('/') && contentStr.length - lastContentStr.length === 1) // Just typed a slash
      );
    }

    if (hasActiveSlashCommand) {
      // User is typing a slash command, delay autosave
      isTypingSlashCommandRef.current = true;

      // Clear any existing timeout
      if (slashCommandTimeoutRef.current) {
        clearTimeout(slashCommandTimeoutRef.current);
      }

      // Set a longer timeout to allow slash command interaction
      slashCommandTimeoutRef.current = setTimeout(() => {
        isTypingSlashCommandRef.current = false;
        // Only save if not unmounted and content hasn't changed again
        if (!isUnmountedRef.current) {
          console.log('Delayed save after slash command interaction');
          debouncedSave(content);
        }
      }, 1000); // 1 second delay for slash commands
    } else if (!isTypingSlashCommandRef.current) {
      // Normal content change, save with regular debounce
      debouncedSave(content);
    }
    // If still typing slash command, don't save yet
  }, [debouncedSave]);

  // Listen for Ask AI events
  React.useEffect(() => {
    const handleAskAIEvent = (event: CustomEvent) => {
      const { text } = event.detail;
      if (text) {
        setSelectedTextForAI(text);
        setShowAskAI(true);
      }
    };

    window.addEventListener('askAI', handleAskAIEvent as EventListener);
    return () => window.removeEventListener('askAI', handleAskAIEvent as EventListener);
  }, []);

  // Enhanced suggestion items with comprehensive slash commands (copied from NovelNotesTab)
  const suggestionItems = React.useMemo(() => [
    {
      title: 'Text',
      description: 'Just start typing with plain text.',
      searchTerms: ['p', 'paragraph'],
      icon: <Text size={18} />,
      command: ({ editor, range }: { editor: Editor; range: Range }) => {
        editor.chain().focus().deleteRange(range).setParagraph().run();
      },
    },
    {
      title: 'Heading 1',
      description: 'Big section heading.',
      searchTerms: ['title', 'big', 'large', 'h1', 'heading1'],
      icon: <Heading1 size={18} />,
      command: ({ editor, range }: { editor: Editor; range: Range }) => {
        editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run();
      },
    },
    {
      title: 'Heading 2',
      description: 'Medium section heading.',
      searchTerms: ['subtitle', 'medium', 'h2', 'heading2'],
      icon: (
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M4 12h8m0 0V6m0 6v6m5-9v6m0 0V9a3 3 0 0 1 3-3m-3 6h3" />
        </svg>
      ),
      command: ({ editor, range }: { editor: Editor; range: Range }) => {
        editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run();
      },
    },
    {
      title: 'Heading 3',
      description: 'Small section heading.',
      searchTerms: ['small', 'h3', 'heading3'],
      icon: (
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M4 12h8m0 0V6m0 6v6m5-9v6m0 0V9a3 3 0 0 1 3-3m-3 6h3" />
        </svg>
      ),
      command: ({ editor, range }: { editor: Editor; range: Range }) => {
        editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run();
      },
    },
    {
      title: 'Bullet List',
      description: 'Create a simple bullet list.',
      searchTerms: ['unordered', 'point', 'ul', 'bullet', 'bulletlist'],
      icon: <List size={18} />,
      command: ({ editor, range }: { editor: Editor; range: Range }) => {
        editor.chain().focus().deleteRange(range).toggleBulletList().run();
      },
    },
    {
      title: 'Numbered List',
      description: 'Create a list with numbering.',
      searchTerms: ['ordered', 'ol', 'numbers', 'numberedlist'],
      icon: <ListOrdered size={18} />,
      command: ({ editor, range }: { editor: Editor; range: Range }) => {
        editor.chain().focus().deleteRange(range).toggleOrderedList().run();
      },
    },
    {
      title: 'To-do List',
      description: 'Track tasks with a to-do list.',
      searchTerms: ['todo', 'task', 'list', 'check', 'checkbox', 'tasks'],
      icon: <CheckSquare size={18} />,
      command: ({ editor, range }: { editor: Editor; range: Range }) => {
        editor.chain().focus().deleteRange(range).toggleTaskList().run();
      },
    },
    {
      title: 'Quote',
      description: 'Capture a quote.',
      searchTerms: ['blockquote', 'citation', 'quote'],
      icon: <Quote size={18} />,
      command: ({ editor, range }: { editor: Editor; range: Range }) => {
        editor.chain().focus().deleteRange(range).toggleBlockquote().run();
      },
    },
    {
      title: 'Code Block',
      description: 'Capture a code snippet.',
      searchTerms: ['codeblock', 'pre', 'code', 'programming'],
      icon: <Code size={18} />,
      command: ({ editor, range }: { editor: Editor; range: Range }) => {
        editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
      },
    },
    {
      title: 'Inline Code',
      description: 'Add inline code formatting.',
      searchTerms: ['code', 'inline', 'monospace'],
      icon: (
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <polyline points="16,18 22,12 16,6" />
          <polyline points="8,6 2,12 8,18" />
        </svg>
      ),
      command: ({ editor, range }: { editor: Editor; range: Range }) => {
        editor.chain().focus().deleteRange(range).toggleCode().run();
      },
    },
    {
      title: 'Bold',
      description: 'Make text bold.',
      searchTerms: ['bold', 'strong', 'b'],
      icon: (
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
          <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
        </svg>
      ),
      command: ({ editor, range }: { editor: Editor; range: Range }) => {
        editor.chain().focus().deleteRange(range).toggleBold().run();
      },
    },
    {
      title: 'Italic',
      description: 'Make text italic.',
      searchTerms: ['italic', 'em', 'i'],
      icon: (
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <line x1="19" y1="4" x2="10" y2="4" />
          <line x1="14" y1="20" x2="5" y2="20" />
          <line x1="15" y1="4" x2="9" y2="20" />
        </svg>
      ),
      command: ({ editor, range }: { editor: Editor; range: Range }) => {
        editor.chain().focus().deleteRange(range).toggleItalic().run();
      },
    },
    {
      title: 'Underline',
      description: 'Underline text.',
      searchTerms: ['underline', 'u'],
      icon: (
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3" />
          <line x1="4" y1="21" x2="20" y2="21" />
        </svg>
      ),
      command: ({ editor, range }: { editor: Editor; range: Range }) => {
        editor.chain().focus().deleteRange(range).toggleUnderline().run();
      },
    },
    {
      title: 'Strikethrough',
      description: 'Strike through text.',
      searchTerms: ['strikethrough', 'strike', 'cross'],
      icon: (
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M16 4H9a3 3 0 0 0-2.83 4" />
          <path d="M14 12a4 4 0 0 1 0 8H6" />
          <line x1="4" y1="12" x2="20" y2="12" />
        </svg>
      ),
      command: ({ editor, range }: { editor: Editor; range: Range }) => {
        editor.chain().focus().deleteRange(range).toggleStrike().run();
      },
    },
    {
      title: 'Link',
      description: 'Add a link to text.',
      searchTerms: ['link', 'url', 'href', 'anchor'],
      icon: (
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      ),
      command: ({ editor, range }: { editor: Editor; range: Range }) => {
        const url = window.prompt('Enter URL:');
        if (url) {
          editor.chain().focus().deleteRange(range).setLink({ href: url }).run();
        }
      },
    },
    {
      title: 'Ask AI',
      description: 'Get AI assistance with your text.',
      searchTerms: ['ai', 'assistant', 'help', 'improve', 'generate'],
      icon: (
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      command: ({ editor, range }: { editor: Editor; range: Range }) => {
        // Delete the slash command
        editor.chain().focus().deleteRange(range).run();

        // Get current selection or nearby text
        const { from, to } = editor.state.selection;
        let textToAnalyze = '';

        if (from !== to) {
          // Text is selected
          textToAnalyze = editor.state.doc.textBetween(from, to);
        } else {
          // No selection, get current paragraph
          const $pos = editor.state.doc.resolve(from);
          const start = $pos.start($pos.depth);
          const end = $pos.end($pos.depth);
          textToAnalyze = editor.state.doc.textBetween(start, end);
        }

        if (textToAnalyze.trim()) {
          // Store the text and trigger AI via a custom event
          window.dispatchEvent(new CustomEvent('askAI', {
            detail: { text: textToAnalyze }
          }));
        } else {
          // Insert placeholder text for AI assistance
          editor.chain().focus().insertContent('Type your text here and select it to use Ask AI...').run();
        }
      },
    },
    {
      title: 'Divider',
      description: 'Visually divide blocks.',
      searchTerms: ['horizontal', 'rule', 'hr', 'separator', 'line'],
      icon: (
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <line x1="3" y1="12" x2="21" y2="12" />
        </svg>
      ),
      command: ({ editor, range }: { editor: Editor; range: Range }) => {
        editor.chain().focus().deleteRange(range).setHorizontalRule().run();
      },
    },
  ], []);

  // Create extensions for Novel editor with slash commands
  const extensions = React.useMemo(() => {
    const baseExtensions = [
      StarterKit.configure({
        history: { depth: 50, newGroupDelay: 500 },
        bulletList: {
          HTMLAttributes: {
            class: 'my-custom-bullet-list',
            style: 'list-style-type: disc; padding-left: 1.5rem;',
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: 'my-custom-ordered-list', 
            style: 'list-style-type: decimal; padding-left: 1.5rem;',
          },
        },
      }),
      TaskList.configure({
        HTMLAttributes: { class: 'not-prose pl-2' },
      }),
      TaskItem.configure({
        HTMLAttributes: { class: 'flex items-start my-4' },
        nested: true,
      }),
      TiptapUnderline,
      TiptapLink.configure({
        HTMLAttributes: {
          class: 'text-blue-600 underline underline-offset-[3px] hover:text-blue-800 transition-colors cursor-pointer',
        },
        openOnClick: false,
        linkOnPaste: true,
      }),
      UpdatedImage.configure({
        HTMLAttributes: { class: 'rounded-lg border border-muted' },
        allowBase64: false,
      }),
      HorizontalRule.configure({
        HTMLAttributes: { class: 'mt-4 mb-6 border-t border-muted-foreground/20' },
      }),
      Placeholder.configure({
        placeholder: `Type '/' for commands or start writing your notes for ${formatDateForDisplay(selectedDate)}...`,
        considerAnyAsEmpty: true,
        showOnlyWhenEditable: true,
        showOnlyCurrent: false,
      }),
    ];

    // Add command extension for slash commands

    baseExtensions.push(
      Command.configure({
        suggestion: {
          items: ({ query }: { query: string }) => {
            return suggestionItems
              .filter(item => {
                if (query.length === 0) return true;
                // Require at least 2 characters for search to prevent single character matches
                if (query.length === 1) return false;
                const searchText = query.toLowerCase();
                return (
                  item.title.toLowerCase().includes(searchText) ||
                  item.description.toLowerCase().includes(searchText) ||
                  item.searchTerms.some((term: string) => term.toLowerCase().includes(searchText))
                );
              })
              .slice(0, 10);
          },
          render: renderItems,
          char: '/',
          allowSpaces: false,
          startOfLine: false,
          allowedPrefixes: [' ', '('],
        },
      })
    );

    return baseExtensions;
  }, [selectedDate, suggestionItems]);

  return (
    <div className={`day-notes-editor ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="notes-header">
          <span className="text-lg font-medium">📝 Day Notes - {formatDateForDisplay(selectedDate)}</span>
          {isLoading && (
            <span className="ml-2 text-sm text-blue-600 flex items-center">
              <svg className="animate-spin -ml-1 mr-1 h-3 w-3 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Loading...
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              if (content) {
                saveNotes(content);
              }
            }}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors"
            title="Save day notes manually"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Save
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-red-800">Day Notes Error</h4>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Editor */}
      <div className="day-notes-editor-container">
        <EditorRoot>
          <EditorContent
            initialContent={content}
            onCreate={({ editor }) => {
              editorRef.current = editor;
              console.log('Day notes editor created successfully');
            }}
            onUpdate={({ editor }) => {
              try {
                const json = editor.getJSON();
                handleContentChange(json);
              } catch (error) {
                console.error('Error getting editor content', error);
              }
            }}
            onDestroy={() => {
              console.log('Day notes editor destroyed');
            }}
            extensions={extensions}
            className="novel-editor"
            editorProps={{
              attributes: {
                class: 'prose prose-lg dark:prose-invert prose-headings:font-title font-default focus:outline-none max-w-full',
                spellcheck: 'false',
              },
            }}
          >
            <EditorCommand className="z-50 h-auto max-h-[330px] overflow-y-auto rounded-md border border-muted bg-background px-1 py-2 shadow-md transition-all">
              <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-100">
                DAY NOTES COMMANDS
              </div>
              <EditorCommandEmpty className="px-2 text-muted-foreground">No results</EditorCommandEmpty>
              {suggestionItems.map((item) => (
                <EditorCommandItem
                  value={item.title}
                  onCommand={(val) => item.command?.(val)}
                  className="flex w-full items-center px-3 py-2 text-left hover:bg-gray-100 rounded transition-colors cursor-pointer"
                  key={item.title}
                >
                  <div className="w-4 h-4 mr-3 text-gray-500 flex items-center justify-center">
                    {item.icon}
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-700 font-medium text-sm">{item.title}</p>
                    <p className="text-xs text-gray-500">{item.description}</p>
                  </div>
                </EditorCommandItem>
              ))}
            </EditorCommand>

            <EditorBubble
              tippyOptions={{ placement: 'top' }}
              className="flex w-fit max-w-[90vw] overflow-hidden rounded-md border border-muted bg-background shadow-xl"
            >
              {/* Ask AI Button */}
              <EditorBubbleItem
                onSelect={(editor) => {
                  const selectedText = editor.state.doc.textBetween(
                    editor.state.selection.from,
                    editor.state.selection.to
                  );
                  if (selectedText.trim()) {
                    window.dispatchEvent(new CustomEvent('askAI', {
                      detail: { text: selectedText }
                    }));
                  } else {
                    alert('Please select some text to use Ask AI');
                  }
                }}
                className="flex items-center gap-1 px-2 py-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ask-ai-trigger"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="text-xs">Ask AI</span>
              </EditorBubbleItem>

              <div className="h-6 w-px bg-muted mx-1" />

              {/* Bold */}
              <EditorBubbleItem
                onSelect={(editor) => editor.chain().focus().toggleBold().run()}
                className="p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
                </svg>
              </EditorBubbleItem>

              {/* Italic */}
              <EditorBubbleItem
                onSelect={(editor) => editor.chain().focus().toggleItalic().run()}
                className="p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <line x1="19" y1="4" x2="10" y2="4" />
                  <line x1="14" y1="20" x2="5" y2="20" />
                  <line x1="15" y1="4" x2="9" y2="20" />
                </svg>
              </EditorBubbleItem>

              {/* Underline */}
              <EditorBubbleItem
                onSelect={(editor) => editor.chain().focus().toggleUnderline().run()}
                className="p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3" />
                  <line x1="4" y1="21" x2="20" y2="21" />
                </svg>
              </EditorBubbleItem>

              {/* Code */}
              <EditorBubbleItem
                onSelect={(editor) => editor.chain().focus().toggleCode().run()}
                className="p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <polyline points="16,18 22,12 16,6" />
                  <polyline points="8,6 2,12 8,18" />
                </svg>
              </EditorBubbleItem>
            </EditorBubble>
          </EditorContent>
        </EditorRoot>
      </div>

      {/* Ask AI Component */}
      {showAskAI && editorRef.current && (
        <AskAI
          editor={editorRef.current}
          selectedText={selectedTextForAI}
          onClose={() => {
            setShowAskAI(false);
            setSelectedTextForAI('');
          }}
        />
      )}
    </div>
  );
};

export default DayNotesEditor;