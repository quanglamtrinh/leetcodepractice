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
import '../styles/novel-editor.css';

interface NovelNotesTabProps {
  problem: Problem;
  onNotesSaved?: (problemId: number, notes: string) => void;
}

// Convert old block format to Novel JSONContent format
const convertBlocksToNovelContent = (blocks: any[]): JSONContent => {
  const content = blocks.map(block => {
    switch (block.type) {
      case 'heading':
        return {
          type: 'heading',
          attrs: { level: 1 },
          content: block.content ? [{ type: 'text', text: block.content }] : []
        };
      case 'bullet':
        return {
          type: 'bulletList',
          content: [{
            type: 'listItem',
            content: [{
              type: 'paragraph',
              content: block.content ? [{ type: 'text', text: block.content }] : []
            }]
          }]
        };
      case 'numbered':
        return {
          type: 'orderedList',
          content: [{
            type: 'listItem',
            content: [{
              type: 'paragraph',
              content: block.content ? [{ type: 'text', text: block.content }] : []
            }]
          }]
        };
      case 'todo':
        return {
          type: 'taskList',
          content: [{
            type: 'taskItem',
            attrs: { checked: block.checked || false },
            content: [{
              type: 'paragraph',
              content: block.content ? [{ type: 'text', text: block.content }] : []
            }]
          }]
        };
      case 'code':
        return {
          type: 'codeBlock',
          content: block.content ? [{ type: 'text', text: block.content }] : []
        };
      case 'quote':
        return {
          type: 'blockquote',
          content: [{
            type: 'paragraph',
            content: block.content ? [{ type: 'text', text: block.content }] : []
          }]
        };
      case 'divider':
        return {
          type: 'horizontalRule'
        };
      default: // text
        return {
          type: 'paragraph',
          content: block.content ? [{ type: 'text', text: block.content }] : []
        };
    }
  });

  return {
    type: 'doc',
    content: content.length > 0 ? content : [{ type: 'paragraph', content: [] }]
  };
};

