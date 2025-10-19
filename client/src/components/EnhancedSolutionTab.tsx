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

interface EnhancedSolutionTabProps {
  problem: Problem;
  onSolutionSaved?: (problemId: number, solution: string) => void;
}

const EnhancedSolutionTab: React.FC<EnhancedSolutionTabProps> = ({ problem, onSolutionSaved }) => {
  const [solutionContent, setSolutionContent] = useState<string>('');
  const [status, setStatus] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Load solution from problem object when problem ID changes
  useEffect(() => {
    console.log('💻 EnhancedSolutionTab: Problem changed, ID:', problem.id, 'Title:', problem.title);
    console.log('💻 EnhancedSolutionTab: Raw solution data:', problem.solution);
    
    if (problem.solution) {
      // Handle both old HTML format and new JSON format
      try {
        // Try to parse as JSON first (new format)
        const parsed = JSON.parse(problem.solution);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id && parsed[0].type) {
          console.log('✅ EnhancedSolutionTab: Loading JSON solution:', parsed);
          setSolutionContent(problem.solution);
          return;
        }
      } catch (error) {
        // If JSON parsing fails, treat as HTML content (backward compatibility)
        console.log('💻 EnhancedSolutionTab: Loading HTML solution as backward compatibility');
        // Convert HTML to a simple text block for backward compatibility
        const htmlContent = problem.solution.replace(/<[^>]*>/g, '').trim();
        if (htmlContent) {
          const defaultBlock = JSON.stringify([{
            id: 1,
            type: 'text',
            content: htmlContent,
            placeholder: 'Type "/" for commands'
          }]);
          setSolutionContent(defaultBlock);
          return;
        }
      }
    }
    
    console.log('💻 EnhancedSolutionTab: Using default empty content');
    const defaultContent = JSON.stringify([{
      id: 1,
      type: 'text',
      content: '',
      placeholder: 'Type "/" for commands'
    }]);
    setSolutionContent(defaultContent);
  }, [problem.id]);

  // Save solution to backend
  const saveSolution = useCallback(async (content: string) => {
    console.log('🔄 saveSolution called with content:', content);
    setStatus('Saving...');
    try {
      console.log('📤 Sending request to save solution:', content);
      const response = await fetch(`/api/problems/${problem.id}/solution`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          solution: content
        })
      });
      console.log('📥 Response status:', response.status);
      if (response.ok) {
        setStatus('Saved!');
        setTimeout(() => setStatus(''), 1200);
        // Update the problem object to reflect the saved state
        problem.solution = content;
        onSolutionSaved?.(problem.id, content);
        console.log('✅ Solution saved successfully');
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
  }, [problem.id, onSolutionSaved]);

  // Handle content changes from the editor
  const handleContentChange = useCallback((content: string) => {
    setSolutionContent(content);
  }, []);

  const clearSolution = useCallback(async () => {
    try {
      setStatus('Clearing...');
      const defaultContent = JSON.stringify([{
        id: 1,
        type: 'text',
        content: '',
        placeholder: 'Type "/" for commands'
      }]);
      
      const response = await fetch(`/api/problems/${problem.id}/solution`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          solution: defaultContent
        })
      });
      
      if (response.ok) {
        setStatus('Cleared!');
        setTimeout(() => setStatus(''), 1200);
        setSolutionContent(defaultContent);
        onSolutionSaved?.(problem.id, defaultContent);
        console.log('✅ Solution cleared successfully');
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
  }, [problem.id, onSolutionSaved]);

  const handleClearConfirm = useCallback(() => {
    clearSolution();
    setShowClearConfirm(false);
  }, [clearSolution]);

  return (
    <div className="enhanced-solution-tab">
      {/* Header with status and actions */}
      <div className="flex justify-between items-center mb-4">
        <div className="solution-header">
          <span>💻 Solution</span>
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
          title="Clear all solution content"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Clear Solution
        </button>
      </div>

      {/* Enhanced Rich Text Editor */}
      <div className="shared-rich-text-editor">
        <SharedRichTextEditor
          value={solutionContent}
          onChange={handleContentChange}
          placeholder="Type '/' for commands"
          className="min-h-[400px]"
          onSave={saveSolution}
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
                <h3 className="text-lg font-medium text-gray-900">Clear Solution</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Are you sure you want to clear all solution content for this problem? This action cannot be undone.
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
                Clear Solution
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedSolutionTab;