import React from 'react';
import { 
  mountNovelNotesTab, 
  unmountNovelNotesTab, 
  updateNovelNotesTabProblem 
} from './integration/novelNotesTabIntegration';

// This file serves as the entry point for the NovelNotesTab React components
// The actual mounting is handled by the integration script
console.log('🚀 Novel Notes Editor integration loaded');

// Ensure functions are available globally (the integration file already does this, but let's be explicit)
if (typeof window !== 'undefined') {
  (window as any).mountNovelNotesTab = mountNovelNotesTab;
  (window as any).unmountNovelNotesTab = unmountNovelNotesTab;
  (window as any).updateNovelNotesTabProblem = updateNovelNotesTabProblem;
  
  // Also provide backward compatibility
  (window as any).mountEnhancedNotesTab = mountNovelNotesTab;
  (window as any).unmountEnhancedNotesTab = unmountNovelNotesTab;
  (window as any).updateEnhancedNotesTabProblem = updateNovelNotesTabProblem;
  
  console.log('✅ Novel Notes functions attached to window object');
}

// Export the integration functions for potential direct use
export { 
  mountNovelNotesTab, 
  unmountNovelNotesTab, 
  updateNovelNotesTabProblem 
};