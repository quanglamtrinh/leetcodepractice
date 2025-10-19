import React from 'react';
import { createRoot } from 'react-dom/client';
import EnhancedNotesTab from '../components/EnhancedNotesTab';

// Global variable to store the current React root
let notesTabRoot = null;
let currentProblem = null;

// Function to mount the enhanced notes tab
export function mountEnhancedNotesTab(problem, containerId = 'notes-tab') {
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
export function unmountEnhancedNotesTab() {
  if (notesTabRoot) {
    notesTabRoot.unmount();
    notesTabRoot = null;
  }
  currentProblem = null;
}

// Function to update the problem data
export function updateEnhancedNotesTabProblem(problem) {
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