# Design Document

## Overview

The Novel Notes Replacement design focuses on seamlessly integrating the existing NovelNotesTab component to replace the current NotesTab implementation. The design leverages the existing Novel editor infrastructure while ensuring backward compatibility, maintaining current functionality, and minimizing additional dependencies.

## Architecture

### Component Structure

```
Novel Notes Integration
├── NovelNotesTab (existing, enhanced)
├── Novel Editor Dependencies (existing)
│   ├── EditorRoot, EditorContent, EditorCommand
│   ├── StarterKit, TaskList, TaskItem
│   └── TiptapUnderline, Placeholder, TiptapLink
├── Integration Layer (new)
│   ├── TabSwitchingIntegration
│   └── BackwardCompatibilityConverter
└── Styling Integration (enhanced)
    ├── novel-editor.css (existing)
    └── Application CSS Integration
```

### Integration Points

1. **Main Application Integration**: Replace NotesTab component references with NovelNotesTab
2. **Database Integration**: Maintain existing API endpoints (`/api/problems/:id/notes`)
3. **Problem Selection System**: Hook into existing problem switching logic
4. **Tab System**: Integrate with existing tab switching functionality
5. **Auto-save System**: Maintain current auto-save behavior with Novel's content format

## Components and Interfaces

### Enhanced NovelNotesTab Component

**Purpose**: Primary notes editor component using Novel's rich text capabilities

**Enhanced Props Interface**:
```typescript
interface NovelNotesTabProps {
  problem: Problem;
  onNotesSaved?: (problemId: number, notes: string) => void;
  className?: string;
  autoSaveDelay?: number;
}
```

**Key Enhancements**:
- Improved content conversion for backward compatibility
- Enhanced error handling and status reporting
- Better integration with existing application styling
- Optimized auto-save with debouncing

### BackwardCompatibilityConverter Utility

**Purpose**: Convert existing notes formats to Novel JSONContent format

**Interface**:
```typescript
interface BackwardCompatibilityConverter {
  convertToNovelFormat(notes: string | any[]): JSONContent;
  convertBlocksToNovel(blocks: Block[]): JSONContent;
  convertHtmlToNovel(html: string): JSONContent;
  convertPlainTextToNovel(text: string): JSONContent;
}
```

**Conversion Logic**:
```typescript
// Block format conversion
const convertBlocksToNovelContent = (blocks: Block[]): JSONContent => {
  const content = blocks.map(block => {
    switch (block.type) {
      case 'heading':
        return {
          type: 'heading',
          attrs: { level: 1 },
          content: block.content ? [{ type: 'text', text: block.content }] : []
        };
      case 'bullet':
        return {
          type: 'bulletList',
          content: [{
            type: 'listItem',
            content: [{
              type: 'paragraph',
              content: block.content ? [{ type: 'text', text: block.content }] : []
            }]
          }]
        };
      case 'code':
        return {
          type: 'codeBlock',
          content: block.content ? [{ type: 'text', text: block.content }] : []
        };
      // ... other block types
      default:
        return {
          type: 'paragraph',
          content: block.content ? [{ type: 'text', text: block.content }] : []
        };
    }
  });

  return {
    type: 'doc',
    content: content.length > 0 ? content : [{ type: 'paragraph', content: [] }]
  };
};
```

### Integration Layer Components

#### TabSwitchingIntegration

**Purpose**: Ensure seamless integration with existing tab switching logic

**Implementation**:
```typescript
// Integration with existing tab system
const integrationLayer = {
  // Hook into existing tab switching
  onTabSwitch: (tabName: string) => {
    if (tabName === 'notes') {
      // Ensure Novel editor is properly initialized
      initializeNovelEditor();
    }
  },
  
  // Hook into existing problem selection
  onProblemChange: (problem: Problem) => {
    // Load notes for new problem
    loadNotesForProblem(problem);
  }
};
```

## Data Models

### Novel JSONContent Storage

**Database Schema** (no changes needed):
```sql
-- Existing notes field will store Novel JSONContent as JSON string
-- No schema modifications required
```

**Content Format Examples**:
```json
{
  "type": "doc",
  "content": [
    {
      "type": "heading",
      "attrs": { "level": 1 },
      "content": [{ "type": "text", "text": "Problem Analysis" }]
    },
    {
      "type": "bulletList",
      "content": [
        {
          "type": "listItem",
          "content": [
            {
              "type": "paragraph",
              "content": [{ "type": "text", "text": "Time complexity: O(n)" }]
            }
          ]
        }
      ]
    },
    {
      "type": "taskList",
      "content": [
        {
          "type": "taskItem",
          "attrs": { "checked": false },
          "content": [
            {
              "type": "paragraph",
              "content": [{ "type": "text", "text": "Review edge cases" }]
            }
          ]
        }
      ]
    }
  ]
}
```

