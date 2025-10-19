// Add a test button to the interface for testing enhanced notes
(function() {
    'use strict';
    
    // Wait for DOM to be ready
    setTimeout(() => {
        // Create test button
        const testButton = document.createElement('button');
        testButton.textContent = '🧪 Test Enhanced Notes';
        testButton.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            z-index: 9999;
            background: #3b82f6;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        `;
        
        testButton.onclick = function() {
            console.log('🧪 Test button clicked');
            
            // Check if debug functions are available
            if (window.debugNotes) {
                window.debugNotes.checkIntegration();
                window.debugNotes.testEnhancedNotes();
            } else {
                console.error('❌ Debug functions not available');
            }
        };
        
        // Add to body
        document.body.appendChild(testButton);
        console.log('✅ Test button added to interface');
        
    }, 3000);
})();