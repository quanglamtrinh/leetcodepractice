// Enhanced Notes React Integration
// This file provides React-based enhanced notes functionality

(function() {
  'use strict';

  // Check if React is available
  if (typeof React === 'undefined' || typeof ReactDOM === 'undefined') {
    console.error('❌ React or ReactDOM not found. Enhanced notes will not work.');
    return;
  }

  console.log('🚀 Enhanced Notes React Integration loading...');

  // Create React components inline for integration
  const { useState, useEffect, useCallback } = React;
  const { createRoot } = ReactDOM;

  // Problem interface (matches the existing structure)
  // interface Problem {
  //   id: number;
  //   title: string;
  //   notes?: string;
  //   solution?: string;
  //   solved?: boolean;
  //   difficulty?: string;
  //   concept?: string;
  //   leetcode_link?: string;
  // }

  // Simple Enhanced Notes Tab Component
  const EnhancedNotesTab = ({ problem, onNotesSaved }) => {
    const [notesContent, setNotesContent] = useState('');
    const [status, setStatus] = useState('');
    const [showClearConfirm, setShowClearConfirm] = useState(false);

    // Load notes from problem object when problem ID changes
    useEffect(() => {
      console.log('📝 EnhancedNotesTab: Problem changed, ID:', problem.id, 'Title:', problem.title);
      console.log('📝 EnhancedNotesTab: Raw notes data:', problem.notes);
      
      let contentToLoad = '';
      
      if (problem.notes) {
        // Handle both old HTML format and new JSON format
        try {
          // Try to parse as JSON first (new format)
          const parsed = JSON.parse(problem.notes);
          if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id && parsed[0].type) {
            console.log('✅ EnhancedNotesTab: Loading JSON notes:', parsed);
            contentToLoad = problem.notes;
          } else {
            throw new Error('Not enhanced format');
          }
        } catch (error) {
          // If JSON parsing fails, treat as HTML content (backward compatibility)
          console.log('📝 EnhancedNotesTab: Loading HTML notes as backward compatibility');
          // Convert HTML to a simple text block for backward compatibility
          const htmlContent = problem.notes.replace(/<[^>]*>/g, '').trim();
          if (htmlContent) {
            contentToLoad = JSON.stringify([{
              id: 1,
              type: 'text',
              content: htmlContent,
              placeholder: 'Type "/" for commands'
            }]);
          }
        }
      }
      
      if (!contentToLoad) {
        console.log('📝 EnhancedNotesTab: Using default empty content');
        contentToLoad = JSON.stringify([{
          id: 1,
          type: 'text',
          content: '',
          placeholder: 'Type "/" for commands'
        }]);
      }
      
      setNotesContent(contentToLoad);
      
      // Initialize the standalone editor after React renders
      setTimeout(() => {
        console.log('🔧 Initializing standalone editor...');
        const container = document.getElementById('enhanced-notes-editor-container');
        if (!container) {
          console.error('❌ Container not found: enhanced-notes-editor-container');
          return;
        }
        
        if (window.initEnhancedNotesEditor) {
          console.log('✅ initEnhancedNotesEditor found, initializing...');
          window.initEnhancedNotesEditor('enhanced-notes-editor-container');
          
          // Load content after initialization
          setTimeout(() => {
            if (window.loadEnhancedNotes) {
              console.log('✅ loadEnhancedNotes found, loading content:', contentToLoad);
              window.loadEnhancedNotes(contentToLoad);
            } else {
              console.error('❌ loadEnhancedNotes not found');
            }
          }, 50);
        } else {
          console.error('❌ initEnhancedNotesEditor not found');
        }
      }, 200);
      
    }, [problem.id]);

    // Save notes to backend
    const saveNotes = useCallback(async (content) => {
      // If no content provided, get it from the standalone editor
      if (!content && window.getEnhancedNotes) {
        content = window.getEnhancedNotes();
      }
      
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
          // Update the problem object to reflect the saved state
          problem.notes = content;
          setNotesContent(content);
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
          
          // Clear the standalone editor
          if (window.loadEnhancedNotes) {
            window.loadEnhancedNotes(defaultContent);
          }
          
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

    // Set up global auto-save function
    React.useEffect(() => {
      window.saveEnhancedNotes = () => saveNotes();
      return () => {
        window.saveEnhancedNotes = null;
      };
    }, [saveNotes]);

    // Initialize standalone editor when component mounts
    React.useEffect(() => {
      const timer = setTimeout(() => {
        console.log('🔧 React useEffect: Initializing standalone editor...');
        const container = document.getElementById('enhanced-notes-editor-container');
        if (container && window.initEnhancedNotesEditor) {
          console.log('✅ React useEffect: Container and function found, initializing...');
          window.initEnhancedNotesEditor('enhanced-notes-editor-container');
          
          if (notesContent && window.loadEnhancedNotes) {
            setTimeout(() => {
              console.log('✅ React useEffect: Loading content:', notesContent);
              window.loadEnhancedNotes(notesContent);
            }, 50);
          }
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }, []); // Only run once when component mounts

    return React.createElement('div', { className: 'enhanced-notes-tab' },
      // Header with status and actions
      React.createElement('div', { className: 'flex justify-between items-center mb-4' },
        React.createElement('div', { className: 'notes-header' },
          React.createElement('span', null, '📝 Enhanced Notes'),
          status && React.createElement('span', { 
            className: `ml-2 text-sm ${
              status.includes('Saved') ? 'text-green-600' : 
              status.includes('Failed') ? 'text-red-600' : 
              'text-blue-600'
            }`
          }, status)
        ),
        
        React.createElement('div', { className: 'flex gap-2' },
          React.createElement('button', {
            onClick: () => saveNotes(),
            className: 'flex items-center gap-2 px-3 py-2 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors',
            title: 'Save notes manually'
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
                d: 'M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12' 
              })
            ),
            'Save'
          ),
          React.createElement('button', {
            onClick: () => setShowClearConfirm(true),
            className: 'flex items-center gap-2 px-3 py-2 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors',
            title: 'Clear all notes'
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
            'Clear Notes'
          )
        )
      ),

      // Enhanced Notes Info
      React.createElement('div', { className: 'enhanced-notes-info bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4' },
        React.createElement('p', { className: 'text-sm text-blue-800' },
          React.createElement('strong', null, 'Enhanced Notes Features:')
        ),
        React.createElement('ul', { className: 'text-sm text-blue-700 mt-2 space-y-1' },
          React.createElement('li', null, '• Type "/" for commands (heading, bullet, numbered, todo, code, quote, divider)'),
          React.createElement('li', null, '• Press Enter to create new blocks'),
          React.createElement('li', null, '• Auto-save functionality'),
          React.createElement('li', null, '• Backward compatibility with existing notes')
        )
      ),

      // Enhanced Notes Editor Container
      React.createElement('div', { 
        id: 'enhanced-notes-editor-container',
        className: 'enhanced-notes-content border border-gray-300 rounded-lg p-4 min-h-[400px]'
      }),

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
              React.createElement('h3', { className: 'text-lg font-medium text-gray-900' }, 'Clear Notes'),
              React.createElement('p', { className: 'text-sm text-gray-500 mt-1' },
                'Are you sure you want to clear all notes for this problem? This action cannot be undone.'
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
            }, 'Clear Notes')
          )
        )
      )
    );
  };

  // Global variables to store the current React root and problem
  let notesTabRoot = null;
  let currentProblem = null;

  // Function to mount the enhanced notes tab
  function mountEnhancedNotesTab(problem, containerId = 'notes-tab') {
    console.log('🚀 Mounting EnhancedNotesTab for problem:', problem.id);
    
    const container = document.getElementById(containerId);
    if (!container) {
      console.error('❌ Container not found:', containerId);
      return;
    }

    // Store current problem reference
    currentProblem = problem;

    // Callback for when notes are saved
    const handleNotesSaved = (problemId, notes) => {
      console.log('📝 Notes saved callback:', problemId, notes);
      // Update the global problem object if it exists
      if (window.currentProblem && window.currentProblem.id === problemId) {
        window.currentProblem.notes = notes;
      }
    };

    // Create or reuse React root
    if (!notesTabRoot) {
      notesTabRoot = createRoot(container);
    }

    // Render the enhanced notes tab
    notesTabRoot.render(
      React.createElement(EnhancedNotesTab, {
        problem: problem,
        onNotesSaved: handleNotesSaved
      })
    );
  }

  // Function to unmount the enhanced notes tab
  function unmountEnhancedNotesTab() {
    if (notesTabRoot) {
      notesTabRoot.unmount();
      notesTabRoot = null;
    }
    currentProblem = null;
  }

  // Function to update the problem data
  function updateEnhancedNotesTabProblem(problem) {
    if (notesTabRoot && problem) {
      console.log('🔄 Updating EnhancedNotesTab problem:', problem.id);
      currentProblem = problem;
      
      const handleNotesSaved = (problemId, notes) => {
        console.log('📝 Notes saved callback:', problemId, notes);
        if (window.currentProblem && window.currentProblem.id === problemId) {
          window.currentProblem.notes = notes;
        }
      };

      notesTabRoot.render(
        React.createElement(EnhancedNotesTab, {
          problem: problem,
          onNotesSaved: handleNotesSaved
        })
      );
    }
  }

  // Make functions available globally for script.js integration
  window.mountEnhancedNotesTab = mountEnhancedNotesTab;
  window.unmountEnhancedNotesTab = unmountEnhancedNotesTab;
  window.updateEnhancedNotesTabProblem = updateEnhancedNotesTabProblem;

  console.log('✅ Enhanced Notes React Integration loaded successfully');

})();