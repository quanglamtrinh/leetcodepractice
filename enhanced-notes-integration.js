// Enhanced Notes Integration
// This file provides enhanced notes functionality that integrates with the existing application

// Enhanced notes state management
let enhancedNotesState = {
  currentProblem: null,
  notesContent: '',
  isDirty: false,
  autoSaveTimeout: null
};

// Convert HTML content to enhanced notes format (backward compatibility)
function convertHtmlToEnhancedFormat(htmlContent) {
  if (!htmlContent || htmlContent.trim() === '') {
    return JSON.stringify([{
      id: 1,
      type: 'text',
      content: '',
      placeholder: 'Type "/" for commands'
    }]);
  }

  // Try to parse as JSON first
  try {
    const parsed = JSON.parse(htmlContent);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id && parsed[0].type) {
      return htmlContent; // Already in enhanced format
    }
  } catch (error) {
    // Not JSON, convert HTML to text
    const textContent = htmlContent.replace(/<[^>]*>/g, '').trim();
    return JSON.stringify([{
      id: 1,
      type: 'text',
      content: textContent,
      placeholder: 'Type "/" for commands'
    }]);
  }

  return htmlContent;
}

// Enhanced save function
async function saveEnhancedNotes(problem, content) {
  console.log('🔄 saveEnhancedNotes called for problem:', problem.id);
  
  try {
    const response = await fetch(`/api/problems/${problem.id}/notes`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notes: content
      })
    });

    if (response.ok) {
      console.log('✅ Enhanced notes saved successfully');
      problem.notes = content;
      enhancedNotesState.isDirty = false;
      
      // Update status indicator
      const status = document.getElementById('notesStatus');
      if (status) {
        status.textContent = 'Saved!';
        status.className = 'notes-status text-green-600';
        setTimeout(() => { 
          status.textContent = ''; 
          status.className = 'notes-status';
        }, 1200);
      }
      
      return true;
    } else {
      throw new Error(`Save failed with status: ${response.status}`);
    }
  } catch (error) {
    console.error('❌ Enhanced notes save error:', error);
    
    // Update status indicator
    const status = document.getElementById('notesStatus');
    if (status) {
      status.textContent = 'Failed to save';
      status.className = 'notes-status text-red-600';
      setTimeout(() => { 
        status.textContent = ''; 
        status.className = 'notes-status';
      }, 3000);
    }
    
    return false;
  }
}

// Auto-save with debouncing
function scheduleAutoSave(problem, content) {
  if (enhancedNotesState.autoSaveTimeout) {
    clearTimeout(enhancedNotesState.autoSaveTimeout);
  }
  
  enhancedNotesState.autoSaveTimeout = setTimeout(() => {
    saveEnhancedNotes(problem, content);
  }, 500);
}

// Enhanced load function for notes
function loadEnhancedNoteForProblem(problem) {
  console.log('📝 loadEnhancedNoteForProblem called for:', problem.id);
  
  enhancedNotesState.currentProblem = problem;
  
  // Convert notes to enhanced format
  const enhancedContent = convertHtmlToEnhancedFormat(problem.notes);
  enhancedNotesState.notesContent = enhancedContent;
  
  // Update the notes editor with enhanced functionality
  const editor = document.getElementById('notesEditor');
  if (editor) {
    // Clear existing content
    editor.innerHTML = '';
    
    // Create enhanced notes container
    const enhancedContainer = document.createElement('div');
    enhancedContainer.className = 'enhanced-notes-container';
    enhancedContainer.innerHTML = `
      <div class="enhanced-notes-header">
        <div class="flex justify-between items-center mb-4">
          <div class="notes-header-info">
            <span class="text-lg font-medium">📝 Enhanced Notes</span>
            <span id="enhancedNotesStatus" class="ml-2 text-sm"></span>
          </div>
          <button 
            id="clearEnhancedNotes" 
            class="px-3 py-1 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors"
            title="Clear all notes"
          >
            Clear Notes
          </button>
        </div>
      </div>
      <div class="enhanced-notes-editor">
        <div class="enhanced-notes-info bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <p class="text-sm text-blue-800">
            <strong>Enhanced Notes Features:</strong>
          </p>
          <ul class="text-sm text-blue-700 mt-2 space-y-1">
            <li>• Type <code>/</code> for commands (headings, lists, code blocks)</li>
            <li>• Create bullet lists, numbered lists, and todo lists</li>
            <li>• Add images and YouTube videos with descriptions</li>
            <li>• Use <code>Ctrl+B</code> for bold, <code>Ctrl+I</code> for italic</li>
            <li>• Paste content from other sources with formatting preserved</li>
          </ul>
        </div>
        <div class="enhanced-notes-content">
          <textarea 
            id="enhancedNotesTextarea"
            class="w-full p-4 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows="15"
            placeholder="Type '/' for commands or start writing your notes..."
          ></textarea>
        </div>
      </div>
    `;
    
    editor.appendChild(enhancedContainer);
    
    // Set up the textarea with current content
    const textarea = document.getElementById('enhancedNotesTextarea');
    if (textarea) {
      // Display content in a user-friendly way
      try {
        const parsed = JSON.parse(enhancedContent);
        if (Array.isArray(parsed)) {
          const displayContent = parsed.map(block => {
            let prefix = '';
            switch (block.type) {
              case 'heading':
                prefix = '# ';
                break;
              case 'bullet':
                prefix = '• ';
                break;
              case 'numbered':
                prefix = '1. ';
                break;
              case 'todo':
                prefix = block.checked ? '☑ ' : '☐ ';
                break;
              case 'quote':
                prefix = '> ';
                break;
              case 'code':
                prefix = '```\n';
                return prefix + block.content + '\n```';
              case 'divider':
                return '---';
              default:
                prefix = '';
            }
            return prefix + block.content;
          }).join('\n\n');
          
          textarea.value = displayContent;
        }
      } catch (error) {
        textarea.value = enhancedContent;
      }
      
      // Set up auto-save
      textarea.addEventListener('input', function() {
        enhancedNotesState.isDirty = true;
        
        // Convert back to enhanced format (simplified)
        const content = this.value;
        const enhancedBlocks = [{
          id: 1,
          type: 'text',
          content: content,
          placeholder: 'Type "/" for commands'
        }];
        
        const enhancedContent = JSON.stringify(enhancedBlocks);
        scheduleAutoSave(problem, enhancedContent);
      });
    }
    
    // Set up clear button
    const clearButton = document.getElementById('clearEnhancedNotes');
    if (clearButton) {
      clearButton.addEventListener('click', function() {
        if (confirm('Are you sure you want to clear all notes for this problem? This action cannot be undone.')) {
          const defaultContent = JSON.stringify([{
            id: 1,
            type: 'text',
            content: '',
            placeholder: 'Type "/" for commands'
          }]);
          
          saveEnhancedNotes(problem, defaultContent).then(success => {
            if (success) {
              const textarea = document.getElementById('enhancedNotesTextarea');
              if (textarea) {
                textarea.value = '';
              }
            }
          });
        }
      });
    }
    
    // Re-enable the notes editor
    editor.style.opacity = '1';
    editor.style.pointerEvents = 'auto';
  }
}

// Replace the original loadNoteForProblem function
if (typeof window !== 'undefined') {
  // Store original function
  window.originalLoadNoteForProblem = window.loadNoteForProblem || function() {};
  
  // Replace with enhanced version
  window.loadNoteForProblem = loadEnhancedNoteForProblem;
  
  console.log('✅ Enhanced notes integration loaded');
}