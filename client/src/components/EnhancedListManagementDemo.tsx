import React, { useState } from 'react';
import EnhancedRichTextEditor from './EnhancedRichTextEditor';

const EnhancedListManagementDemo: React.FC = () => {
  const [content, setContent] = useState('');

  const demoContent = JSON.stringify([
    { id: 1, type: 'heading', content: 'Enhanced List Management Demo', placeholder: 'Heading' },
    { id: 2, type: 'text', content: 'This demo showcases the enhanced list management features:', placeholder: 'Type something...' },
    { id: 3, type: 'bullet', content: 'Bullet lists with Tab/Shift+Tab indentation', level: 0, placeholder: 'List item' },
    { id: 4, type: 'bullet', content: 'Sub-bullets (press Tab to indent)', level: 1, placeholder: 'List item' },
    { id: 5, type: 'bullet', content: 'Sub-sub-bullets (up to 3 levels)', level: 2, placeholder: 'List item' },
    { id: 6, type: 'numbered', content: 'Numbered lists with proper numbering', level: 0, placeholder: 'List item' },
    { id: 7, type: 'numbered', content: 'Sub-numbered items', level: 1, placeholder: 'List item' },
    { id: 8, type: 'numbered', content: 'Another main item', level: 0, placeholder: 'List item' },
    { id: 9, type: 'todo', content: 'Todo items with checkboxes', checked: false, level: 0, placeholder: 'Task item' },
    { id: 10, type: 'todo', content: 'Completed task', checked: true, level: 0, placeholder: 'Task item' },
    { id: 11, type: 'todo', content: 'Sub-task (indented)', checked: false, level: 1, placeholder: 'Task item' },
    { id: 12, type: 'text', content: '', placeholder: 'Try typing "/" to see slash commands!' }
  ]);

  const handleLoadDemo = () => {
    setContent(demoContent);
  };

  const handleClear = () => {
    setContent('');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-4">Enhanced List Management Demo</h1>
        <div className="flex gap-4 mb-4">
          <button
            onClick={handleLoadDemo}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Load Demo Content
          </button>
          <button
            onClick={handleClear}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Clear
          </button>
        </div>
        
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
          <h3 className="font-semibold mb-2">Key Features:</h3>
          <ul className="space-y-1 text-sm">
            <li><strong>Tab/Shift+Tab:</strong> Indent/outdent list items (up to 3 levels)</li>
            <li><strong>Enter:</strong> Create new list item at same level, or exit list on empty item</li>
            <li><strong>Backspace:</strong> Convert list item to text or decrease indentation</li>
            <li><strong>Slash Commands:</strong> Type /bullet, /numbered, /todo to create lists</li>
            <li><strong>Todo Lists:</strong> Click checkboxes to toggle completion</li>
          </ul>
        </div>
      </div>

      <div className="border border-gray-300 rounded-lg p-4 min-h-[400px] bg-white">
        <EnhancedRichTextEditor
          value={content}
          onChange={setContent}
          placeholder="Type '/' for commands or click 'Load Demo Content' to see examples"
          className="min-h-[350px]"
        />
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-2">Instructions:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium mb-1">Creating Lists:</h4>
            <ul className="space-y-1">
              <li>• Type <code>/bullet</code> for bullet lists</li>
              <li>• Type <code>/numbered</code> for numbered lists</li>
              <li>• Type <code>/todo</code> for todo lists</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-1">List Navigation:</h4>
            <ul className="space-y-1">
              <li>• <kbd>Tab</kbd> to indent (create sub-items)</li>
              <li>• <kbd>Shift+Tab</kbd> to outdent</li>
              <li>• <kbd>Enter</kbd> to create new item</li>
              <li>• <kbd>Backspace</kbd> at start to convert/outdent</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedListManagementDemo;