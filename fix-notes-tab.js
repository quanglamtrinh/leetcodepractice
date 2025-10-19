// Simple fix for notes tab functionality
// This script will restore basic notes functionality

console.log('🔧 Fixing notes tab functionality...');

// Override the loadNoteForProblem function to work with the current setup
async function fixedLoadNoteForProblem(problem) {
    console.log('📝 Fixed loadNoteForProblem called for problem:', problem.id);
    
    const editor = document.getElementById('notesEditor');
    if (!editor) {
        console.error('❌ Notes editor not found');
        return;
    }
    
    // Clear any existing content and show loading state
    editor.innerHTML = 'Loading notes...';
    editor.classList.add('placeholder');
    editor.contentEditable = false;
    editor.style.opacity = '0.7';
    
    try {
        // Always fetch the latest data from the database to ensure we have current notes
        console.log('🔄 Fetching latest notes from database...');
        const response = await fetch(`http://localhost:3001/api/problems/${problem.id}`);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch problem: ${response.status}`);
        }
        
        const latestProblem = await response.json();
        console.log('📥 Latest problem data:', latestProblem.id, 'Notes length:', latestProblem.notes?.length || 0);
        
        // Update the problem object with latest data
        if (window.currentProblem && window.currentProblem.id === problem.id) {
            window.currentProblem.notes = latestProblem.notes;
        }
        problem.notes = latestProblem.notes;
        
        // Clear loading state
        editor.innerHTML = '';
        
        // Set the notes content
        if (latestProblem.notes && latestProblem.notes.trim()) {
            console.log('📝 Processing notes content...');
            try {
                // Try to parse as JSON first (enhanced format)
                const parsed = JSON.parse(latestProblem.notes);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    console.log('✅ Found enhanced format notes with', parsed.length, 'blocks');
                    // Convert enhanced format to simple HTML
                    let htmlContent = '';
                    parsed.forEach(block => {
                        if (!block.content && block.type !== 'divider') return; // Skip empty blocks
                        
                        switch (block.type) {
                            case 'heading':
                                htmlContent += `<h3>${escapeHtml(block.content)}</h3>`;
                                break;
                            case 'bullet':
                                htmlContent += `<ul><li>${escapeHtml(block.content)}</li></ul>`;
                                break;
                            case 'numbered':
                                htmlContent += `<ol><li>${escapeHtml(block.content)}</li></ol>`;
                                break;
                            case 'todo':
                                const checked = block.checked ? 'checked' : '';
                                htmlContent += `<div><input type="checkbox" ${checked} disabled> ${escapeHtml(block.content)}</div>`;
                                break;
                            case 'code':
                                htmlContent += `<pre><code>${escapeHtml(block.content)}</code></pre>`;
                                break;
                            case 'quote':
                                htmlContent += `<blockquote>${escapeHtml(block.content)}</blockquote>`;
                                break;
                            case 'divider':
                                htmlContent += '<hr>';
                                break;
                            default:
                                if (block.content.trim()) {
                                    htmlContent += `<p>${escapeHtml(block.content)}</p>`;
                                }
                        }
                    });
                    editor.innerHTML = htmlContent;
                } else {
                    console.log('📝 Not enhanced format, treating as HTML');
                    // Not enhanced format, treat as regular content
                    editor.innerHTML = latestProblem.notes;
                }
            } catch (error) {
                console.log('📝 Not JSON, treating as HTML');
                // Not JSON, treat as HTML
                editor.innerHTML = latestProblem.notes;
            }
            editor.classList.remove('placeholder');
        } else {
            console.log('📝 No notes found, showing placeholder');
            editor.textContent = 'Write your notes here...';
            editor.classList.add('placeholder');
        }
        
        // Re-enable the notes editor
        editor.contentEditable = true;
        editor.style.opacity = '1';
        
        // Set up auto-save
        setupAutoSave(editor, problem);
        
        console.log('✅ Notes loaded successfully');
        
    } catch (error) {
        console.error('❌ Error loading notes:', error);
        editor.innerHTML = 'Error loading notes. Click to try again.';
        editor.classList.add('placeholder');
        editor.contentEditable = true;
        editor.style.opacity = '1';
        
        // Allow user to click to retry
        editor.addEventListener('click', function retryLoad() {
            editor.removeEventListener('click', retryLoad);
            fixedLoadNoteForProblem(problem);
        }, { once: true });
    }
}

// Helper function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Set up auto-save functionality
function setupAutoSave(editor, problem) {
    // Remove existing listeners
    const newEditor = editor.cloneNode(true);
    editor.parentNode.replaceChild(newEditor, editor);
    
    // Add new listener
    newEditor.addEventListener('input', function() {
        // Remove placeholder styling when user starts typing
        if (this.textContent.trim() !== '') {
            this.classList.remove('placeholder');
        }
        
        // Auto-save after a delay
        clearTimeout(window.notesSaveTimeout);
        window.notesSaveTimeout = setTimeout(() => {
            fixedSaveNoteForProblem(problem, this.innerHTML);
        }, 1000);
    });
    
    // Handle placeholder
    newEditor.addEventListener('focus', function() {
        if (this.classList.contains('placeholder')) {
            this.textContent = '';
            this.classList.remove('placeholder');
        }
    });
    
    newEditor.addEventListener('blur', function() {
        if (this.textContent.trim() === '') {
            this.textContent = 'Write your notes here...';
            this.classList.add('placeholder');
        }
    });
}

// Fixed save function
async function fixedSaveNoteForProblem(problem, content) {
    console.log('💾 Fixed saveNoteForProblem called for problem:', problem.id);
    
    const status = document.getElementById('notesStatus');
    if (status) {
        status.textContent = 'Saving...';
        status.style.color = '#3b82f6';
    }
    
    try {
        const response = await fetch(`http://localhost:3001/api/problems/${problem.id}/notes`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                notes: content
            })
        });
        
        if (response.ok) {
            if (status) {
                status.textContent = 'Saved!';
                status.style.color = '#10b981';
                setTimeout(() => {
                    status.textContent = '';
                }, 2000);
            }
            // Update the problem object
            problem.notes = content;
            console.log('✅ Notes saved successfully');
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
    } catch (error) {
        console.error('❌ Save error:', error);
        if (status) {
            status.textContent = 'Failed to save';
            status.style.color = '#ef4444';
            setTimeout(() => {
                status.textContent = '';
            }, 3000);
        }
    }
}

