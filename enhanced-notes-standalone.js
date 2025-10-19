// Enhanced Notes Standalone Integration
// This provides a rich text editor for notes without requiring the full React build

(function() {
  'use strict';

  console.log('🚀 Enhanced Notes Standalone Integration loading...');

  // Simple block-based editor state
  let editorState = {
    blocks: [],
    activeBlockId: null,
    nextId: 1
  };

  // Create a new block
  function createBlock(type = 'text', content = '', placeholder = 'Type "/" for commands') {
    return {
      id: editorState.nextId++,
      type: type,
      content: content,
      placeholder: placeholder
    };
  }

  // Initialize with default block
  function initializeEditor() {
    editorState.blocks = [createBlock()];
    editorState.activeBlockId = editorState.blocks[0].id;
  }

  // Convert blocks to JSON string for storage
  function blocksToJson() {
    return JSON.stringify(editorState.blocks);
  }

  // Convert JSON string to blocks
  function jsonToBlocks(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (Array.isArray(parsed) && parsed.length > 0) {
        editorState.blocks = parsed;
        editorState.nextId = Math.max(...parsed.map(b => b.id)) + 1;
        editorState.activeBlockId = parsed[0].id;
        return true;
      }
    } catch (error) {
      console.log('Failed to parse JSON, using default blocks');
    }
    return false;
  }

  // Handle slash commands
  function handleSlashCommand(blockId, command) {
    const block = editorState.blocks.find(b => b.id === blockId);
    if (!block) return;

    switch (command) {
      case '/h':
      case '/heading':
        block.type = 'heading';
        block.content = block.content.replace(/^\/h(eading)?\s*/, '');
        break;
      case '/b':
      case '/bullet':
        block.type = 'bullet';
        block.content = block.content.replace(/^\/b(ullet)?\s*/, '');
        break;
      case '/n':
      case '/numbered':
        block.type = 'numbered';
        block.content = block.content.replace(/^\/n(umbered)?\s*/, '');
        break;
      case '/t':
      case '/todo':
        block.type = 'todo';
        block.content = block.content.replace(/^\/t(odo)?\s*/, '');
        block.checked = false;
        break;
      case '/c':
      case '/code':
        block.type = 'code';
        block.content = block.content.replace(/^\/c(ode)?\s*/, '');
        break;
      case '/q':
      case '/quote':
        block.type = 'quote';
        block.content = block.content.replace(/^\/q(uote)?\s*/, '');
        break;
      case '/d':
      case '/divider':
        block.type = 'divider';
        block.content = '';
        break;
    }
    
    renderEditor();
  }

  // Add a new block after the current one
  function addBlockAfter(blockId, type = 'text') {
    const index = editorState.blocks.findIndex(b => b.id === blockId);
    if (index === -1) return;

    const newBlock = createBlock(type);
    editorState.blocks.splice(index + 1, 0, newBlock);
    editorState.activeBlockId = newBlock.id;
    
    renderEditor();
    
    // Focus the new block
    setTimeout(() => {
      const textarea = document.querySelector(`[data-block-id="${newBlock.id}"]`);
      if (textarea) textarea.focus();
    }, 10);
  }

  // Delete a block
  function deleteBlock(blockId) {
    if (editorState.blocks.length <= 1) return; // Keep at least one block
    
    const index = editorState.blocks.findIndex(b => b.id === blockId);
    if (index === -1) return;

    editorState.blocks.splice(index, 1);
    
    // Set active block to previous or next
    if (index > 0) {
      editorState.activeBlockId = editorState.blocks[index - 1].id;
    } else if (editorState.blocks.length > 0) {
      editorState.activeBlockId = editorState.blocks[0].id;
    }
    
    renderEditor();
  }

  // Update block content
  function updateBlockContent(blockId, content) {
    const block = editorState.blocks.find(b => b.id === blockId);
    if (block) {
      block.content = content;
      
      // Check for slash commands
      if (content.startsWith('/') && content.includes(' ')) {
        const command = content.split(' ')[0];
        handleSlashCommand(blockId, command);
      }
    }
  }

  // Render a single block
  function renderBlock(block) {
    const blockDiv = document.createElement('div');
    blockDiv.className = 'block-container mb-2 relative group';
    blockDiv.setAttribute('data-block-id', block.id);

    let blockContent = '';
    let inputElement = '';

    switch (block.type) {
      case 'heading':
        inputElement = `
          <textarea 
            class="w-full p-2 border-0 resize-none text-xl font-bold bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            placeholder="Heading"
            data-block-id="${block.id}"
            rows="1"
          >${block.content}</textarea>
        `;
        break;
      
      case 'bullet':
        inputElement = `
          <div class="flex items-start">
            <span class="mr-2 mt-1">•</span>
            <textarea 
              class="flex-1 p-2 border-0 resize-none bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
              placeholder="Bullet point"
              data-block-id="${block.id}"
              rows="1"
            >${block.content}</textarea>
          </div>
        `;
        break;
      
      case 'numbered':
        const index = editorState.blocks.filter(b => b.type === 'numbered').indexOf(block) + 1;
        inputElement = `
          <div class="flex items-start">
            <span class="mr-2 mt-1">${index}.</span>
            <textarea 
              class="flex-1 p-2 border-0 resize-none bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
              placeholder="Numbered item"
              data-block-id="${block.id}"
              rows="1"
            >${block.content}</textarea>
          </div>
        `;
        break;
      
      case 'todo':
        inputElement = `
          <div class="flex items-start">
            <input type="checkbox" class="mr-2 mt-1" ${block.checked ? 'checked' : ''} 
                   onchange="toggleTodo(${block.id})">
            <textarea 
              class="flex-1 p-2 border-0 resize-none bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 rounded ${block.checked ? 'line-through text-gray-500' : ''}"
              placeholder="Todo item"
              data-block-id="${block.id}"
              rows="1"
            >${block.content}</textarea>
          </div>
        `;
        break;
      
      case 'code':
        inputElement = `
          <div class="bg-gray-100 rounded p-3 font-mono">
            <textarea 
              class="w-full bg-transparent border-0 resize-none focus:outline-none font-mono text-sm"
              placeholder="Code block"
              data-block-id="${block.id}"
              rows="3"
            >${block.content}</textarea>
          </div>
        `;
        break;
      
      case 'quote':
        inputElement = `
          <div class="border-l-4 border-gray-300 pl-4">
            <textarea 
              class="w-full p-2 border-0 resize-none bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 rounded italic"
              placeholder="Quote"
              data-block-id="${block.id}"
              rows="1"
            >${block.content}</textarea>
          </div>
        `;
        break;
      
      case 'divider':
        inputElement = `
          <div class="py-4">
            <hr class="border-gray-300">
          </div>
        `;
        break;
      
      default: // text
        inputElement = `
          <textarea 
            class="w-full p-2 border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="${block.placeholder}"
            data-block-id="${block.id}"
            rows="1"
          >${block.content}</textarea>
        `;
    }

    // Add delete button for non-divider blocks
    if (block.type !== 'divider' && editorState.blocks.length > 1) {
      blockContent = `
        ${inputElement}
        <button class="absolute right-2 top-2 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity"
                onclick="deleteBlock(${block.id})" title="Delete block">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      `;
    } else {
      blockContent = inputElement;
    }

    blockDiv.innerHTML = blockContent;
    return blockDiv;
  }

  // Render the entire editor
  function renderEditor() {
    const container = document.getElementById('enhanced-notes-editor-container');
    if (!container) return;

    container.innerHTML = '';
    
    editorState.blocks.forEach(block => {
      const blockElement = renderBlock(block);
      container.appendChild(blockElement);
    });

    // Add event listeners
    setupEventListeners();
  }

  // Setup event listeners for the editor
  function setupEventListeners() {
    const textareas = document.querySelectorAll('[data-block-id]');
    
    textareas.forEach(textarea => {
      const blockId = parseInt(textarea.getAttribute('data-block-id'));
      
      // Auto-resize textarea
      textarea.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = this.scrollHeight + 'px';
        updateBlockContent(blockId, this.value);
        
        // Trigger auto-save
        if (window.enhancedNotesAutoSave) {
          clearTimeout(window.enhancedNotesAutoSave);
          window.enhancedNotesAutoSave = setTimeout(() => {
            if (window.saveEnhancedNotes) {
              window.saveEnhancedNotes();
            }
          }, 500);
        }
      });

      // Handle Enter key
      textarea.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          addBlockAfter(blockId);
        }
        
        // Handle backspace on empty block
        if (e.key === 'Backspace' && this.value === '' && editorState.blocks.length > 1) {
          e.preventDefault();
          deleteBlock(blockId);
        }
      });

      // Set initial height
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    });
  }

  // Toggle todo checkbox
  window.toggleTodo = function(blockId) {
    const block = editorState.blocks.find(b => b.id === blockId);
    if (block && block.type === 'todo') {
      block.checked = !block.checked;
      renderEditor();
      
      // Trigger auto-save
      if (window.saveEnhancedNotes) {
        window.saveEnhancedNotes();
      }
    }
  };

  // Delete block function (global for onclick)
  window.deleteBlock = deleteBlock;

  // Load notes from JSON
  window.loadEnhancedNotes = function(jsonString) {
    if (!jsonToBlocks(jsonString)) {
      initializeEditor();
    }
    renderEditor();
  };

  // Get current notes as JSON
  window.getEnhancedNotes = function() {
    return blocksToJson();
  };

  // Initialize the enhanced notes editor
  window.initEnhancedNotesEditor = function(containerId = 'enhanced-notes-editor-container') {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error('Enhanced notes container not found:', containerId);
      return;
    }

    initializeEditor();
    renderEditor();
    
    console.log('✅ Enhanced Notes Standalone Editor initialized');
  };

  console.log('✅ Enhanced Notes Standalone Integration loaded');

})();