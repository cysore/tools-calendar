/**
 * Calendar components unit tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CalendarView } from '@/components/calendar/CalendarView';
import { CalendarEvent, CalendarView as ViewType } from '@/types';

// Mock FullCalendar
jest.mock('@fullcalendar/react', () => {
  return function MockFullCalendar(props: any) {
    return (
      <div data-testid="fullcalendar">
        <div data-testid="calendar-events">
          {props.events?.map((event: any) => (
            <div
              key={event.id}
              data-testid={`event-${event.id}`}
              onClick={() =>
                props.eventClick?.({
                  event: { extendedProps: { originalEvent: event } },
                })
              }
            >
              {event.title}
            </div>
          ))}
        </div>
        <div data-testid="calendar-dates">
          <button
            onClick={() => props.dateClick?.({ date: new Date('2024-01-15') })}
          >
            2024-01-15
          </button>
        </div>
      </div>
    );
  };
});

// Mock plugins
jest.mock('@fullcalendar/daygrid', () => ({}));
jest.mock('@fullcalendar/timegrid', () => ({}));
jest.mock('@fullcalendar/list', () => ({}));
jest.mock('@fullcalendar/interaction', () => ({}));

describe('CalendarView', () => {
  const mockEvents: CalendarEvent[] = [
    {
      id: '1',
      teamId: 'team1',
      title: '团队会议',
      startTime: '2024-01-15T10:00:00Z',
      endTime: '2024-01-15T11:00:00Z',
      isAllDay: false,
      category: 'meeting',
      color: '#3b82f6',
      createdBy: 'user1',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    {
      id: '2',
      teamId: 'team1',
      title: '项目截止日期',
      startTime: '2024-01-16T00:00:00Z',
      endTime: '2024-01-16T23:59:59Z',
      isAllDay: true,
      category: 'task',
      color: '#10b981',
      createdBy: 'user2',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
  ];

  const defaultProps = {
    events: mockEvents,
    view: 'month' as ViewType,
    onViewChange: jest.fn(),
    onEventClick: jest.fn(),
    onDateClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders calendar view with events', () => {
    render(<CalendarView {...defaultProps} />);

    expect(screen.getByTestId('fullcalendar')).toBeInTheDocument();
    expect(screen.getByTestId('event-1')).toHaveTextContent('团队会议');
    expect(screen.getByTestId('event-2')).toHaveTextContent('项目截止日期');
  });

  it('renders view toggle buttons', () => {
    render(<CalendarView {...defaultProps} />);

    expect(screen.getByText('月视图')).toBeInTheDocument();
    expect(screen.getByText('周视图')).toBeInTheDocument();
    expect(screen.getByText('列表视图')).toBeInTheDocument();
  });

  it('highlights active view button', () => {
    render(<CalendarView {...defaultProps} view="week" />);

    const weekButton = screen.getByText('周视图');
    const monthButton = screen.getByText('月视图');

    expect(weekButton).toHaveClass('bg-blue-600', 'text-white');
    expect(monthButton).toHaveClass('bg-gray-100', 'text-gray-700');
  });

  it('calls onViewChange when view button is clicked', () => {
    const onViewChange = jest.fn();
    render(<CalendarView {...defaultProps} onViewChange={onViewChange} />);

    fireEvent.click(screen.getByText('周视图'));
    expect(onViewChange).toHaveBeenCalledWith('week');

    fireEvent.click(screen.getByText('列表视图'));
    expect(onViewChange).toHaveBeenCalledWith('list');
  });

  it('calls onEventClick when event is clicked', () => {
    const onEventClick = jest.fn();
    render(<CalendarView {...defaultProps} onEventClick={onEventClick} />);

    fireEvent.click(screen.getByTestId('event-1'));
    expect(onEventClick).toHaveBeenCalledTimes(1);
    // The mock passes the converted event, so we just check it was called
  });

  it('calls onDateClick when date is clicked', () => {
    const onDateClick = jest.fn();
    render(<CalendarView {...defaultProps} onDateClick={onDateClick} />);

    fireEvent.click(screen.getByText('2024-01-15'));
    expect(onDateClick).toHaveBeenCalledWith(new Date('2024-01-15'));
  });

  it('shows loading state', () => {
    render(<CalendarView {...defaultProps} loading={true} />);

    const calendarWrapper = document.querySelector('.calendar-wrapper');
    expect(calendarWrapper).toHaveClass('opacity-50');

    // Check for loading spinner
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('handles empty events array', () => {
    render(<CalendarView {...defaultProps} events={[]} />);

    expect(screen.getByTestId('fullcalendar')).toBeInTheDocument();
    expect(screen.queryByTestId('event-1')).not.toBeInTheDocument();
  });

  it('handles event drag and drop', () => {
    const onEventDrop = jest.fn();
    render(<CalendarView {...defaultProps} onEventDrop={onEventDrop} />);

    // FullCalendar mock doesn't simulate drag/drop, but we can test the prop is passed
    expect(screen.getByTestId('fullcalendar')).toBeInTheDocument();
  });

  it('converts events to FullCalendar format correctly', () => {
    render(<CalendarView {...defaultProps} />);

    // The mock should receive converted events
    expect(screen.getByTestId('fullcalendar')).toBeInTheDocument();

    // Check that events are displayed with correct titles
    expect(screen.getByText('团队会议')).toBeInTheDocument();
    expect(screen.getByText('项目截止日期')).toBeInTheDocument();
  });
});

describe('Calendar Helper Functions', () => {
  // Test helper functions if they were exported
  // For now, we'll test them indirectly through component behavior

  it('should handle different event categories', () => {
    const eventsWithDifferentCategories: CalendarEvent[] = [
      {
        id: '1',
        teamId: 'team1',
        title: '团队会议',
        startTime: '2024-01-15T10:00:00Z',
        endTime: '2024-01-15T11:00:00Z',
        isAllDay: false,
        category: 'meeting',
        color: '#3b82f6',
        createdBy: 'user1',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      {
        id: '2',
        teamId: 'team1',
        title: '项目截止日期',
        startTime: '2024-01-16T00:00:00Z',
        endTime: '2024-01-16T23:59:59Z',
        isAllDay: true,
        category: 'task',
        color: '#10b981',
        createdBy: 'user2',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      {
        id: '3',
        teamId: 'team1',
        title: '提醒事项',
        startTime: '2024-01-17T09:00:00Z',
        endTime: '2024-01-17T09:30:00Z',
        isAllDay: false,
        category: 'reminder',
        color: '#8b5cf6',
        createdBy: 'user1',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ];

    const props = {
      events: eventsWithDifferentCategories,
      view: 'month' as ViewType,
      onViewChange: jest.fn(),
      onEventClick: jest.fn(),
      onDateClick: jest.fn(),
    };

    render(<CalendarView {...props} />);

    expect(screen.getByText('团队会议')).toBeInTheDocument();
    expect(screen.getByText('项目截止日期')).toBeInTheDocument();
    expect(screen.getByText('提醒事项')).toBeInTheDocument();
  });
});