// Override the global functions - ensure they're properly set
window.loadNoteForProblem = fixedLoadNoteForProblem;
window.saveNoteForProblem = fixedSaveNoteForProblem;

// Also disable the enhanced notes integration to force fallback
window.mountEnhancedNotesTab = undefined;
window.updateEnhancedNotesTabProblem = undefined;

// Force override after a delay to ensure it takes precedence
setTimeout(() => {
    window.loadNoteForProblem = fixedLoadNoteForProblem;
    window.saveNoteForProblem = fixedSaveNoteForProblem;
    console.log('🔧 Functions re-overridden after delay');
}, 100);

// Also create a manual save function for the current problem
window.saveCurrentNotes = function() {
    if (window.currentProblem) {
        const editor = document.getElementById('notesEditor');
        if (editor) {
            fixedSaveNoteForProblem(window.currentProblem, editor.innerHTML);
        }
    }
};

// Debug function to check notes for current problem
window.debugCurrentNotes = async function() {
    if (!window.currentProblem) {
        console.log('❌ No current problem selected');
        return;
    }
    
    console.log('🔍 Debug info for current problem:');
    console.log('Problem ID:', window.currentProblem.id);
    console.log('Problem Title:', window.currentProblem.title);
    console.log('Notes in memory:', window.currentProblem.notes?.substring(0, 100) + '...');
    
    try {
        const response = await fetch(`http://localhost:3001/api/problems/${window.currentProblem.id}`);
        const dbProblem = await response.json();
        console.log('Notes in database:', dbProblem.notes?.substring(0, 100) + '...');
        console.log('Notes length in DB:', dbProblem.notes?.length || 0);
        
        if (dbProblem.notes) {
            try {
                const parsed = JSON.parse(dbProblem.notes);
                console.log('Enhanced format blocks:', parsed.length);
            } catch (e) {
                console.log('HTML format notes');
            }
        }
    } catch (error) {
        console.error('Error fetching from DB:', error);
    }
};

// Function to reload notes for current problem
window.reloadCurrentNotes = function() {
    if (window.currentProblem) {
        console.log('🔄 Reloading notes for current problem...');
        fixedLoadNoteForProblem(window.currentProblem);
    } else {
        console.log('❌ No current problem selected');
    }
};

// Test function to verify the fix is working
window.testNotesFixWorking = function() {
    console.log('🧪 Testing if notes fix is working...');
    console.log('loadNoteForProblem function:', typeof window.loadNoteForProblem);
    console.log('saveNoteForProblem function:', typeof window.saveNoteForProblem);
    console.log('mountEnhancedNotesTab function:', typeof window.mountEnhancedNotesTab);
    console.log('Function source check:', window.loadNoteForProblem.toString().includes('fixedLoadNoteForProblem'));
    
    if (window.loadNoteForProblem.toString().includes('fixedLoadNoteForProblem')) {
        console.log('✅ Fix is active and working');
        return true;
    } else {
        console.log('❌ Fix is not active - original function still in use');
        return false;
    }
};

console.log('✅ Notes tab functionality fixed!');
console.log('📝 Notes will now display and save properly');
console.log('💡 Debug commands available:');
console.log('  - window.saveCurrentNotes() - Save current notes');
console.log('  - window.debugCurrentNotes() - Debug current problem notes');
console.log('  - window.reloadCurrentNotes() - Reload notes from database');
console.log('  - window.testNotesFixWorking() - Test if fix is active');