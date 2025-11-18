import React from 'react';
import { createRoot } from 'react-dom/client';
import NovelNotesTab from '../components/NovelNotesTab';

// Global variable to store the current React root
let notesTabRoot = null;
let currentProblem = null;

// Function to mount the novel notes tab
export function mountNovelNotesTab(problem, containerId = 'notes-tab') {
  console.log('🚀 Mounting NovelNotesTab for problem:', problem.id);
  
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
    
    // Call the existing onNotesSaved callback if it exists
    if (window.onNotesSaved && typeof window.onNotesSaved === 'function') {
      window.onNotesSaved(problemId, notes);
    }
  };

  // Create or reuse React root
  if (!notesTabRoot) {
    notesTabRoot = createRoot(container);
  }

  // Render the novel notes tab
  notesTabRoot.render(
    React.createElement(NovelNotesTab, {
      problem: problem,
      onNotesSaved: handleNotesSaved,
      className: 'novel-notes-integration'
    })
  );
}

// Function to unmount the novel notes tab
export function unmountNovelNotesTab() {
  if (notesTabRoot) {
    notesTabRoot.unmount();
    notesTabRoot = null;
  }
  currentProblem = null;
}

// Function to update the problem data
export function updateNovelNotesTabProblem(problem) {
  if (notesTabRoot && problem) {
    console.log('🔄 Updating NovelNotesTab problem:', problem.id);
    currentProblem = problem;
    
    const handleNotesSaved = (problemId, notes) => {
      console.log('📝 Notes saved callback:', problemId, notes);
      if (window.currentProblem && window.currentProblem.id === problemId) {
        window.currentProblem.notes = notes;
      }
      
      // Call the existing onNotesSaved callback if it exists
      if (window.onNotesSaved && typeof window.onNotesSaved === 'function') {
        window.onNotesSaved(problemId, notes);
      }
    };

    notesTabRoot.render(
      React.createElement(NovelNotesTab, {
        problem: problem,
        onNotesSaved: handleNotesSaved,
        className: 'novel-notes-integration'
      })
    );
  }
}

// Make functions available globally for script.js integration
window.mountNovelNotesTab = mountNovelNotesTab;
window.unmountNovelNotesTab = unmountNovelNotesTab;
window.updateNovelNotesTabProblem = updateNovelNotesTabProblem;

// Also provide backward compatibility with enhanced notes naming
window.mountEnhancedNotesTab = mountNovelNotesTab;
window.unmountEnhancedNotesTab = unmountNovelNotesTab;
window.updateEnhancedNotesTabProblem = updateNovelNotesTabProblem;