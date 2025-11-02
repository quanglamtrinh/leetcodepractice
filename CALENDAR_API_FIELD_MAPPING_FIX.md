# Calendar API Field Mapping Fix

## Issue Description

The calendar task creation was failing with a 400 Bad Request error:
```
Error: event_type, title, and event_date are required
```

## Root Cause

There was a mismatch between the client-side and server-side field names:

- **Client-side** (TypeScript types): Used `date` field
- **Server-side** (API endpoint): Expected `event_date` field

## Files Affected

### 1. Client-side Types (`client/src/types/calendar.ts`)
```typescript
export interface CreateEventRequest {
  title: string;
  description?: string;
  date: string;           // ← Client uses 'date'
  event_type: EventType;
  start_time?: string;
  end_time?: string;
  priority?: Priority;
  problem_id?: number;
}
```

### 2. Server-side API (`server.js`)
```javascript
app.post('/api/calendar/events', async (req, res) => {
  const {
    event_type,
    title,
    description,
    event_date,              // ← Server expects 'event_date'
    event_time,
    // ... other fields
  } = req.body;
  
  // Validation
  if (!event_type || !title || !event_date) {
    return res.status(400).json({
      error: 'event_type, title, and event_date are required'
    });
  }
```

## Solution Implemented

Updated the `CalendarService` class to map client-side field names to server-side field names:

### Updated `createEvent` method:
```typescript
async createEvent(eventData: CreateEventRequest): Promise<CalendarEvent> {
  // ... validation ...
  
  // Map client-side field names to server-side field names
  const serverEventData = {
    event_type: eventData.event_type,
    title: eventData.title,
    description: eventData.description,
    event_date: eventData.date,        // ← Map 'date' to 'event_date'
    event_time: eventData.start_time,  // ← Map 'start_time' to 'event_time'
    duration_minutes: eventData.end_time ? 
      this.calculateDurationMinutes(eventData.start_time, eventData.end_time) : undefined,
    priority: eventData.priority || 'medium',
    problem_id: eventData.problem_id
  };

  const response = await apiRequest<CalendarEvent>(
    '/api/calendar/events',
    {
      method: 'POST',
      body: JSON.stringify(serverEventData)  // ← Send mapped data
    }
  );
  
  // ... rest of method ...
}
```

### Updated `updateEvent` method:
```typescript
async updateEvent(eventId: number, updates: UpdateEventRequest): Promise<CalendarEvent> {
  // Map client-side field names to server-side field names
  const serverUpdates: any = { ...updates };
  
  if (updates.date) {
    serverUpdates.event_date = updates.date;
    delete serverUpdates.date;
  }
  
  if (updates.start_time) {
    serverUpdates.event_time = updates.start_time;
    delete serverUpdates.start_time;
  }
  
  if (updates.status) {
    serverUpdates.task_status = updates.status;
    delete serverUpdates.status;
  }

  // ... rest of method ...
}
```

### Added helper method:
```typescript
private calculateDurationMinutes(startTime?: string, endTime?: string): number | undefined {
  if (!startTime || !endTime) return undefined;
  
  try {
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    const diffMs = end.getTime() - start.getTime();
    return Math.max(0, Math.floor(diffMs / (1000 * 60)));
  } catch (error) {
    console.error('Error calculating duration:', error);
    return undefined;
  }
}
```

## Field Mapping Summary

| Client Field | Server Field | Description |
|-------------|-------------|-------------|
| `date` | `event_date` | Event date in YYYY-MM-DD format |
| `start_time` | `event_time` | Event start time in HH:MM format |
| `end_time` | `duration_minutes` | Calculated duration in minutes |
| `status` | `task_status` | Task status (pending, completed, overdue) |

## Testing

Created test files to verify the fix:
- `test-calendar-api-fix.js` - Node.js test script
- `test-calendar-task-creation.html` - Browser-based test

## Impact

This fix resolves the calendar task creation issue and ensures that:
1. ✅ Tasks can be created successfully from the Day Detail View
2. ✅ Events can be created with proper field mapping
3. ✅ Notes can be created without errors
4. ✅ Task updates work correctly
5. ✅ The client-side API remains consistent while server compatibility is maintained

## Status

🟢 **FIXED** - Calendar task creation now works correctly with proper field mapping between client and server.