# Design Document

## Overview

The Enhanced Notes Editor will integrate rich text editing capabilities into both the notes and solution tabs of the LeetCode practice application. The design leverages the existing RichTextEditor component while extending it with additional features and ensuring seamless integration with the current problem selection and auto-save systems.

## Architecture

### Component Structure

```
Enhanced Notes Editor
├── EnhancedNotesTab (replaces current notes tab)
├── EnhancedSolutionTab (replaces current solution tab)  
├── SharedRichTextEditor (enhanced version of RichTextEditor)
├── ExtendedSlashCommand (enhanced SlashCommand)
├── MediaComponents
│   ├── ImageWithDescription
│   └── YouTubeWithDescription
└── PasteHandler (new utility)
```

### Integration Points

1. **Problem Selection System**: Hooks into existing `loadNoteForProblem()` and `saveNoteForProblem()` functions
2. **Auto-save System**: Extends current auto-save to handle rich text HTML content
3. **Database Storage**: Utilizes existing notes and solution fields with HTML content support

## Components and Interfaces

### SharedRichTextEditor Component

**Purpose**: Core rich text editing component used by both notes and solution tabs

**Props Interface**:
```typescript
interface SharedRichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onSave?: (content: string) => void;
  autoSave?: boolean;
  autoSaveDelay?: number;
}
```

**Key Features**:
- Slash command menu with extended options
- Paste handling with format preservation
- Keyboard shortcuts (Ctrl+B, Ctrl+I, Ctrl+K)
- List management (bullets, numbers, todos with sub-levels)
- Media embedding (images, YouTube videos)

### ExtendedSlashCommand Component

**Purpose**: Enhanced slash command menu with additional media options

**New Command Items**:
```typescript
const mediaCommands = [
  {
    title: "Image with Description",
    description: "Upload an image and add a description below it",
    icon: <ImageIcon />,
    command: handleImageWithDescription
  },
  {
    title: "YouTube with Description", 
    description: "Embed a YouTube video with description text",
    icon: <Youtube />,
    command: handleYouTubeWithDescription
  }
];
```

### MediaComponents

#### ImageWithDescription Component

**Structure**:
```typescript
interface ImageWithDescriptionProps {
  src: string;
  alt?: string;
  description: string;
  onDescriptionChange: (description: string) => void;
  onImageChange?: (src: string) => void;
}
```

**HTML Output**:
```html
<div class="media-block image-block">
  <img src="..." alt="..." />
  <div class="media-description" contenteditable="true">
    Description text here...
  </div>
</div>
```

#### YouTubeWithDescription Component

**Structure**:
```typescript
interface YouTubeWithDescriptionProps {
  videoId: string;
  videoUrl: string;
  description: string;
  onDescriptionChange: (description: string) => void;
}
```

**HTML Output**:
```html
<div class="media-block youtube-block">
  <div class="youtube-embed">
    <iframe src="https://www.youtube.com/embed/VIDEO_ID"></iframe>
  </div>
  <div class="media-description" contenteditable="true">
    Description text here...
  </div>
</div>
```

### PasteHandler Utility

**Purpose**: Processes pasted content to preserve formatting

**Key Functions**:
```typescript
interface PasteHandler {
  processPastedContent(clipboardData: DataTransfer): string;
  convertHTMLToEditorFormat(html: string): string;
  preserveListStructure(html: string): string;
  handlePlainTextLists(text: string): string;
}
```

**Processing Logic**:
1. Detect content type (HTML, plain text, rich text)
2. Convert bullet points (-, *, •) to editor bullet format
3. Convert numbered lists (1., 2., etc.) to editor numbered format
4. Preserve indentation for sub-bullets/sub-numbers
5. Maintain text formatting (bold, italic, links)
6. Convert line breaks to proper paragraph structure

## Data Models

### Rich Text Content Storage

**Database Schema** (extends existing):
```sql
-- Notes field already exists, will store HTML content
-- Solution field already exists, will store HTML content
-- No schema changes needed, just content format change
```

**Content Format**:
```html
<!-- Example stored content -->
<p>This is a paragraph with <strong>bold</strong> text.</p>
<ul>
  <li>Bullet point 1</li>
  <li>Bullet point 2
    <ul>
      <li>Sub-bullet 1</li>
      <li>Sub-bullet 2</li>
    </ul>
  </li>
</ul>
<div class="task-item">
  <label><input type="checkbox" checked> Completed task</label>
  <div class="task-content">Task description</div>
</div>
<div class="media-block image-block">
  <img src="image-url" alt="Alt text" />
  <div class="media-description">Image description here</div>
</div>
```

### Component State Management

**Editor State**:
```typescript
interface EditorState {
  content: string;           // HTML content
  isDirty: boolean;         // Has unsaved changes
  lastSaved: Date;          // Last save timestamp
  isAutoSaving: boolean;    // Auto-save in progress
  slashMenuOpen: boolean;   // Slash command menu state
  selectedRange: Range | null; // Current selection
}
```

## Error Handling

### Paste Operation Errors
- **Invalid HTML**: Fallback to plain text processing
- **Large Content**: Warn user and offer to truncate
- **Unsupported Media**: Show error message and skip unsupported elements

### Media Embedding Errors
- **Invalid YouTube URL**: Show validation error and prompt for correction
- **Image Upload Failure**: Display error message and allow retry
- **Network Issues**: Cache content locally and retry when connection restored

### Auto-save Errors
- **Network Failure**: Queue changes locally and retry
- **Server Error**: Show warning and allow manual save
- **Concurrent Edits**: Detect conflicts and offer merge options

## Testing Strategy

### Unit Tests
- **PasteHandler**: Test various paste scenarios (HTML, plain text, mixed content)
- **MediaComponents**: Test image and YouTube embedding with descriptions
- **SlashCommand**: Test command filtering and execution
- **List Management**: Test bullet/numbered list creation and nesting

### Integration Tests
- **Problem Switching**: Verify content saves/loads correctly when switching problems
- **Auto-save**: Test auto-save functionality with rich content
- **Cross-tab Consistency**: Ensure notes and solution tabs work independently

### User Acceptance Tests
- **Paste Formatting**: Test pasting from various sources (Word, Google Docs, web pages)
- **Media Workflow**: Test complete image and YouTube embedding workflow
- **Keyboard Navigation**: Test all keyboard shortcuts and navigation
- **List Creation**: Test creating and managing nested lists

## Performance Considerations

### Content Processing
- **Lazy Loading**: Load media components only when visible
- **Debounced Auto-save**: Prevent excessive save operations during rapid typing
- **Content Sanitization**: Sanitize pasted HTML to prevent XSS attacks

### Memory Management
- **Event Cleanup**: Properly remove event listeners when components unmount
- **Image Optimization**: Compress uploaded images before storage
- **Content Caching**: Cache processed content to avoid re-processing

## Security Considerations

### Content Sanitization
- **HTML Sanitization**: Use DOMPurify or similar to sanitize pasted HTML
- **URL Validation**: Validate YouTube URLs and image URLs before embedding
- **XSS Prevention**: Escape user content in descriptions and text fields

### File Upload Security
- **File Type Validation**: Restrict uploads to image file types only
- **File Size Limits**: Implement reasonable file size limits for images
- **Content Scanning**: Scan uploaded files for malicious content

## Migration Strategy

### Existing Content
- **Backward Compatibility**: Ensure existing plain text notes continue to work
- **Gradual Migration**: Convert plain text to HTML format on first edit
- **Data Preservation**: Maintain original content as backup during migration

### Rollback Plan
- **Feature Toggle**: Implement feature flag to quickly disable rich text editor
- **Content Fallback**: Provide plain text fallback for rich text content
- **Database Rollback**: Maintain ability to revert to plain text storage if needed