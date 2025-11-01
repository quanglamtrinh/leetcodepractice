import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CalendarCell from '../CalendarCell';
import { CalendarEvent, Problem } from '../../../types/calendar';

// Mock the tooltip component to avoid complex DOM testing
jest.mock('../CalendarCellTooltip', () => {
  return function MockCalendarCellTooltip() {
    return <div data-testid="tooltip">Tooltip</div>;
  };
});

describe('CalendarCell', () => {
  const mockDate = new Date('2025-01-15');
  const mockCurrentMonth = new Date('2025-01-01');
  const mockOnClick = jest.fn();

  const mockEvents: CalendarEvent[] = [
    {
      id: 1,
      title: 'Test Task',
      date: '2025-01-15',
      event_type: 'task',
      status: 'pending',
      priority: 'medium',
      created_at: '2025-01-15T00:00:00Z',
      updated_at: '2025-01-15T00:00:00Z'
    }
  ];

  const mockProblems: Problem[] = [
    {
      id: 1,
      title: 'Two Sum',
      difficulty: 'Easy',
      concept: 'Arrays',
      solved: true,
      solved_date: '2025-01-15'
    }
  ];

  beforeEach(() => {
    mockOnClick.mockClear();
  });

  it('renders the date correctly', () => {
    render(
      <CalendarCell
        date={mockDate}
        currentMonth={mockCurrentMonth}
        events={[]}
        solvedProblems={[]}
        onClick={mockOnClick}
      />
    );

    expect(screen.getByText('15')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    render(
      <CalendarCell
        date={mockDate}
        currentMonth={mockCurrentMonth}
        events={[]}
        solvedProblems={[]}
        onClick={mockOnClick}
      />
    );

    fireEvent.click(screen.getByText('15'));
    expect(mockOnClick).toHaveBeenCalledWith(mockDate);
  });

  it('shows problem indicators when problems exist', () => {
    render(
      <CalendarCell
        date={mockDate}
        currentMonth={mockCurrentMonth}
        events={[]}
        solvedProblems={mockProblems}
        onClick={mockOnClick}
      />
    );

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByTitle('1 Easy problems')).toBeInTheDocument();
  });

  it('shows event indicators when events exist', () => {
    render(
      <CalendarCell
        date={mockDate}
        currentMonth={mockCurrentMonth}
        events={mockEvents}
        solvedProblems={[]}
        onClick={mockOnClick}
      />
    );

    expect(screen.getByText('📋')).toBeInTheDocument();
    expect(screen.getByTitle('1 pending tasks')).toBeInTheDocument();
  });

  it('applies correct CSS classes', () => {
    const { container } = render(
      <CalendarCell
        date={mockDate}
        currentMonth={mockCurrentMonth}
        events={mockEvents}
        solvedProblems={mockProblems}
        onClick={mockOnClick}
      />
    );

    const cell = container.querySelector('.calendar-cell');
    expect(cell).toHaveClass('has-events');
    expect(cell).toHaveClass('has-problems');
  });
});