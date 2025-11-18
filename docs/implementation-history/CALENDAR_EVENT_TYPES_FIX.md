# Calendar Event Types Fix

## Additional Issues Found

After fixing the field mapping issue, two more problems were discovered:

### 1. Invalid Event Type Error
```
Error: event_type must be one of: task, note, practice_session, reminder
```

**Root Cause**: The client was sending `event_type: 'event'` but the server only accepts `['task', 'note', 'practice_session', 'reminder']`.

### 2. Note Creation Error
```
Error: Event title is required
```

**Root Cause**: Notes could be created without a title, but the server requires all events to have a title.

## Solutions Implemented

### 1. Event Type Mapping Fix

**Updated Client-Side Types** (`client/src/types/calendar.ts`):
```typescript
// Before
export type EventType = 'task' | 'note' | 'practice_session' | 'event';

// After  
export type EventType = 'task' | 'note' | 'practice_session' | 'reminder';
```

**Updated Event Interface**:
```typescript
// Before
export interface Event extends CalendarEvent {
  event_type: 'event';
  start_time: string;
  end_time?: string;
}

// After
export interface Event extends CalendarEvent {
  event_type: 'reminder';
  start_time: string;
  end_time?: string;
}
```

**Updated Calendar Service** (`client/src/services/calendarService.ts`):
```typescript
async createCalendarEvent(eventData: Omit<CreateEventRequest, 'event_type'>): Promise<Event> {
  const data: CreateEventRequest = {
    ...eventData,
    event_type: 'reminder' // Map 'event' to 'reminder'
  };
  return this.createEvent(data) as Promise<Event>;
}
```

### 2. Note Title Auto-Generation Fix

**Updated Note Creation**:
```typescript
async createNote(noteData: Omit<CreateEventRequest, 'event_type'>): Promise<Note> {
  const eventData: CreateEventRequest = {
    ...noteData,
    event_type: 'note',
    // Ensure notes have a title (required by server)
    title: noteData.title || noteData.description || 'Untitled Note'
  };
  return this.createEvent(eventData) as Promise<Note>;
}
```

### 3. Component Updates

**Updated all references from 'event' to 'reminder'**:

- `CalendarCell.tsx`: `events.filter(e => e.event_type === 'reminder')`
- `CalendarCellTooltip.tsx`: `events.filter(e => e.event_type === 'reminder')`
- `DayDetailView.tsx`: Multiple references updated
- `CalendarWeekView.tsx`: Icon mapping updated
- `CalendarDayView.tsx`: Icon mapping updated

### 4. CSS Updates

**Updated CSS classes**:
```css
/* Before */
.event-indicator.event { ... }
.week-event.event { ... }
.day-event.event { ... }

/* After */
.event-indicator.reminder { ... }
.week-event.reminder { ... }
.day-event.reminder { ... }
```

## Files Modified

### Client-Side Files:
1. `client/src/types/calendar.ts` - Updated EventType and Event interface
2. `client/src/services/calendarService.ts` - Added event type mapping and note title generation
3. `client/src/components/calendar/CalendarCell.tsx` - Updated event type references
4. `client/src/components/calendar/CalendarCellTooltip.tsx` - Updated event type references
5. `client/src/components/calendar/DayDetailView.tsx` - Updated event type references
6. `client/src/components/calendar/CalendarWeekView.tsx` - Updated icon mapping
7. `client/src/components/calendar/CalendarDayView.tsx` - Updated icon mapping
8. `client/src/components/calendar/Calendar.css` - Updated CSS classes

## Event Type Mapping Summary

| Client Usage | Server Type | Description |
|-------------|-------------|-------------|
| `'task'` | `'task'` | Tasks with status and priority |
| `'note'` | `'note'` | Notes with auto-generated titles |
| `'event'` | `'reminder'` | Timed events/reminders |
| `'practice_session'` | `'practice_session'` | Coding practice sessions |

## Testing

Created `test-calendar-event-types-fix.html` to verify:
1. ✅ Task creation works
2. ✅ Event creation works (mapped to 'reminder')
3. ✅ Note creation works with auto-generated titles
4. ✅ Empty note creation works with fallback title

## Impact

These fixes resolve all calendar creation issues:
1. ✅ Tasks can be created successfully
2. ✅ Events can be created (mapped to 'reminder' type)
3. ✅ Notes can be created with or without titles
4. ✅ All calendar views display events correctly
5. ✅ CSS styling works for all event types

## Status

🟢 **FIXED** - All calendar event creation issues are now resolved. The calendar system is fully functional with proper event type mapping and note title handling.