const NovelNotesTab: React.FC<NovelNotesTabProps> = ({ problem, onNotesSaved }) => {
  const [content, setContent] = useState<JSONContent | undefined>();
  const [status, setStatus] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Load notes from problem object when problem ID changes
  useEffect(() => {
    console.log('📝 NovelNotesTab: Problem changed, ID:', problem.id, 'Title:', problem.title);
    console.log('📝 NovelNotesTab: Raw notes data:', problem.notes);
    
    if (problem.notes) {
      try {
        const parsed = JSON.parse(problem.notes);
        
        // Check if it's already in Novel JSONContent format
        if (parsed && parsed.type === 'doc' && parsed.content) {
          console.log('✅ NovelNotesTab: Loading Novel JSONContent:', parsed);
          setContent(parsed);
          return;
        }
        
        // Check if it's in old block format
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id && parsed[0].type) {
          console.log('🔄 NovelNotesTab: Converting old block format to Novel format');
          const novelContent = convertBlocksToNovelContent(parsed);
          console.log('✅ NovelNotesTab: Converted content:', novelContent);
          setContent(novelContent);
          return;
        }
        
        // If it's some other JSON format, treat as text
        console.log('📝 NovelNotesTab: Unknown JSON format, treating as text');
        const textContent: JSONContent = {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(parsed)
                }
              ]
            }
          ]
        };
        setContent(textContent);
        return;
        
      } catch (error) {
        // If JSON parsing fails, treat as plain text
        console.log('📝 NovelNotesTab: Converting plain text to JSONContent');
        const textContent: JSONContent = {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: problem.notes
                }
              ]
            }
          ]
        };
        setContent(textContent);
        return;
      }
    }
    
    console.log('📝 NovelNotesTab: Using default empty content');
    const defaultContent: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: []
        }
      ]
    };
    setContent(defaultContent);
  }, [problem.id]);

  // Save notes to backend (same API as old NotesTab)
  const saveNotes = useCallback(async (content: JSONContent) => {
    console.log('🔄 saveNotes called with content:', content);
    setStatus('Saving...');
    try {
      const contentString = JSON.stringify(content);
      console.log('📤 Sending request to save notes:', contentString);
      const response = await fetch(`/api/problems/${problem.id}/notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: contentString
        })
      });
      console.log('📥 Response status:', response.status);
      if (response.ok) {
        setStatus('Saved!');
        setTimeout(() => setStatus(''), 1200);
        // Update the problem object to reflect the saved state (same as old NotesTab)
        problem.notes = contentString;
        onNotesSaved?.(problem.id, contentString);
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
  }, [problem.id, onNotesSaved]);

  const clearNotes = useCallback(async () => {
    try {
      setStatus('Clearing...');
      const defaultContent: JSONContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: []
          }
        ]
      };
      
      const response = await fetch(`/api/problems/${problem.id}/notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: JSON.stringify(defaultContent)
        })
      });
      
      if (response.ok) {
        setStatus('Cleared!');
        setTimeout(() => setStatus(''), 1200);
        setContent(defaultContent);
        onNotesSaved?.(problem.id, JSON.stringify(defaultContent));
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

  // Store the latest saveNotes function in a ref (same as old NotesTab)
  const saveNotesRef = useRef(saveNotes);
  saveNotesRef.current = saveNotes;

  // Debounced save function
  const debouncedSave = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return (content: JSONContent) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          console.log('⏰ Debounce timeout reached, calling saveNotes with latest content');
          saveNotesRef.current(content);
        }, 500);
      };
    })(),
    []
  );

  const handleContentChange = useCallback((content: JSONContent) => {
    setContent(content);
    debouncedSave(content);
  }, [debouncedSave]);

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
      title: 'Bullet List',
      description: 'Create a simple bullet list.',
      searchTerms: ['unordered', 'point', 'ul'],
      icon: <List size={18} />,
      command: ({ editor, range }: { editor: Editor; range: Range }) => {
        editor.chain().focus().deleteRange(range).toggleBulletList().run();
      },
    },
    {
      title: 'Numbered List',
      description: 'Create a list with numbering.',
      searchTerms: ['ordered', 'ol'],
      icon: <ListOrdered size={18} />,
      command: ({ editor, range }: { editor: Editor; range: Range }) => {
        editor.chain().focus().deleteRange(range).toggleOrderedList().run();
      },
    },
    {
      title: 'To-do List',
      description: 'Track tasks with a to-do list.',
      searchTerms: ['todo', 'task', 'list', 'check', 'checkbox'],
      icon: <CheckSquare size={18} />,
      command: ({ editor, range }: { editor: Editor; range: Range }) => {
        editor.chain().focus().deleteRange(range).toggleTaskList().run();
      },
    },
    {
      title: 'Quote',
      description: 'Capture a quote.',
      searchTerms: ['blockquote', 'citation'],
      icon: <Quote size={18} />,
      command: ({ editor, range }: { editor: Editor; range: Range }) => {
        editor.chain().focus().deleteRange(range).toggleBlockquote().run();
      },
    },
    {
      title: 'Code',
      description: 'Capture a code snippet.',
      searchTerms: ['codeblock', 'pre'],
      icon: <Code size={18} />,
      command: ({ editor, range }: { editor: Editor; range: Range }) => {
        editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
      },
    },
    {
      title: 'Divider',
      description: 'Visually divide blocks.',
      searchTerms: ['horizontal', 'rule', 'hr', 'separator'],
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
    <div className="novel-notes-tab">
      {/* Header with status and actions */}
      <div className="flex justify-between items-center mb-4">
        <div className="notes-header">
          <span className="text-lg font-medium">📝 Notes</span>
          {status && (
            <span className={`ml-2 text-sm ${
              status.includes('Saved') ? 'text-green-600' : 
              status.includes('Failed') ? 'text-red-600' : 
              'text-blue-600'
            }`}>
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

      {/* Novel Editor */}
      <div className="novel-editor-container border border-gray-300 rounded-lg p-4 min-h-[400px]">
        <EditorRoot>
          <EditorContent
            initialContent={content}
            onUpdate={({ editor }) => {
              const json = editor.getJSON();
              handleContentChange(json);
            }}
            extensions={[
              StarterKit.configure({
                bulletList: {
                  HTMLAttributes: {
                    class: 'my-custom-bullet-list',
                  },
                },
                orderedList: {
                  HTMLAttributes: {
                    class: 'my-custom-ordered-list',
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
              }),
              UpdatedImage.configure({
                HTMLAttributes: {
                  class: 'rounded-lg border border-muted',
                },
              }),
              HorizontalRule.configure({
                HTMLAttributes: {
                  class: 'mt-4 mb-6 border-t border-muted-foreground/20',
                },
              }),
              Command.configure({
                suggestion: {
                  items: () => suggestionItems,
                  render: renderItems,
                },
              }),
              Placeholder.configure({
                placeholder: "Type '/' for commands...",
              }),
            ]}
            className="novel-editor"
            editorProps={{
              attributes: {
                class: 'prose prose-lg dark:prose-invert prose-headings:font-title font-default focus:outline-none max-w-full',
              },
            }}
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
              <EditorBubbleItem
                onSelect={(editor) => {
                  editor.chain().focus().toggleItalic().run();
                }}
                className="p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 4l4 16M6 8h12M4 16h12" />
                </svg>
              </EditorBubbleItem>
              <EditorBubbleItem
                onSelect={(editor) => {
                  editor.chain().focus().toggleUnderline().run();
                }}
                className="p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a4 4 0 014 4v4a4 4 0 01-8 0V6a4 4 0 014 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 18h8" />
                </svg>
              </EditorBubbleItem>
            </EditorBubble>
          </EditorContent>
        </EditorRoot>
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
    </div>
  );
};

export default NovelNotesTab;