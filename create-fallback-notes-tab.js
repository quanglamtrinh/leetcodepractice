// Create a fallback version of NovelNotesTab that works in browser environment
// This script creates a global FallbackNotesTab component that can be used when Novel editor fails

console.log('🔧 Creating Fallback Notes Tab...');

// Fallback Notes Tab Component
function createFallbackNotesTab() {
    return function FallbackNotesTab({ problem, onNotesSaved, className, placeholderText }) {
        const [content, setContent] = React.useState('');
        const [status, setStatus] = React.useState('');
        const [isLoading, setIsLoading] = React.useState(true);

        // Load content from problem
        React.useEffect(() => {
            console.log('📝 FallbackNotesTab: Loading content for problem:', problem.id);
            
            let contentToLoad = '';
            
            if (problem.notes) {
                try {
                    // Try to parse as JSON (Novel format)
                    const parsed = JSON.parse(problem.notes);
                    if (parsed.type === 'doc' && parsed.content) {
                        // Extract text from Novel JSON format
                        const extractText = (node) => {
                            if (node.type === 'text') {
                                return node.text || '';
                            }
                            if (node.content && Array.isArray(node.content)) {
                                return node.content.map(extractText).join('');
                            }
                            return '';
                        };
                        
                        contentToLoad = parsed.content.map(extractText).join('\n');
                    } else {
                        contentToLoad = problem.notes;
                    }
                } catch (error) {
                    // If JSON parsing fails, treat as plain text
                    contentToLoad = problem.notes;
                }
            }
            
            setContent(contentToLoad);
            setIsLoading(false);
        }, [problem.id, problem.notes]);

        // Handle content changes
        const handleContentChange = (e) => {
            const newContent = e.target.value;
            setContent(newContent);
            setStatus('Modified');
        };

        // Save notes
        const handleSave = () => {
            setStatus('Saving...');
            
            // Convert plain text to Novel JSON format
            const novelContent = {
                type: 'doc',
                content: content.split('\n').map(line => ({
                    type: 'paragraph',
                    content: line.trim() ? [{ type: 'text', text: line }] : []
                }))
            };
            
            const notesToSave = JSON.stringify(novelContent);
            
            // Simulate save delay
            setTimeout(() => {
                setStatus('Saved');
                if (onNotesSaved) {
                    onNotesSaved(problem.id, notesToSave);
                }
                
                // Clear status after a delay
                setTimeout(() => setStatus(''), 2000);
            }, 500);
        };

        // Clear notes
        const handleClear = () => {
            if (confirm('Are you sure you want to clear all notes? This action cannot be undone.')) {
                setContent('');
                setStatus('Cleared');
                
                if (onNotesSaved) {
                    onNotesSaved(problem.id, '');
                }
                
                setTimeout(() => setStatus(''), 2000);
            }
        };

        if (isLoading) {
            return React.createElement('div', {
                className: `novel-notes-tab ${className || ''}`,
                style: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }
            }, [
                React.createElement('div', { key: 'loading' }, '🔄 Loading notes...')
            ]);
        }

        return React.createElement('div', {
            className: `novel-notes-tab ${className || ''}`,
            style: { display: 'flex', flexDirection: 'column', height: '100%' }
        }, [
            // Header with status and actions
            React.createElement('div', {
                key: 'header',
                style: { 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    marginBottom: '16px',
                    padding: '12px 0'
                }
            }, [
                React.createElement('div', { key: 'title-area' }, [
                    React.createElement('span', { 
                        key: 'title',
                        style: { fontSize: '18px', fontWeight: '500' }
                    }, '📝 Notes'),
                    status && React.createElement('span', {
                        key: 'status',
                        style: {
                            marginLeft: '12px',
                            fontSize: '14px',
                            color: status.includes('Saved') || status.includes('Cleared') ? '#059669' : 
                                   status.includes('Error') ? '#dc2626' : '#3b82f6'
                        }
                    }, status)
                ]),
                React.createElement('div', { 
                    key: 'actions',
                    style: { display: 'flex', gap: '8px' }
                }, [
                    React.createElement('button', {
                        key: 'save',
                        onClick: handleSave,
                        style: {
                            padding: '8px 12px',
                            background: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '13px'
                        }
                    }, '💾 Save'),
                    React.createElement('button', {
                        key: 'clear',
                        onClick: handleClear,
                        style: {
                            padding: '8px 12px',
                            background: '#dc2626',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '13px'
                        }
                    }, '🗑️ Clear')
                ])
            ]),

            // Notice about fallback mode
            React.createElement('div', {
                key: 'notice',
                style: {
                    padding: '12px',
                    background: '#fef3c7',
                    border: '1px solid #f59e0b',
                    borderRadius: '6px',
                    marginBottom: '16px',
                    fontSize: '14px'
                }
            }, [
                React.createElement('div', { key: 'notice-content' }, [
                    React.createElement('strong', { key: 'title' }, '⚠️ Fallback Mode: '),
                    'Rich text editor unavailable. Using plain text editor with basic formatting support.'
                ])
            ]),

            // Editor area
            React.createElement('div', {
                key: 'editor-area',
                style: { flex: 1, display: 'flex', flexDirection: 'column' }
            }, [
                React.createElement('textarea', {
                    key: 'editor',
                    value: content,
                    onChange: handleContentChange,
                    placeholder: placeholderText || "Write your notes here...",
                    style: {
                        flex: 1,
                        width: '100%',
                        minHeight: '300px',
                        padding: '16px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        resize: 'vertical',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                        fontSize: '14px',
                        lineHeight: '1.6',
                        outline: 'none'
                    },
                    onFocus: (e) => {
                        e.target.style.borderColor = '#3b82f6';
                        e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    },
                    onBlur: (e) => {
                        e.target.style.borderColor = '#e5e7eb';
                        e.target.style.boxShadow = 'none';
                    }
                })
            ]),

            // Footer with help text
            React.createElement('div', {
                key: 'footer',
                style: {
                    marginTop: '12px',
                    fontSize: '12px',
                    color: '#6b7280'
                }
            }, 'Notes are automatically converted to rich text format when saved.')
        ]);
    };
}