### Content Migration Strategy

**Migration Flow**:
```typescript
const migrateContent = (existingNotes: string): JSONContent => {
  // 1. Try parsing as existing Novel JSONContent
  try {
    const parsed = JSON.parse(existingNotes);
    if (parsed.type === 'doc' && parsed.content) {
      return parsed; // Already in Novel format
    }
  } catch (e) {
    // Continue to other formats
  }

  // 2. Try parsing as old block format
  try {
    const parsed = JSON.parse(existingNotes);
    if (Array.isArray(parsed) && parsed[0]?.id && parsed[0]?.type) {
      return convertBlocksToNovelContent(parsed);
    }
  } catch (e) {
    // Continue to HTML/text format
  }

  // 3. Treat as HTML or plain text
  if (existingNotes.includes('<') && existingNotes.includes('>')) {
    return convertHtmlToNovel(existingNotes);
  } else {
    return convertPlainTextToNovel(existingNotes);
  }
};
```

## Error Handling

### Content Loading Errors
- **Invalid JSON**: Fallback to treating content as plain text
- **Corrupted Data**: Display error message and provide option to clear notes
- **Network Issues**: Show offline indicator and queue saves for later

### Auto-save Errors
- **Network Failure**: Queue changes locally and retry when connection restored
- **Server Error**: Display warning and provide manual save option
- **Validation Errors**: Show specific error message and prevent data loss

### Migration Errors
- **Conversion Failure**: Log error and fallback to plain text conversion
- **Partial Migration**: Preserve what can be converted and note issues
- **Format Detection Failure**: Default to plain text format

## Testing Strategy

### Unit Tests
- **Content Conversion**: Test all conversion scenarios (blocks, HTML, plain text)
- **Auto-save Logic**: Test debouncing and error handling
- **Backward Compatibility**: Test loading various existing note formats
- **Novel Integration**: Test Novel editor initialization and content handling

### Integration Tests
- **Problem Switching**: Verify notes save/load correctly when switching problems
- **Tab Switching**: Ensure Novel editor works properly with tab system
- **Database Integration**: Test save/load operations with various content types
- **Error Recovery**: Test behavior when saves fail or content is corrupted

### User Acceptance Tests
- **Content Migration**: Test upgrading from old format to Novel format
- **Rich Text Features**: Test all Novel editor features work as expected
- **Performance**: Ensure no noticeable slowdown compared to current editor
- **Cross-browser**: Test Novel editor works in all supported browsers

## Performance Considerations

### Loading Optimization
- **Lazy Loading**: Novel editor components loaded only when notes tab is active
- **Content Caching**: Cache converted content to avoid re-processing
- **Debounced Operations**: Prevent excessive auto-save calls during rapid typing

### Memory Management
- **Editor Cleanup**: Properly dispose of Novel editor instances when switching problems
- **Content Optimization**: Minimize JSON content size for large notes
- **Event Cleanup**: Remove event listeners when components unmount

## Security Considerations

### Content Sanitization
- **Novel Built-in**: Leverage Novel's built-in content sanitization
- **Input Validation**: Validate JSONContent structure before saving
- **XSS Prevention**: Ensure Novel editor prevents XSS attacks through content

### Data Integrity
- **Content Validation**: Validate JSONContent format before database storage
- **Backup Strategy**: Maintain ability to recover from corrupted content
- **Migration Safety**: Ensure content migration doesn't lose or corrupt data

## Implementation Strategy

### Phase 1: Component Integration
1. Enhance existing NovelNotesTab component with improved error handling
2. Create BackwardCompatibilityConverter utility
3. Add integration hooks for tab switching and problem selection

### Phase 2: Application Integration
1. Replace NotesTab references with NovelNotesTab in main application
2. Update CSS imports to include Novel editor styles
3. Test integration with existing tab system

### Phase 3: Migration and Testing
1. Implement content migration logic for existing notes
2. Add comprehensive error handling and status reporting
3. Conduct thorough testing across different note formats

### Phase 4: Deployment and Monitoring
1. Deploy with feature flag for easy rollback if needed
2. Monitor for any issues with content loading or saving
3. Gather user feedback and make adjustments as needed

## Rollback Plan

### Quick Rollback
- **Component Swap**: Revert to original NotesTab component
- **Content Compatibility**: Ensure Novel JSONContent can be read by old editor
- **Database Rollback**: No database changes needed, content remains compatible

### Data Preservation
- **Content Format**: Novel JSONContent can be converted back to text if needed
- **Backup Strategy**: Maintain original content format during migration period
- **Recovery Tools**: Provide tools to recover content if migration issues occur