import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import NovelNotesTab from '../components/NovelNotesTab';
import { Problem } from '../components/ProblemList';

interface WindowWithGlobals extends Window {
  currentProblem?: Problem;
  onNotesSaved?: (problemId: number, notes: string) => void;
  mountNovelNotesTab?: (problem: Problem, containerId?: string) => void;
  unmountNovelNotesTab?: () => void;
  updateNovelNotesTabProblem?: (problem: Problem) => void;
  mountEnhancedNotesTab?: (problem: Problem, containerId?: string) => void;
  unmountEnhancedNotesTab?: () => void;
  updateEnhancedNotesTabProblem?: (problem: Problem) => void;
}

declare const window: WindowWithGlobals;

// Global variable to store the current React root
let notesTabRoot: Root | null = null;
let currentProblem: Problem | null = null;

// Function to mount the novel notes tab with optimized configuration
export function mountNovelNotesTab(problem: Problem, containerId: string = 'notes-tab'): void {
  console.log('🚀 Mounting NovelNotesTab for problem:', problem.id, 'to container:', containerId);
  
  const container = document.getElementById(containerId);
  if (!container) {
    console.error('❌ Container not found:', containerId);
    return;
  }

  // Ensure the container has the proper classes for visibility
  if (!container.classList.contains('tab-content')) {
    container.classList.add('tab-content');
  }
  if (!container.classList.contains('active')) {
    container.classList.add('active');
  }

  // Store current problem reference
  currentProblem = problem;

  // Callback for when notes are saved
  const handleNotesSaved = (problemId: number, notes: string) => {
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

  // Proper cleanup of previous instance
  if (notesTabRoot) {
    try {
      console.log('🧹 Cleaning up previous NovelNotesTab instance');
      notesTabRoot.unmount();
      notesTabRoot = null;
    } catch (e) {
      console.warn('Warning unmounting previous root:', e);
    }
  }
  
  // Clear container content and ensure it's ready
  container.innerHTML = '';
  
  // Clear container content and ensure it's ready
  container.innerHTML = '';
  
  // Ensure container maintains proper display styles
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  
  // Debug: Log container state
  console.log('📊 Container state before mounting:', {
    id: container.id,
    classes: container.className,
    display: window.getComputedStyle(container).display,
    visibility: window.getComputedStyle(container).visibility,
    height: window.getComputedStyle(container).height
  });
  
  // Add a small delay to ensure DOM is ready for optimal performance
  setTimeout(() => {
    // Create new React root
    notesTabRoot = createRoot(container);

    // Render the novel notes tab with optimized configuration
    notesTabRoot.render(
      React.createElement(NovelNotesTab, {
        problem: problem,
        onNotesSaved: handleNotesSaved,
        className: 'novel-notes-integration w-full h-full',
        autoSaveDelay: 750, // Slightly longer delay to reduce API calls
        placeholderText: "Type '/' for commands or start writing your notes...",
        enableOptimizations: true
      })
    );
    
    console.log('✅ NovelNotesTab rendered to container:', containerId);
    
    // Debug: Log container state after mounting
    setTimeout(() => {
      console.log('📊 Container state after mounting:', {
        id: container.id,
        classes: container.className,
        display: window.getComputedStyle(container).display,
        visibility: window.getComputedStyle(container).visibility,
        height: window.getComputedStyle(container).height,
        childrenCount: container.children.length,
        hasContent: (container.textContent?.length ?? 0) > 0
      });
    }, 100);
  }, 10); // Small delay for better initialization
}

// Function to unmount the novel notes tab
export function unmountNovelNotesTab(): void {
  if (notesTabRoot) {
    notesTabRoot.unmount();
    notesTabRoot = null;
  }
  currentProblem = null;
}

// Function to update the problem data with optimized re-rendering
export function updateNovelNotesTabProblem(problem: Problem): void {
  if (notesTabRoot && problem) {
    console.log('🔄 Updating NovelNotesTab problem:', problem.id);
    
    // Check if this is actually a different problem to avoid unnecessary re-renders
    if (currentProblem && currentProblem.id === problem.id) {
      console.log('📝 Same problem, skipping re-render for performance');
      return;
    }
    
    currentProblem = problem;
    
    const handleNotesSaved = (problemId: number, notes: string) => {
      console.log('📝 Notes saved callback:', problemId, notes);
      if (window.currentProblem && window.currentProblem.id === problemId) {
        window.currentProblem.notes = notes;
      }
      
      // Call the existing onNotesSaved callback if it exists
      if (window.onNotesSaved && typeof window.onNotesSaved === 'function') {
        window.onNotesSaved(problemId, notes);
      }
    };

    // Re-render with optimized configuration
    notesTabRoot.render(
      React.createElement(NovelNotesTab, {
        problem: problem,
        onNotesSaved: handleNotesSaved,
        className: 'novel-notes-integration',
        autoSaveDelay: 750, // Consistent with mount function
        placeholderText: "Type '/' for commands or start writing your notes...",
        enableOptimizations: true
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