// Make the fallback component available globally
window.FallbackNotesTab = createFallbackNotesTab();

// Enhanced mounting function that uses fallback when Novel editor fails
function mountNotesTabWithFallback(problem, containerId = 'notes-tab') {
    console.log('🚀 Mounting Notes Tab with Fallback for problem:', problem.id);
    
    const container = document.getElementById(containerId);
    if (!container) {
        console.error('❌ Container not found:', containerId);
        return;
    }

    // Ensure container has proper classes and styles
    if (!container.classList.contains('tab-content')) {
        container.classList.add('tab-content');
    }
    if (!container.classList.contains('active')) {
        container.classList.add('active');
    }
    
    container.style.display = 'flex';
    container.style.flexDirection = 'column';

    // Clear container
    container.innerHTML = '';

    // Callback for when notes are saved
    const handleNotesSaved = (problemId, notes) => {
        console.log('📝 Notes saved:', problemId, notes);
        
        // Update global problem object if it exists
        if (window.currentProblem && window.currentProblem.id === problemId) {
            window.currentProblem.notes = notes;
        }
        
        // Call existing callback if available
        if (window.onNotesSaved && typeof window.onNotesSaved === 'function') {
            window.onNotesSaved(problemId, notes);
        }
    };

    try {
        // Try to use the original Novel integration first
        if (window.mountNovelNotesTab && typeof window.mountNovelNotesTab === 'function') {
            console.log('🎯 Attempting to use Novel integration...');
            
            // Set a timeout to detect if Novel editor fails to render
            let fallbackTimeout = setTimeout(() => {
                console.warn('⚠️ Novel editor taking too long, checking if fallback needed...');
                
                // Check if container has meaningful content
                const hasContent = container.children.length > 0 && container.textContent.trim().length > 0;
                const isVisible = window.getComputedStyle(container).display !== 'none';
                
                if (!hasContent || !isVisible) {
                    console.log('🔄 Switching to fallback editor...');
                    mountFallbackEditor();
                }
            }, 2000);

            // Try Novel integration
            window.mountNovelNotesTab(problem, containerId);
            
            // Check if it worked after a short delay
            setTimeout(() => {
                const hasContent = container.children.length > 0 && container.textContent.trim().length > 0;
                const isVisible = window.getComputedStyle(container).display !== 'none';
                
                if (hasContent && isVisible) {
                    console.log('✅ Novel integration successful');
                    clearTimeout(fallbackTimeout);
                } else {
                    console.log('❌ Novel integration failed, using fallback');
                    clearTimeout(fallbackTimeout);
                    mountFallbackEditor();
                }
            }, 1000);
            
        } else {
            console.log('📝 Novel integration not available, using fallback');
            mountFallbackEditor();
        }
    } catch (error) {
        console.error('❌ Error with Novel integration:', error);
        mountFallbackEditor();
    }

    function mountFallbackEditor() {
        try {
            container.innerHTML = '';
            
            const root = ReactDOM.createRoot(container);
            root.render(React.createElement(window.FallbackNotesTab, {
                problem: problem,
                onNotesSaved: handleNotesSaved,
                className: 'novel-notes-integration fallback-mode',
                placeholderText: "Write your notes here... (Fallback mode)"
            }));
            
            console.log('✅ Fallback editor mounted successfully');
        } catch (error) {
            console.error('❌ Fallback editor failed:', error);
            container.innerHTML = '<div style="padding: 20px; color: #dc2626;">❌ Unable to load notes editor. Please refresh the page.</div>';
        }
    }
}

// Make the enhanced mounting function available globally
window.mountNotesTabWithFallback = mountNotesTabWithFallback;

console.log('✅ Fallback Notes Tab created and available globally');
console.log('💡 Use mountNotesTabWithFallback() to mount with automatic fallback support');