import React, { useState, useEffect, useCallback } from 'react';
import SharedRichTextEditor from './SharedRichTextEditor';

// Define Problem interface locally since we can't import from ProblemList
interface Problem {
  id: number;
  title: string;
  notes?: string;
  solution?: string;
  solved?: boolean;
  difficulty?: string;
  concept?: string;
  leetcode_link?: string;
}

interface EnhancedNotesTabProps {
  problem: Problem;
  onNotesSaved?: (problemId: number, notes: string) => void;
}

const EnhancedNotesTab: React.FC<EnhancedNotesTabProps> = ({ problem, onNotesSaved }) => {
  const [notesContent, setNotesContent] = useState<string>('');
  const [status, setStatus] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Track the last loaded problem ID to prevent unnecessary reloads
  const [lastLoadedProblemId, setLastLoadedProblemId] = useState<number | null>(null);

  // Load notes from problem object when problem ID changes
  useEffect(() => {
    // Only reload if the problem ID actually changed
    if (problem.id === lastLoadedProblemId) {
      return;
    }

    console.log('📝 EnhancedNotesTab: Problem changed, ID:', problem.id, 'Title:', problem.title);
    console.log('📝 EnhancedNotesTab: Raw notes data:', problem.notes);
    
    setLastLoadedProblemId(problem.id);
    
    if (problem.notes) {
      // Handle both old HTML format and new JSON format
      try {
        // Try to parse as JSON first (new format)
        const parsed = JSON.parse(problem.notes);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id && parsed[0].type) {
          console.log('✅ EnhancedNotesTab: Loading JSON notes:', parsed);
          setNotesContent(problem.notes);
          return;
        }
      } catch (error) {
        // If JSON parsing fails, treat as HTML content (backward compatibility)
        console.log('📝 EnhancedNotesTab: Loading HTML notes as backward compatibility');
        // Convert HTML to a simple text block for backward compatibility
        const htmlContent = problem.notes.replace(/<[^>]*>/g, '').trim();
        if (htmlContent) {
          const defaultBlock = JSON.stringify([{
            id: 1,
            type: 'text',
            content: htmlContent,
            placeholder: 'Type "/" for commands'
          }]);
          setNotesContent(defaultBlock);
          return;
        }
      }
    }
    
    console.log('📝 EnhancedNotesTab: Using default empty content');
    const defaultContent = JSON.stringify([{
      id: 1,
      type: 'text',
      content: '',
      placeholder: 'Type "/" for commands'
    }]);
    setNotesContent(defaultContent);
  }, [problem.id, lastLoadedProblemId]);

  // Save notes to backend
  const saveNotes = useCallback(async (content: string) => {
    console.log('🔄 saveNotes called with content:', content);
    setStatus('Saving...');
    try {
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
        // Notify parent component about the save (don't mutate the problem object directly)
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
  }, [problem.id, onNotesSaved]);

  // Handle content changes from the editor
  const handleContentChange = useCallback((content: string) => {
    setNotesContent(content);
  }, []);

  const clearNotes = useCallback(async () => {
    try {
      setStatus('Clearing...');
      const defaultContent = JSON.stringify([{
        id: 1,
        type: 'text',
        content: '',
        placeholder: 'Type "/" for commands'
      }]);
      
      const response = await fetch(`/api/problems/${problem.id}/notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: defaultContent
        })
      });
      
      if (response.ok) {
        setStatus('Cleared!');
        setTimeout(() => setStatus(''), 1200);
        setNotesContent(defaultContent);
        onNotesSaved?.(problem.id, defaultContent);
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

  return (
    <div className="enhanced-notes-tab">
      {/* Header with status and actions */}
      <div className="flex justify-between items-center mb-4">
        <div className="notes-header">
          <span>📝 Notes</span>
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

      {/* Enhanced Rich Text Editor */}
      <div className="shared-rich-text-editor">
        <SharedRichTextEditor
          value={notesContent}
          onChange={handleContentChange}
          placeholder="Type '/' for commands"
          className="min-h-[400px]"
          onSave={saveNotes}
          autoSave={true}
          autoSaveDelay={500}
        />
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

export default EnhancedNotesTab;