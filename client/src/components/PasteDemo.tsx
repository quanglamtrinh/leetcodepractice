import React, { useState } from 'react';
import EnhancedRichTextEditor from './EnhancedRichTextEditor';

const PasteDemo: React.FC = () => {
  const [content, setContent] = useState('');

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Paste Handling Demo</h1>
      
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Instructions:</h2>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li>Try pasting content with bullet points (•, -, *)</li>
          <li>Try pasting numbered lists (1., 2., 3.)</li>
          <li>Try pasting HTML content from web pages</li>
          <li>Try pasting mixed content with paragraphs and lists</li>
          <li>Try pasting at different cursor positions</li>
        </ul>
      </div>

      <div className="mb-4">
        <h3 className="text-md font-semibold mb-2">Sample content to copy and paste:</h3>
        <div className="bg-gray-100 p-4 rounded border text-sm">
          <div className="mb-2">
            <strong>Plain text with bullets:</strong>
            <pre className="mt-1 whitespace-pre-wrap">
Introduction paragraph

• First bullet point
• Second bullet point
  • Sub bullet point
  • Another sub bullet

Conclusion paragraph
            </pre>
          </div>
          
          <div className="mb-2">
            <strong>Numbered list:</strong>
            <pre className="mt-1 whitespace-pre-wrap">
Steps to follow:

1. First step
2. Second step
  3. Sub step
  4. Another sub step
3. Final step
            </pre>
          </div>
        </div>
      </div>

      <div className="border rounded-lg p-4">
        <h3 className="text-md font-semibold mb-2">Rich Text Editor:</h3>
        <EnhancedRichTextEditor
          value={content}
          onChange={setContent}
          placeholder="Start typing or paste content here..."
          className="min-h-[300px] border border-gray-200 rounded p-4"
        />
      </div>

      <div className="mt-4">
        <h3 className="text-md font-semibold mb-2">Raw Content (JSON):</h3>
        <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-40">
          {content || 'No content yet...'}
        </pre>
      </div>
    </div>
  );
};

export default PasteDemo;