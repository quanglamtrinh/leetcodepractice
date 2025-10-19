import React from 'react';
import { createRoot } from 'react-dom/client';
import EnhancedSolutionTab from '../components/EnhancedSolutionTab';

// Global variable to store the current React root
let solutionTabRoot = null;
let currentProblem = null;

// Function to mount the enhanced solution tab
export function mountEnhancedSolutionTab(problem, containerId = 'solution-tab') {
  console.log('🚀 Mounting EnhancedSolutionTab for problem:', problem.id);
  
  const container = document.getElementById(containerId);
  if (!container) {
    console.error('❌ Container not found:', containerId);
    return;
  }

  // Store current problem reference
  currentProblem = problem;

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
export function unmountEnhancedSolutionTab() {
  if (solutionTabRoot) {
    solutionTabRoot.unmount();
    solutionTabRoot = null;
  }
  currentProblem = null;
}

// Function to update the problem data
export function updateEnhancedSolutionTabProblem(problem) {
  if (solutionTabRoot && problem) {
    console.log('🔄 Updating EnhancedSolutionTab problem:', problem.id);
    currentProblem = problem;
    
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