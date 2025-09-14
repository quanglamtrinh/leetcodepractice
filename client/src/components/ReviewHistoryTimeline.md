# ReviewHistoryTimeline Component

## Overview

The `ReviewHistoryTimeline` component provides a comprehensive, interactive timeline view of a problem's review history in the spaced repetition system. It displays chronological review events with detailed information about each review session, including intensive recovery cycles and graduation events.

## Features

### Core Functionality
- **Chronological Timeline**: Shows all review events in reverse chronological order (newest first)
- **Expandable Entries**: Click on any timeline entry to view detailed information
- **Visual Indicators**: Different icons and colors for different review types (remembered, forgot, intensive recovery, initial)
- **Graduation Events**: Special visual treatment for when problems graduate from intensive recovery

### Filtering Options
- **Review Type Filter**: Filter by all reviews, normal reviews, intensive recovery, remembered, or forgot
- **Date Range Filter**: Filter by all time, last week, last month, or last 3 months
- **Real-time Results**: Shows count of filtered entries vs total entries

### Active Recovery Cycles
- **Live Status**: Shows currently active intensive recovery cycles
- **Cycle Information**: Displays remaining cycles, interval, and start date
- **Visual Prominence**: Highlighted section to draw attention to active recovery needs

### Detailed Information
Each timeline entry can be expanded to show:
- **Review Notes**: General notes about the review session
- **Confusion Notes**: Specific areas of confusion or difficulty
- **Specific Mistakes**: List of particular errors made
- **Review Metadata**: Stage, time spent, review type, and timestamps

## Usage

```tsx
import ReviewHistoryTimeline from './ReviewHistoryTimeline';

// Basic usage
<ReviewHistoryTimeline problemId={123} />

// With problem information
<ReviewHistoryTimeline 
  problemId={123}
  problemTitle="Two Sum"
  problemDifficulty="Easy"
  problemConcept="Array"
/>
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `problemId` | `number` | Yes | The ID of the problem to show history for |
| `problemTitle` | `string` | No | Display name of the problem |
| `problemDifficulty` | `string` | No | Difficulty level (Easy, Medium, Hard) |
| `problemConcept` | `string` | No | Main concept/category of the problem |

## Data Requirements

The component expects the following API endpoint to be available:
- `GET /api/reviews/history/:problemId` - Returns review history data

### Expected Data Structure

```typescript
interface ReviewHistoryData {
  success: boolean;
  problem_id: number;
  total_entries: number;
  history: ReviewHistoryEntry[];
  intensive_cycles: IntensiveRecoveryCycle[];
  pagination: {
    limit: number;
    offset: number;
    has_more: boolean;
  };
}
```

## Visual Design

### Timeline Structure
- **Timeline Connector**: Vertical line connecting all entries
- **Timeline Dots**: Colored circles with icons indicating review type
- **Content Cards**: Expandable cards with review information

### Color Coding
- **Green**: Remembered reviews (✅)
- **Red**: Forgot reviews (❌)
- **Blue**: Initial solve (🎯)
- **Orange**: Intensive recovery (🔥)

### Interactive Elements
- **Expand/Collapse**: Click entry headers to show/hide details
- **Filter Controls**: Dropdown menus for filtering timeline
- **Responsive Design**: Adapts to mobile and desktop screens

## Integration

The component integrates with the existing `ReviewHistoryTab` component and can be toggled between the legacy view and the enhanced timeline view using the toggle button.

## Testing

Comprehensive test suite covers:
- Loading states and error handling
- Data rendering and display
- Interactive functionality (expand/collapse)
- Filtering capabilities
- Edge cases (empty data, API errors)

Run tests with:
```bash
npm test -- --testPathPattern=ReviewHistoryTimeline.test.tsx
```

## Performance Considerations

- **Lazy Loading**: Large datasets are paginated
- **Efficient Filtering**: Client-side filtering for responsive interaction
- **Memoized Calculations**: Filtered data is memoized to prevent unnecessary recalculations
- **Optimized Rendering**: Only expanded entries render detailed content

## Accessibility

- **Keyboard Navigation**: All interactive elements are keyboard accessible
- **Screen Reader Support**: Proper ARIA labels and semantic HTML
- **Color Contrast**: Meets WCAG guidelines for color contrast
- **Focus Management**: Clear focus indicators for all interactive elements