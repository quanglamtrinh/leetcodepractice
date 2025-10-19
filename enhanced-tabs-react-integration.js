// Enhanced Tabs React Integration
// This file provides React-based enhanced notes and solution functionality

(function() {
  'use strict';

  // Check if React is available
  if (typeof React === 'undefined' || typeof ReactDOM === 'undefined') {
    console.error('❌ React or ReactDOM not found. Enhanced tabs will not work.');
    return;
  }

  console.log('🚀 Enhanced Tabs React Integration loading...');

  // Create React components inline for integration
  const { useState, useEffect, useCallback } = React;
  const { createRoot } = ReactDOM;

  // Simple Enhanced Solution Tab Component
  const EnhancedSolutionTab = ({ problem, onSolutionSaved }) => {
    const [solutionContent, setSolutionContent] = useState('');
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
    const saveSolution = useCallback(async (content) => {
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
    const handleContentChange = useCallback((content) => {
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

    // Simple textarea-based editor for now (will be enhanced later)
    const handleTextareaChange = useCallback((e) => {
      const content = e.target.value;
      const enhancedContent = JSON.stringify([{
        id: 1,
        type: 'text',
        content: content,
        placeholder: 'Type "/" for commands'
      }]);
      setSolutionContent(enhancedContent);
      
      // Auto-save with debouncing
      clearTimeout(window.solutionAutoSaveTimeout);
      window.solutionAutoSaveTimeout = setTimeout(() => {
        saveSolution(enhancedContent);
      }, 500);
    }, [saveSolution]);

    // Get display content for textarea
    const getDisplayContent = () => {
      try {
        const parsed = JSON.parse(solutionContent);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(block => block.content || '').join('\n\n');
        }
      } catch (error) {
        return solutionContent;
      }
      return '';
    };

    return React.createElement('div', { className: 'enhanced-solution-tab' },
      // Header with status and actions
      React.createElement('div', { className: 'flex justify-between items-center mb-4' },
        React.createElement('div', { className: 'solution-header' },
          React.createElement('span', null, '💻 Enhanced Solution'),
          status && React.createElement('span', { 
            className: `ml-2 text-sm ${
              status.includes('Saved') ? 'text-green-600' : 
              status.includes('Failed') ? 'text-red-600' : 
              'text-blue-600'
            }`
          }, status)
        ),
        
        React.createElement('button', {
          onClick: () => setShowClearConfirm(true),
          className: 'flex items-center gap-2 px-3 py-2 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors',
          title: 'Clear all solution content'
        },
          React.createElement('svg', { 
            className: 'w-4 h-4', 
            fill: 'none', 
            stroke: 'currentColor', 
            viewBox: '0 0 24 24' 
          },
            React.createElement('path', { 
              strokeLinecap: 'round', 
              strokeLinejoin: 'round', 
              strokeWidth: 2, 
              d: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' 
            })
          ),
          'Clear Solution'
        )
      ),

      // Enhanced Solution Info
      React.createElement('div', { className: 'enhanced-solution-info bg-green-50 border border-green-200 rounded-lg p-3 mb-4' },
        React.createElement('p', { className: 'text-sm text-green-800' },
          React.createElement('strong', null, 'Enhanced Solution Features:')
        ),
        React.createElement('ul', { className: 'text-sm text-green-700 mt-2 space-y-1' },
          React.createElement('li', null, '• Rich text editing with formatting support'),
          React.createElement('li', null, '• Auto-save functionality'),
          React.createElement('li', null, '• Backward compatibility with existing solutions'),
          React.createElement('li', null, '• Independent from notes tab')
        )
      ),

      // Simple textarea editor (placeholder for full rich text editor)
      React.createElement('div', { className: 'enhanced-solution-content' },
        React.createElement('textarea', {
          className: 'w-full p-4 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent',
          rows: 15,
          placeholder: 'Write your solution here... (Enhanced editor coming soon)',
          value: getDisplayContent(),
          onChange: handleTextareaChange
        })
      ),

      // Clear Confirmation Dialog
      showClearConfirm && React.createElement('div', { className: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50' },
        React.createElement('div', { className: 'bg-white rounded-lg p-6 max-w-md w-full mx-4' },
          React.createElement('div', { className: 'flex items-center mb-4' },
            React.createElement('div', { className: 'flex-shrink-0' },
              React.createElement('svg', { 
                className: 'w-8 h-8 text-red-600', 
                fill: 'none', 
                stroke: 'currentColor', 
                viewBox: '0 0 24 24' 
              },
                React.createElement('path', { 
                  strokeLinecap: 'round', 
                  strokeLinejoin: 'round', 
                  strokeWidth: 2, 
                  d: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z' 
                })
              )
            ),
            React.createElement('div', { className: 'ml-3' },
              React.createElement('h3', { className: 'text-lg font-medium text-gray-900' }, 'Clear Solution'),
              React.createElement('p', { className: 'text-sm text-gray-500 mt-1' },
                'Are you sure you want to clear all solution content for this problem? This action cannot be undone.'
              )
            )
          ),
          React.createElement('div', { className: 'flex justify-end gap-3' },
            React.createElement('button', {
              onClick: () => setShowClearConfirm(false),
              className: 'px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors'
            }, 'Cancel'),
            React.createElement('button', {
              onClick: handleClearConfirm,
              className: 'px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors'
            }, 'Clear Solution')
          )
        )
      )
    );
  };

  // Global variables to store the current React roots and problems
  let solutionTabRoot = null;
  let currentSolutionProblem = null;

  // Function to mount the enhanced solution tab
  function mountEnhancedSolutionTab(problem, containerId = 'solution-tab') {
    console.log('🚀 Mounting EnhancedSolutionTab for problem:', problem.id);
    
    const container = document.getElementById(containerId);
    if (!container) {
      console.error('❌ Container not found:', containerId);
      return;
    }

    // Store current problem reference
    currentSolutionProblem = problem;

    // Callback for when solution is saved
    const handleSolutionSaved = (problemId, solution) => {
      console.log('💻 Solution saved callback:', problemId, solution);
      // Update the global problem object if it exists
      if (window.currentProblem && window.currentProblem.id === problemId) {
        window.currentProblem.solution = solution;
      }
    };

    // Create or reuse React root
    if (!solutionTabRoot) {
      solutionTabRoot = createRoot(container);
    }

    // Render the enhanced solution tab
    solutionTabRoot.render(
      React.createElement(EnhancedSolutionTab, {
        problem: problem,
        onSolutionSaved: handleSolutionSaved
      })
    );
  }

  // Function to unmount the enhanced solution tab
  function unmountEnhancedSolutionTab() {
    if (solutionTabRoot) {
      solutionTabRoot.unmount();
      solutionTabRoot = null;
    }
    currentSolutionProblem = null;
  }

  // Function to update the problem data
  function updateEnhancedSolutionTabProblem(problem) {
    if (solutionTabRoot && problem) {
      console.log('🔄 Updating EnhancedSolutionTab problem:', problem.id);
      currentSolutionProblem = problem;
      
      const handleSolutionSaved = (problemId, solution) => {
        console.log('💻 Solution saved callback:', problemId, solution);
        if (window.currentProblem && window.currentProblem.id === problemId) {
          window.currentProblem.solution = solution;
        }
      };

      solutionTabRoot.render(
        React.createElement(EnhancedSolutionTab, {
          problem: problem,
          onSolutionSaved: handleSolutionSaved
        })
      );
    }
  }

  // Make functions available globally for script.js integration
  window.mountEnhancedSolutionTab = mountEnhancedSolutionTab;
  window.unmountEnhancedSolutionTab = unmountEnhancedSolutionTab;
  window.updateEnhancedSolutionTabProblem = updateEnhancedSolutionTabProblem;

  console.log('✅ Enhanced Tabs React Integration loaded successfully');

})();