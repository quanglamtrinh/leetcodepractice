import React from 'react';
import './integration/notesTabIntegration.js';
import './styles/novel-editor.css';

// This file serves as the entry point for the React components
// The actual mounting is handled by the integration script
console.log('🚀 Enhanced Notes Editor integration loaded');

// Export the integration functions for potential direct use
export { 
  mountEnhancedNotesTab, 
  unmountEnhancedNotesTab, 
  updateEnhancedNotesTabProblem 
} from './integration/notesTabIntegration.js';