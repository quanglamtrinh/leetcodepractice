import React from 'react';
import EnhancedNotesTab from './EnhancedNotesTab';
import { Problem } from './ProblemList';

const ListManagementDemo: React.FC = () => {
  const demoProblem: Problem = {
    id: 999,
    title: 'List Management Demo',
    difficulty: 'Easy',
    concept: 'Demo',
    notes: JSON.stringify([
      {
        id: 1,
        type: 'text',
        content: 'Enhanced List Management Demo',
        placeholder: 'Type "/" for commands'
      },
      {
        id: 2,
        type: 'text',
        content: 'Try these features:',
        placeholder: 'Type something...'
      },
      {
        id: 3,
        type: 'bullet',
        content: 'Type /bullet to create bullet lists',
        level: 0,
        placeholder: 'List item'
      },
      {
        id: 4,
        type: 'bullet',
        content: 'Press Tab to indent (create sub-bullets)',
        level: 1,
        placeholder: 'List item'
      },
      {
        id: 5,
        type: 'bullet',
        content: 'Press Shift+Tab to unindent',
        level: 1,
        placeholder: 'List item'
      },
      {
        id: 6,
        type: 'numbered',
        content: 'Type /numbered for numbered lists',
        level: 0,
        placeholder: 'Numbered item'
      },
      {
        id: 7,
        type: 'numbered',
        content: 'Numbers auto-increment',
        level: 0,
        placeholder: 'Numbered item'
      },
      {
        id: 8,
        type: 'todo',
        content: 'Type /todo for checkable items',
        level: 0,
        placeholder: 'Todo item'
      },
      {
        id: 9,
        type: 'todo',
        content: '[x] This item is checked',
        level: 0,
        placeholder: 'Todo item'
      },
      {
        id: 10,
        type: 'text',
        content: 'Key Features:',
        placeholder: 'Type something...'
      },
      {
        id: 11,
        type: 'bullet',
        content: 'Enter creates new list items',
        level: 0,
        placeholder: 'List item'
      },
      {
        id: 12,
        type: 'bullet',
        content: 'Backspace on empty items converts to text',
        level: 0,
        placeholder: 'List item'
      },
      {
        id: 13,
        type: 'bullet',
        content: 'Double Enter exits lists',
        level: 0,
        placeholder: 'List item'
      },
      {
        id: 14,
        type: 'bullet',
        content: 'Up to 4 indentation levels supported',
        level: 0,
        placeholder: 'List item'
      }
    ]),
    solved: false,
    solution: ''
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Enhanced List Management Demo</h1>
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <EnhancedNotesTab 
          problem={demoProblem}
          onNotesSaved={(problemId, notes) => {
            console.log('Demo notes saved:', { problemId, notes });
          }}
        />
      </div>
      
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Instructions:</h2>
        <ul className="space-y-1 text-sm">
          <li>• Type "/" to open the slash command menu</li>
          <li>• Use Tab/Shift+Tab to indent/unindent list items</li>
          <li>• Press Enter to create new list items</li>
          <li>• Press Backspace on empty items to convert back to text</li>
          <li>• Double Enter on empty items exits the list</li>
          <li>• Click checkboxes in todo items to toggle completion</li>
        </ul>
      </div>
    </div>
  );
};

export default ListManagementDemo;