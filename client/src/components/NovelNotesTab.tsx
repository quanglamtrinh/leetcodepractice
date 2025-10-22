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
import { Problem } from './ProblemList';
import { BackwardCompatibilityConverter } from '../utils/BackwardCompatibilityConverter';
import AskAI from './AskAI';
import '../styles/novel-editor.css';
import '../styles/ask-ai.css';

interface NovelNotesTabProps {
  problem: Problem;
  onNotesSaved?: (problemId: number, notes: string) => void;
  className?: string;
  autoSaveDelay?: number;
  placeholderText?: string;
  enableOptimizations?: boolean;
}

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

interface SaveState {
  isSaving: boolean;
  lastSaveTime: number | null;
  retryCount: number;
  pendingContent: JSONContent | null;
}



// Enhanced logging utility for debugging
const logDebug = (message: string, data?: any) => {
  console.log(`🔍 NovelNotesTab Debug: ${message}`, data || '');
};

const logError = (message: string, error?: any) => {
  console.error(`❌ NovelNotesTab Error: ${message}`, error || '');
};

const logSuccess = (message: string, data?: any) => {
  console.log(`✅ NovelNotesTab Success: ${message}`, data || '');
};

// Fallback editor component for when Novel editor fails to load
const FallbackEditor: React.FC<{
  content: JSONContent | undefined;
  onContentChange: (content: JSONContent) => void;
  error: string;
  onRetry: () => void;
}> = ({ content, onContentChange, error, onRetry }) => {
  const [textValue, setTextValue] = useState('');

  // Convert JSONContent to plain text for fallback editor
  useEffect(() => {
    if (content) {
      const extractText = (node: any): string => {
        if (node.type === 'text') {
          return node.text || '';
        }
        if (node.content && Array.isArray(node.content)) {
          return node.content.map(extractText).join('');
        }
        return '';
      };
      
      const text = content.content ? content.content.map(extractText).join('\n') : '';
      setTextValue(text);
    }
  }, [content]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setTextValue(newText);
    
    // Convert plain text back to JSONContent
    const lines = newText.split('\n');
    const jsonContent: JSONContent = {
      type: 'doc',
      content: lines.map(line => ({
        type: 'paragraph',
        content: line.trim() ? [{ type: 'text', text: line }] : []
      }))
    };
    
    onContentChange(jsonContent);
  };

  return (
    <div className="fallback-editor">
      <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div className="flex-1">
            <h4 className="text-sm font-medium text-yellow-800">Rich text editor unavailable</h4>
            <p className="text-sm text-yellow-700 mt-1">
              {error}. Using fallback plain text editor.
            </p>
            <button
              onClick={onRetry}
              className="mt-2 text-sm text-yellow-800 underline hover:text-yellow-900"
            >
              Try loading rich editor again
            </button>
          </div>
        </div>
      </div>
      
      <textarea
        value={textValue}
        onChange={handleTextChange}
        className="w-full h-80 p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        placeholder="Enter your notes here... (Plain text mode)"
      />
      
      <div className="mt-2 text-xs text-gray-500">
        Note: You're using the fallback plain text editor. Some formatting may be lost.
      </div>
    </div>
  );
};

// Optimized Novel editor configuration
const createOptimizedExtensions = (placeholderText: string = "Type '/' for commands or start writing your notes...") => {
  return [
    StarterKit.configure({
      // Optimize for performance - disable unnecessary features
      history: {
        depth: 50, // Limit undo/redo history for better performance
        newGroupDelay: 500, // Group rapid changes together
      },
      bulletList: {
        HTMLAttributes: {
          class: 'my-custom-bullet-list',
          style: 'list-style-type: disc; padding-left: 1.5rem;',
        },
        keepMarks: false, // Optimize performance
        keepAttributes: false,
      },
      orderedList: {
        HTMLAttributes: {
          class: 'my-custom-ordered-list',
          style: 'list-style-type: decimal; padding-left: 1.5rem;',
        },
        keepMarks: false,
        keepAttributes: false,
      },
      // Enable all text formatting features
      bold: {
        HTMLAttributes: {
          class: 'novel-bold',
        },
      },
      italic: {
        HTMLAttributes: {
          class: 'novel-italic',
        },
      },
      strike: {
        HTMLAttributes: {
          class: 'novel-strike',
        },
      },
      code: {
        HTMLAttributes: {
          class: 'novel-inline-code',
        },
      },
      codeBlock: {
        HTMLAttributes: {
          class: 'novel-code-block',
          spellcheck: 'false',
        },
      },
      // Enable heading levels
      heading: {
        levels: [1, 2, 3, 4, 5, 6],
        HTMLAttributes: {
          class: 'novel-heading',
        },
      },
      // Optimize paragraph handling
      paragraph: {
        HTMLAttributes: {
          class: 'novel-paragraph',
        },
      },
      // Enable blockquote
      blockquote: {
        HTMLAttributes: {
          class: 'novel-blockquote',
        },
      },
    }),
    TaskList.configure({
      HTMLAttributes: {
        class: 'not-prose pl-2',
      },
    }),
    TaskItem.configure({
      HTMLAttributes: {
        class: 'flex items-start my-4',
      },
      nested: true,
    }),
    TiptapUnderline,
    TiptapLink.configure({
      HTMLAttributes: {
        class: 'text-blue-600 underline underline-offset-[3px] hover:text-blue-800 transition-colors cursor-pointer',
      },
      openOnClick: false, // Prevent accidental navigation
      linkOnPaste: true,
    }),
    UpdatedImage.configure({
      HTMLAttributes: {
        class: 'rounded-lg border border-muted',
      },
      allowBase64: false, // Optimize performance by disabling base64 images
    }),
    HorizontalRule.configure({
      HTMLAttributes: {
        class: 'mt-4 mb-6 border-t border-muted-foreground/20',
      },
    }),
    Placeholder.configure({
      placeholder: placeholderText,
      considerAnyAsEmpty: true,
      showOnlyWhenEditable: true,
      showOnlyCurrent: false,
    }),
  ];
};

// Wrapper component for Novel editor with error boundary and optimizations
const NovelEditorWrapper: React.FC<{
  content: JSONContent | undefined;
  onContentChange: (content: JSONContent) => void;
  onError: (error: string) => void;
  suggestionItems: any[];
  placeholderText?: string;
  enableOptimizations?: boolean;
  editorRef: React.MutableRefObject<Editor | null>;
}> = ({ content, onContentChange, onError, suggestionItems, placeholderText, enableOptimizations = true, editorRef }) => {
  useEffect(() => {
    // Set up global error handler for Novel editor
    const handleError = (event: ErrorEvent) => {
      if (event.error && (
        event.error.message?.includes('novel') ||
        event.error.message?.includes('tiptap') ||
        event.error.message?.includes('prosemirror')
      )) {
        onError(`Editor initialization failed: ${event.error.message}`);
      }
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, [onError]);

  // Create optimized extensions
  const extensions = React.useMemo(() => {
    const baseExtensions = createOptimizedExtensions(placeholderText);
    
    // Add command extension with proper keyboard navigation
    baseExtensions.push(
      Command.configure({
        suggestion: {
          items: ({ query }: { query: string }) => {
            return suggestionItems
              .filter(item => {
                if (query.length === 0) return true;
                
                // Search in title, description, and search terms
                const searchText = query.toLowerCase();
                return (
                  item.title.toLowerCase().includes(searchText) ||
                  item.description.toLowerCase().includes(searchText) ||
                  item.searchTerms.some((term: string) => term.toLowerCase().includes(searchText))
                );
              })
              .slice(0, 10); // Limit to 10 items for performance
          },
          render: renderItems,
          char: '/',
          allowSpaces: false,
          startOfLine: false,
          // Enable proper keyboard navigation
          allowedPrefixes: [' ', '('],
        },
      })
    );
    
    return baseExtensions;
  }, [suggestionItems, placeholderText, enableOptimizations]);

  // Optimized editor props
  const editorProps = React.useMemo(() => ({
    attributes: {
      class: 'prose prose-lg dark:prose-invert prose-headings:font-title font-default focus:outline-none max-w-full',
      spellcheck: 'false', // Disable spellcheck for better performance
    },
    // Optimize transaction handling
    handleDOMEvents: enableOptimizations ? {
      // Prevent unnecessary DOM events for better performance
      paste: (view: any, event: ClipboardEvent) => {
        // Let the editor handle paste normally but optimize large pastes
        const clipboardData = event.clipboardData;
        if (clipboardData) {
          const text = clipboardData.getData('text/plain');
          if (text.length > 10000) {
            // For very large pastes, show a warning
            console.warn('Large paste detected, performance may be affected');
          }
        }
        return false; // Let editor handle normally
      },
    } : {},
  }), [enableOptimizations]);

  try {
    return (
      <EditorRoot>
        <EditorContent
          initialContent={content}
          onCreate={({ editor }) => {
            // Store editor reference for cleanup and AI functionality
            editorRef.current = editor;
            if (typeof onContentChange === 'function') {
              const parentComponent = (onContentChange as any).__parentComponent;
              if (parentComponent && parentComponent.editorRef) {
                parentComponent.editorRef.current = editor;
              }
            }
            logDebug('Novel editor created successfully');
            logDebug('Editor content on create:', editor.getJSON());
            
            // Force set the content to ensure it matches the current problem
            if (content && JSON.stringify(content) !== JSON.stringify(editor.getJSON())) {
              logDebug('Forcing content update on editor create - content mismatch detected');
              editor.commands.setContent(content);
            }
          }}
          onUpdate={({ editor }) => {
            try {
              // Optimize content updates for large documents
              if (enableOptimizations) {
                const json = editor.getJSON();
                
                // Check content size and warn if too large
                const contentSize = JSON.stringify(json).length;
                if (contentSize > 500000) { // 500KB
                  logDebug('Large content detected, performance may be affected', { size: contentSize });
                }
                
                onContentChange(json);
              } else {
                const json = editor.getJSON();
                onContentChange(json);
              }
            } catch (error) {
              logError('Error getting editor content', error);
              onError(`Content update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }}
          onDestroy={() => {
            logDebug('Novel editor destroyed');
          }}
          extensions={extensions}
          className="novel-editor"
          editorProps={editorProps}
        >
          <EditorCommand className="z-50 h-auto max-h-[330px] overflow-y-auto rounded-md border border-muted bg-background px-1 py-2 shadow-md transition-all">
            <EditorCommandEmpty className="px-2 text-muted-foreground">No results</EditorCommandEmpty>
            {suggestionItems.map((item) => (
              <EditorCommandItem
                value={item.title}
                onCommand={(val) => item.command?.(val)}
                className="flex w-full items-center space-x-2 rounded-md px-2 py-1 text-left text-sm hover:bg-accent aria-selected:bg-accent"
                key={item.title}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-md border border-muted bg-background">
                  {item.icon}
                </div>
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
              </EditorCommandItem>
            ))}
          </EditorCommand>

          <EditorBubble
            tippyOptions={{
              placement: 'top',
            }}
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
                  // Trigger Ask AI via custom event
                  window.dispatchEvent(new CustomEvent('askAI', { 
                    detail: { text: selectedText } 
                  }));
                } else {
                  // If no text selected, show a message
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

            {/* Text Style Dropdown */}
            <div className="relative">
              <EditorBubbleItem
                onSelect={(editor) => {
                  // Toggle between paragraph and heading
                  if (editor.isActive('heading')) {
                    editor.chain().focus().setParagraph().run();
                  } else {
                    editor.chain().focus().setHeading({ level: 1 }).run();
                  }
                }}
                className="flex items-center gap-1 px-2 py-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <span className="text-xs">Text</span>
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <polyline points="6,9 12,15 18,9" />
                </svg>
              </EditorBubbleItem>
            </div>

            <div className="h-6 w-px bg-muted mx-1" />

            {/* Link Button */}
            <EditorBubbleItem
              onSelect={(editor) => {
                const url = window.prompt('Enter URL:');
                if (url) {
                  editor.chain().focus().setLink({ href: url }).run();
                }
              }}
              className="p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </EditorBubbleItem>

            <div className="h-6 w-px bg-muted mx-1" />

            {/* Bold */}
            <EditorBubbleItem
              onSelect={(editor) => {
                editor.chain().focus().toggleBold().run();
              }}
              className="p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
              </svg>
            </EditorBubbleItem>

            {/* Italic */}
            <EditorBubbleItem
              onSelect={(editor) => {
                editor.chain().focus().toggleItalic().run();
              }}
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
              onSelect={(editor) => {
                editor.chain().focus().toggleUnderline().run();
              }}
              className="p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3" />
                <line x1="4" y1="21" x2="20" y2="21" />
              </svg>
            </EditorBubbleItem>

            {/* Strikethrough */}
            <EditorBubbleItem
              onSelect={(editor) => {
                editor.chain().focus().toggleStrike().run();
              }}
              className="p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M16 4H9a3 3 0 0 0-2.83 4" />
                <path d="M14 12a4 4 0 0 1 0 8H6" />
                <line x1="4" y1="12" x2="20" y2="12" />
              </svg>
            </EditorBubbleItem>

            {/* Code */}
            <EditorBubbleItem
              onSelect={(editor) => {
                editor.chain().focus().toggleCode().run();
              }}
              className="p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <polyline points="16,18 22,12 16,6" />
                <polyline points="8,6 2,12 8,18" />
              </svg>
            </EditorBubbleItem>

            <div className="h-6 w-px bg-muted mx-1" />

            <div className="h-6 w-px bg-muted mx-1" />

            {/* Quote */}
            <EditorBubbleItem
              onSelect={(editor) => {
                editor.chain().focus().toggleBlockquote().run();
              }}
              className="p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
                <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
              </svg>
            </EditorBubbleItem>

            <div className="h-6 w-px bg-muted mx-1" />

            {/* More Options */}
            <EditorBubbleItem
              onSelect={(editor) => {
                // Could open a more options menu
                console.log('More options clicked');
              }}
              className="p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="1" />
                <circle cx="19" cy="12" r="1" />
                <circle cx="5" cy="12" r="1" />
              </svg>
            </EditorBubbleItem>
          </EditorBubble>
        </EditorContent>
      </EditorRoot>
    );
  } catch (error) {
    logError('Novel editor wrapper failed', error);
    onError(`Editor failed to initialize: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return null;
  }
};

const NovelNotesTab: React.FC<NovelNotesTabProps> = ({ 
  problem, 
  onNotesSaved, 
  className = '',
  autoSaveDelay = 500,
  placeholderText = "Type '/' for commands or start writing your notes...",
  enableOptimizations = true
}) => {
  const [content, setContent] = useState<JSONContent | undefined>();
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editorLoadError, setEditorLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>({
    isSaving: false,
    lastSaveTime: null,
    retryCount: 0,
    pendingContent: null
  });

  // Ask AI state
  const [showAskAI, setShowAskAI] = useState(false);
  const [selectedTextForAI, setSelectedTextForAI] = useState('');

  // Refs for cleanup and optimization
  const editorRef = useRef<Editor | null>(null);
  const cleanupFunctionsRef = useRef<Array<() => void>>([]);
  const isUnmountedRef = useRef(false);

  // Retry configuration for network operations (memoized to prevent re-renders)
  const retryConfig: RetryConfig = React.useMemo(() => ({
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 5000
  }), []);

  // Utility function for exponential backoff retry
  const retryWithBackoff = async <T,>(
    operation: () => Promise<T>,
    config: RetryConfig,
    operationName: string
  ): Promise<T> => {
    let lastError: Error = new Error(`${operationName} failed`);
    
    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        const result = await operation();
        if (attempt > 0) {
          logSuccess(`${operationName} succeeded after ${attempt} retries`);
        }
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt === config.maxRetries) {
          logError(`${operationName} failed after ${config.maxRetries} retries`, lastError);
          break;
        }

        // Check if error is retryable
        const isRetryable = 
          lastError.name === 'AbortError' ||
          lastError.message.includes('network') ||
          lastError.message.includes('timeout') ||
          lastError.message.includes('Server error') ||
          (lastError as any).status >= 500;

        if (!isRetryable) {
          logError(`${operationName} failed with non-retryable error`, lastError);
          break;
        }

        const delay = Math.min(
          config.baseDelay * Math.pow(2, attempt),
          config.maxDelay
        );
        
        logDebug(`${operationName} attempt ${attempt + 1} failed, retrying in ${delay}ms`, lastError.message);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  };

  // Cleanup effect - runs when component unmounts or problem changes
  useEffect(() => {
    return () => {
      // Mark component as unmounted
      isUnmountedRef.current = true;
      
      // Run all cleanup functions
      cleanupFunctionsRef.current.forEach(cleanup => {
        try {
          cleanup();
        } catch (error) {
          logError('Error during cleanup', error);
        }
      });
      
      // Clear cleanup functions array
      cleanupFunctionsRef.current = [];
      
      // Clear editor reference
      if (editorRef.current) {
        try {
          editorRef.current.destroy();
        } catch (error) {
          logError('Error destroying editor', error);
        }
        editorRef.current = null;
      }
      
      logDebug('Component cleanup completed');
    };
  }, []);

  // Reset unmounted flag when problem changes
  useEffect(() => {
    isUnmountedRef.current = false;
  }, [problem.id]);

  // Force content reset when problem changes to ensure proper synchronization
  useEffect(() => {
    // Clear any pending saves when switching problems
    setSaveState(prev => ({
      ...prev,
      isSaving: false,
      pendingContent: null,
      retryCount: 0
    }));
    
    // Clear any errors
    setError(null);
    setEditorLoadError(null);
    
    logDebug(`Problem switched to ID: ${problem.id}, Title: ${problem.title}`);
  }, [problem.id]);

  // Force editor content update when content changes
  useEffect(() => {
    if (editorRef.current && content) {
      const currentContent = editorRef.current.getJSON();
      const contentMatches = JSON.stringify(content) === JSON.stringify(currentContent);
      
      logDebug('Content update check:', {
        hasEditor: !!editorRef.current,
        hasContent: !!content,
        contentMatches,
        problemId: problem.id,
        problemTitle: problem.title
      });
      
      if (!contentMatches) {
        logDebug('Forcing editor content update due to content change');
        editorRef.current.commands.setContent(content);
      }
    }
  }, [content, problem.id, problem.title]);

  // Enhanced content loading with comprehensive error handling and optimization
  useEffect(() => {
    const loadContent = async () => {
      // Don't load if component is unmounted
      if (isUnmountedRef.current) {
        return;
      }
      
      setIsLoading(true);
      setError(null);
      setEditorLoadError(null);
      
      try {
        logDebug(`Problem changed - ID: ${problem.id}, Title: ${problem.title}`);
        logDebug('Raw notes data:', problem.notes);
        
        // Optimize content loading for large notes
        let novelContent: JSONContent;
        
        if (enableOptimizations && problem.notes && typeof problem.notes === 'string' && problem.notes.length > 50000) {
          // For very large notes, show a loading indicator and process asynchronously
          logDebug('Large notes detected, processing asynchronously');
          
          // Use setTimeout to allow UI to update
          await new Promise(resolve => setTimeout(resolve, 0));
          
          // Check again if component is still mounted
          if (isUnmountedRef.current) {
            return;
          }
        }
        
        // Use BackwardCompatibilityConverter to handle all format conversions
        novelContent = BackwardCompatibilityConverter.convertToNovelFormat(problem.notes || '');
        
        // Final check before setting content
        if (!isUnmountedRef.current) {
          logSuccess('Successfully loaded and converted notes to Novel format');
          console.log('📝 Setting content for problem:', problem.title, 'ID:', problem.id);
          console.log('📝 Content preview:', JSON.stringify(novelContent).substring(0, 200) + '...');
          setContent(novelContent);
        }
        
      } catch (error) {
        // Don't update state if component is unmounted
        if (isUnmountedRef.current) {
          return;
        }
        
        logError('Failed to load content', error);
        
        let errorMessage = 'Failed to load notes';
        let fallbackContent: JSONContent;
        
        if (error instanceof Error) {
          if (error.message.includes('JSON')) {
            errorMessage = 'Notes format is corrupted. Using fallback content.';
          } else if (error.message.includes('conversion')) {
            errorMessage = 'Could not convert existing notes format. Starting with empty notes.';
          } else {
            errorMessage = `Content loading error: ${error.message}`;
          }
        }
        
        // Always provide fallback content to prevent editor from breaking
        fallbackContent = {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: problem.notes ? 
                    '⚠️ Original notes could not be loaded properly. Please check the content below and re-save if needed.' : 
                    ''
                }
              ]
            }
          ]
        };
        
        // If we have original notes but conversion failed, try to preserve as plain text
        if (problem.notes && typeof problem.notes === 'string' && problem.notes.trim()) {
          try {
            if (!fallbackContent.content) {
              fallbackContent.content = [];
            }
            fallbackContent.content.push({
              type: 'paragraph',
              content: [{ type: 'text', text: problem.notes }]
            });
          } catch {
            // If even plain text fails, just use empty content
          }
        }
        
        setContent(fallbackContent);
        setError(errorMessage);
        
      } finally {
        if (!isUnmountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    loadContent();
  }, [problem.id, enableOptimizations]);

  // Enhanced save notes with retry logic and comprehensive error handling
  const saveNotes = useCallback(async (content: JSONContent, isRetry: boolean = false) => {
    logDebug('Save notes called', { 
      problemId: problem.id, 
      contentType: content.type, 
      isRetry,
      retryCount: saveState.retryCount 
    });
    
    // Update save state
    setSaveState(prev => ({ 
      ...prev, 
      isSaving: true, 
      pendingContent: content,
      retryCount: isRetry ? prev.retryCount + 1 : 0
    }));
    
    setStatus(isRetry ? `Retrying save (${saveState.retryCount + 1}/${retryConfig.maxRetries})...` : 'Saving...');
    setError(null);
    
    try {
      // Validate content before saving
      if (!content || content.type !== 'doc') {
        throw new Error('Invalid content format - content must be a valid document');
      }

      const contentString = JSON.stringify(content);
      
      // Check content size
      if (contentString.length > 1000000) { // 1MB limit
        throw new Error('Notes are too large (over 1MB). Please reduce content size.');
      }
      
      logDebug('Sending save request', { 
        problemId: problem.id, 
        contentLength: contentString.length 
      });

      // Use retry logic for the save operation
      const saveOperation = async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

        try {
          const response = await fetch(`/api/problems/${problem.id}/notes`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notes: contentString }),
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `Save failed (HTTP ${response.status})`;
            
            if (response.status === 404) {
              errorMessage = 'Problem not found - it may have been deleted';
            } else if (response.status === 413) {
              errorMessage = 'Notes are too large for the server to process';
            } else if (response.status === 422) {
              errorMessage = 'Invalid notes format - please try refreshing the page';
            } else if (response.status === 429) {
              errorMessage = 'Too many save requests - please wait a moment';
            } else if (response.status >= 500) {
              errorMessage = 'Server error - your notes will be retried automatically';
            } else if (errorText) {
              try {
                const errorData = JSON.parse(errorText);
                errorMessage = errorData.message || errorMessage;
              } catch {
                errorMessage = `${errorMessage}: ${errorText.substring(0, 100)}`;
              }
            }
            
            const error = new Error(errorMessage);
            (error as any).status = response.status;
            throw error;
          }

          return response;
        } finally {
          clearTimeout(timeoutId);
        }
      };

      // Execute save with retry logic
      await retryWithBackoff(saveOperation, retryConfig, 'Save notes');

      // Success
      setSaveState(prev => ({ 
        ...prev, 
        isSaving: false, 
        lastSaveTime: Date.now(),
        retryCount: 0,
        pendingContent: null
      }));
      
      setStatus('Saved!');
      setTimeout(() => setStatus(''), 1200);
      
      // Update the problem object to reflect the saved state
      problem.notes = contentString;
      onNotesSaved?.(problem.id, contentString);
      
      logSuccess('Notes saved successfully', { 
        problemId: problem.id, 
        contentLength: contentString.length,
        retryCount: saveState.retryCount
      });

    } catch (error) {
      setSaveState(prev => ({ 
        ...prev, 
        isSaving: false
      }));
      
      let errorMessage = 'Failed to save notes';
      let isRetryable = false;
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Save timeout - check your connection and try again';
          isRetryable = true;
        } else if (error.message.includes('fetch')) {
          errorMessage = 'Network error - check your internet connection';
          isRetryable = true;
        } else if (error.message.includes('Server error')) {
          errorMessage = error.message;
          isRetryable = true;
        } else {
          errorMessage = error.message;
          // Check if it's a server error by status code
          isRetryable = (error as any).status >= 500;
        }
      }
      
      // Show appropriate status message
      const statusMessage = isRetryable && saveState.retryCount < retryConfig.maxRetries
        ? `Save failed - will retry automatically`
        : `Error: ${errorMessage}`;
      
      setStatus(statusMessage);
      setError(errorMessage);
      
      // Clear status after delay, but keep error visible longer for non-retryable errors
      const clearDelay = isRetryable ? 3000 : 8000;
      setTimeout(() => setStatus(''), clearDelay);
      
      logError('Save failed', { 
        error: error instanceof Error ? error.message : error,
        problemId: problem.id,
        retryCount: saveState.retryCount,
        isRetryable
      });
      
      // Don't clear error immediately for non-retryable errors
      if (!isRetryable) {
        setTimeout(() => setError(null), clearDelay);
      }
    }
  }, [problem.id, onNotesSaved, saveState.retryCount, retryConfig]);

  // Enhanced clear notes with retry logic and comprehensive error handling
  const clearNotes = useCallback(async () => {
    logDebug('Clear notes called', { problemId: problem.id });
    setStatus('Clearing...');
    setError(null);
    
    try {
      const defaultContent: JSONContent = {
        type: 'doc',
        content: [{ type: 'paragraph', content: [] }]
      };
      
      // Use retry logic for the clear operation
      const clearOperation = async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        try {
          const response = await fetch(`/api/problems/${problem.id}/notes`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notes: JSON.stringify(defaultContent) }),
            signal: controller.signal
          });

          clearTimeout(timeoutId);
          
          if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `Clear failed (HTTP ${response.status})`;
            
            if (response.status === 404) {
              errorMessage = 'Problem not found - it may have been deleted';
            } else if (response.status === 422) {
              errorMessage = 'Invalid request format - please try refreshing the page';
            } else if (response.status === 429) {
              errorMessage = 'Too many requests - please wait a moment';
            } else if (response.status >= 500) {
              errorMessage = 'Server error - please try again';
            } else if (errorText) {
              try {
                const errorData = JSON.parse(errorText);
                errorMessage = errorData.message || errorMessage;
              } catch {
                errorMessage = `${errorMessage}: ${errorText.substring(0, 100)}`;
              }
            }
            
            const error = new Error(errorMessage);
            (error as any).status = response.status;
            throw error;
          }

          return response;
        } finally {
          clearTimeout(timeoutId);
        }
      };

      // Execute clear with retry logic
      await retryWithBackoff(clearOperation, retryConfig, 'Clear notes');
      
      // Success - update UI and state
      setStatus('Cleared!');
      setTimeout(() => setStatus(''), 1200);
      setContent(defaultContent);
      onNotesSaved?.(problem.id, JSON.stringify(defaultContent));
      
      logSuccess('Notes cleared successfully', { problemId: problem.id });
      
    } catch (error) {
      let errorMessage = 'Failed to clear notes';
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Clear timeout - check your connection and try again';
        } else if (error.message.includes('fetch')) {
          errorMessage = 'Network error - check your internet connection';
        } else {
          errorMessage = error.message;
        }
      }
      
      setStatus(`Error: ${errorMessage}`);
      setError(errorMessage);
      
      // Keep error visible longer and don't modify content on error
      setTimeout(() => {
        setStatus('');
        setError(null);
      }, 8000);
      
      logError('Clear failed', { 
        error: error instanceof Error ? error.message : error,
        problemId: problem.id 
      });
    }
  }, [problem.id, onNotesSaved, retryConfig]);

  const handleClearConfirm = useCallback(() => {
    clearNotes();
    setShowClearConfirm(false);
  }, [clearNotes]);

  // Store the latest saveNotes function in a ref (same as old NotesTab)
  const saveNotesRef = useRef(saveNotes);
  saveNotesRef.current = saveNotes;

  // Enhanced debounced save function with configurable delay and cleanup
  const debouncedSave = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      
      const debouncedFunction = (content: JSONContent) => {
        // Don't save if component is unmounted
        if (isUnmountedRef.current) {
          return;
        }
        
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          // Double-check if component is still mounted
          if (!isUnmountedRef.current) {
            logDebug(`Auto-save triggered after ${autoSaveDelay}ms delay`);
            saveNotesRef.current(content);
          }
        }, autoSaveDelay);
      };
      
      // Add cleanup function
      const cleanup = () => {
        clearTimeout(timeoutId);
      };
      cleanupFunctionsRef.current.push(cleanup);
      
      return debouncedFunction;
    })(),
    [autoSaveDelay]
  );

  const handleContentChange = useCallback((content: JSONContent) => {
    setContent(content);
    debouncedSave(content);
  }, [debouncedSave]);

  // Add parent component reference for editor cleanup
  React.useEffect(() => {
    if (handleContentChange) {
      (handleContentChange as any).__parentComponent = { editorRef };
    }
  }, [handleContentChange]);

  // Listen for Ask AI events from slash commands
  React.useEffect(() => {
    const handleAskAIEvent = (event: CustomEvent) => {
      const { text } = event.detail;
      if (text) {
        setSelectedTextForAI(text);
        setShowAskAI(true);
      }
    };

    window.addEventListener('askAI', handleAskAIEvent as EventListener);
    
    return () => {
      window.removeEventListener('askAI', handleAskAIEvent as EventListener);
    };
  }, []);

  // Auto-retry mechanism for failed saves
  useEffect(() => {
    if (saveState.pendingContent && !saveState.isSaving && error && saveState.retryCount < retryConfig.maxRetries) {
      const shouldRetry = 
        error.includes('network') || 
        error.includes('timeout') || 
        error.includes('Server error') ||
        error.includes('fetch');

      if (shouldRetry) {
        const retryDelay = Math.min(
          retryConfig.baseDelay * Math.pow(2, saveState.retryCount),
          retryConfig.maxDelay
        );

        logDebug(`Auto-retry scheduled in ${retryDelay}ms`, { 
          retryCount: saveState.retryCount,
          error 
        });

        const timeoutId = setTimeout(() => {
          logDebug('Executing auto-retry for failed save');
          saveNotes(saveState.pendingContent!, true);
        }, retryDelay);

        return () => clearTimeout(timeoutId);
      }
    }
  }, [saveState.pendingContent, saveState.isSaving, saveState.retryCount, error, retryConfig, saveNotes]);

  const suggestionItems = [
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
      searchTerms: ['title', 'big', 'large', 'h1'],
      icon: <Heading1 size={18} />,
      command: ({ editor, range }: { editor: Editor; range: Range }) => {
        editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run();
      },
    },
    {
      title: 'Heading 2',
      description: 'Medium section heading.',
      searchTerms: ['subtitle', 'medium', 'h2'],
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
      searchTerms: ['small', 'h3'],
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
      searchTerms: ['unordered', 'point', 'ul', 'list'],
      icon: <List size={18} />,
      command: ({ editor, range }: { editor: Editor; range: Range }) => {
        editor.chain().focus().deleteRange(range).toggleBulletList().run();
      },
    },
    {
      title: 'Numbered List',
      description: 'Create a list with numbering.',
      searchTerms: ['ordered', 'ol', 'list', '1', 'numbers'],
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
  ];

  return (
    <div className={`novel-notes-tab ${className}`}>
      {/* Enhanced header with better status reporting */}
      <div className="flex justify-between items-center mb-4">
        <div className="notes-header">
          <span className="text-lg font-medium">📝 Notes</span>
          {isLoading && (
            <span className="ml-2 text-sm text-blue-600 flex items-center">
              <svg className="animate-spin -ml-1 mr-1 h-3 w-3 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Loading...
            </span>
          )}
          {status && !isLoading && (
            <span className={`ml-2 text-sm flex items-center ${
              status.includes('Saved') || status.includes('Cleared') ? 'text-green-600' : 
              status.includes('Error') || status.includes('Failed') ? 'text-red-600' : 
              status.includes('Saving') || status.includes('Clearing') ? 'text-blue-600' :
              'text-gray-600'
            }`}>
              {(status.includes('Saved') || status.includes('Cleared')) && (
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
              {(status.includes('Error') || status.includes('Failed')) && (
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              )}
              {(status.includes('Saving') || status.includes('Clearing')) && (
                <svg className="animate-spin w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {status}
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
            title="Save notes manually"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Save
          </button>
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
        </div>
      </div>

      {/* Enhanced error display */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-red-800 mb-1">
                {error.includes('save') || error.includes('Save') ? 'Save Error' :
                 error.includes('clear') || error.includes('Clear') ? 'Clear Error' :
                 error.includes('load') || error.includes('Load') ? 'Loading Error' :
                 error.includes('network') || error.includes('Network') ? 'Network Error' :
                 error.includes('timeout') || error.includes('Timeout') ? 'Timeout Error' :
                 'Error'}
              </h4>
              <p className="text-sm text-red-700">{error}</p>
              
              {/* Action buttons for different error types */}
              <div className="mt-3 flex gap-2">
                {(error.includes('network') || error.includes('timeout') || error.includes('Server error')) && (
                  <button
                    onClick={() => {
                      if (saveState.pendingContent) {
                        saveNotes(saveState.pendingContent, true);
                      }
                      setError(null);
                    }}
                    className="text-xs px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded border border-red-300 transition-colors"
                  >
                    Retry Save
                  </button>
                )}
                
                {error.includes('load') && (
                  <button
                    onClick={() => {
                      setError(null);
                      // Trigger content reload
                      const loadEvent = new CustomEvent('reload-content');
                      window.dispatchEvent(loadEvent);
                    }}
                    className="text-xs px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded border border-red-300 transition-colors"
                  >
                    Reload Content
                  </button>
                )}
                
                <button
                  onClick={() => setError(null)}
                  className="text-xs px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded border border-red-300 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Network status indicator */}
      {saveState.isSaving && saveState.retryCount > 0 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center">
            <svg className="animate-spin w-4 h-4 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-sm text-blue-800">
              Retrying save operation... (Attempt {saveState.retryCount + 1} of {retryConfig.maxRetries + 1})
            </span>
          </div>
        </div>
      )}

      {/* Novel Editor with graceful degradation */}
      <div className="novel-editor-container border border-gray-300 rounded-lg p-4 min-h-[400px] max-h-[600px] overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="flex items-center text-gray-500">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Loading notes...
            </div>
          </div>
        ) : editorLoadError ? (
          <FallbackEditor 
            content={content}
            onContentChange={handleContentChange}
            error={editorLoadError}
            onRetry={() => {
              setEditorLoadError(null);
              // Force re-render of the editor
              setContent(prev => ({ ...prev }));
            }}
          />
        ) : (
          <>
            {/* Debug info - remove in production */}
            {process.env.NODE_ENV === 'development' && (
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
                Debug: Content loaded = {content ? 'Yes' : 'No'}, 
                Type = {content?.type || 'None'}, 
                Has content = {content?.content && content.content.length > 0 ? 'Yes' : 'No'}
              </div>
            )}
            <NovelEditorWrapper
              key={`novel-editor-${problem.id}-${problem.notes ? problem.notes.length : 0}`}
              content={content || { type: 'doc', content: [{ type: 'paragraph', content: [] }] }}
              onContentChange={handleContentChange}
              onError={(error) => {
                logError('Novel editor failed to load', error);
                setEditorLoadError(error);
              }}
              suggestionItems={suggestionItems}
              placeholderText={placeholderText}
              enableOptimizations={enableOptimizations}
              editorRef={editorRef}
            />
          </>
        )}
      </div>

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

      {/* Ask AI Modal */}
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

export default NovelNotesTab;