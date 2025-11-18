// Mock for novel package
import React from 'react';

const mockJSONContent = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [] }]
};

export const EditorRoot = ({ children }) => React.createElement('div', { 'data-testid': 'editor-root' }, children);

export const EditorContent = ({ initialContent, onUpdate }) => 
  React.createElement('div', { 'data-testid': 'editor-content' }, 
    React.createElement('textarea', {
      'data-testid': 'editor-textarea',
      onChange: (e) => onUpdate?.({ editor: { getJSON: () => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: e.target.value }] }] }) } })
    })
  );

export const EditorCommand = ({ children }) => React.createElement('div', { 'data-testid': 'editor-command' }, children);
export const EditorCommandItem = ({ children }) => React.createElement('div', {}, children);
export const EditorCommandEmpty = ({ children }) => React.createElement('div', {}, children);
export const EditorBubble = ({ children }) => React.createElement('div', { 'data-testid': 'editor-bubble' }, children);
export const EditorBubbleItem = ({ children }) => React.createElement('div', {}, children);

export const StarterKit = { configure: () => ({}) };
export const TaskList = { configure: () => ({}) };
export const TaskItem = { configure: () => ({}) };
export const TiptapUnderline = {};
export const Placeholder = { configure: () => ({}) };
export const TiptapLink = { configure: () => ({}) };
export const UpdatedImage = { configure: () => ({}) };
export const HorizontalRule = { configure: () => ({}) };
export const Command = { configure: () => ({}) };
export const renderItems = () => null;

export const JSONContent = mockJSONContent;