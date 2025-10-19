import React, { useState } from 'react';
import EnhancedRichTextEditor from './EnhancedRichTextEditor';
import FormattedDescriptionField from './media/FormattedDescriptionField';
import ImageWithDescription from './media/ImageWithDescription';
import YouTubeWithDescription from './media/YouTubeWithDescription';

const KeyboardShortcutsDemo: React.FC = () => {
  const [editorValue, setEditorValue] = useState('');
  const [descriptionValue, setDescriptionValue] = useState('');
  const [imageDescription, setImageDescription] = useState('');
  const [videoDescription, setVideoDescription] = useState('');

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Keyboard Shortcuts & Navigation Demo
        </h1>
        
        <div className="space-y-6">
          {/* Keyboard Shortcuts Guide */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-blue-900 mb-3">
              Available Keyboard Shortcuts
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h3 className="font-medium text-blue-800 mb-2">Text Formatting</h3>
                <ul className="space-y-1 text-blue-700">
                  <li><kbd className="px-2 py-1 bg-blue-100 rounded">Ctrl+B</kbd> / <kbd className="px-2 py-1 bg-blue-100 rounded">Cmd+B</kbd> - Bold</li>
                  <li><kbd className="px-2 py-1 bg-blue-100 rounded">Ctrl+I</kbd> / <kbd className="px-2 py-1 bg-blue-100 rounded">Cmd+I</kbd> - Italic</li>
                  <li><kbd className="px-2 py-1 bg-blue-100 rounded">Ctrl+K</kbd> / <kbd className="px-2 py-1 bg-blue-100 rounded">Cmd+K</kbd> - Create Link</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-blue-800 mb-2">Navigation</h3>
                <ul className="space-y-1 text-blue-700">
                  <li><kbd className="px-2 py-1 bg-blue-100 rounded">↑</kbd> / <kbd className="px-2 py-1 bg-blue-100 rounded">↓</kbd> - Navigate slash menu</li>
                  <li><kbd className="px-2 py-1 bg-blue-100 rounded">Enter</kbd> - Select menu item</li>
                  <li><kbd className="px-2 py-1 bg-blue-100 rounded">Escape</kbd> - Close menu/blur field</li>
                  <li><kbd className="px-2 py-1 bg-blue-100 rounded">Tab</kbd> / <kbd className="px-2 py-1 bg-blue-100 rounded">Shift+Tab</kbd> - Indent/outdent lists</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Enhanced Rich Text Editor */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              Enhanced Rich Text Editor
            </h2>
            <p className="text-gray-600 mb-4">
              Try typing "/" to open the slash command menu, then use arrow keys to navigate and Enter to select.
              Select text and use Ctrl+B, Ctrl+I, or Ctrl+K for formatting.
            </p>
            <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
              <EnhancedRichTextEditor
                value={editorValue}
                onChange={setEditorValue}
                placeholder="Type '/' for commands or start typing..."
              />
            </div>
          </div>

          {/* Formatted Description Field */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              Formatted Description Field
            </h2>
            <p className="text-gray-600 mb-4">
              Click to focus, then use keyboard shortcuts for formatting. The toolbar appears when editing.
            </p>
            <FormattedDescriptionField
              value={descriptionValue}
              onChange={setDescriptionValue}
              placeholder="Click here and try Ctrl+B, Ctrl+I, or Ctrl+K..."
            />
          </div>

          {/* Media Components with Focus Management */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              Media Components with Auto-Focus
            </h2>
            <p className="text-gray-600 mb-4">
              Add an image or video to see auto-focus behavior on the description field.
            </p>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">Image with Description</h3>
                <ImageWithDescription
                  description={imageDescription}
                  onDescriptionChange={setImageDescription}
                />
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">YouTube with Description</h3>
                <YouTubeWithDescription
                  description={videoDescription}
                  onDescriptionChange={setVideoDescription}
                />
              </div>
            </div>
          </div>

          {/* Usage Instructions */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              How to Test the Features
            </h2>
            <div className="space-y-3 text-sm text-gray-700">
              <div>
                <h3 className="font-medium text-gray-800">Rich Text Editor:</h3>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Type "/" to open the slash command menu</li>
                  <li>Use arrow keys to navigate, Enter to select, Escape to close</li>
                  <li>Select text and use Ctrl+B for bold, Ctrl+I for italic</li>
                  <li>Use Ctrl+K to create links</li>
                  <li>Create lists and use Tab/Shift+Tab to indent/outdent</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-gray-800">Description Fields:</h3>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Click to focus and see the formatting toolbar</li>
                  <li>Use keyboard shortcuts or toolbar buttons for formatting</li>
                  <li>Press Escape to blur the field</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-gray-800">Media Components:</h3>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Add an image or YouTube video to see auto-focus on description</li>
                  <li>Description fields support rich text formatting</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsDemo;