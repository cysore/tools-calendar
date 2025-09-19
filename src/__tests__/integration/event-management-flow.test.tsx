/**
 * Integration tests for event management flow
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render, mockUser, mockTeam, mockEvent } from '../test-utils';
import { CalendarView } from '@/components/calendar/CalendarView';
import { EventModal } from '@/components/calendar/EventModal';
import { EventForm } from '@/components/calendar/EventForm';

// Mock FullCalendar
jest.mock('@fullcalendar/react', () => {
  return function MockFullCalendar({ events, eventClick, dateClick }: any) {
    return (
      <div data-testid="calendar">
        <div data-testid="calendar-events">
          {events?.map((event: any) => (
            <div
              key={event.id}
              data-testid={`event-${event.id}`}
              onClick={() => eventClick?.({ event })}
            >
              {event.title}
            </div>
          ))}
        </div>
        <button
          data-testid="add-event-btn"
          onClick={() => dateClick?.({ date: new Date('2024-01-15') })}
        >
          Add Event
        </button>
      </div>
    );
  };
});

// Mock NextAuth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: { user: mockUser },
    status: 'authenticated',
  })),
}));

// Mock fetch
global.fetch = jest.fn();

describe('Event Management Flow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  describe('Event Creation Flow', () => {
    it('completes full event creation process', async () => {
      const user = userEvent.setup();

      const newEvent = {
        id: 'event-2',
        teamId: mockTeam.id,
        title: 'New Meeting',
        startTime: '2024-01-15T10:00:00Z',
        endTime: '2024-01-15T11:00:00Z',
        isAllDay: false,
        location: 'Conference Room A',
        description: 'Team planning meeting',
        category: 'meeting',
        color: '#3B82F6',
        createdBy: mockUser.id,
        createdAt: '2024-01-15T00:00:00Z',
        updatedAt: '2024-01-15T00:00:00Z',
      };

      // Mock event creation API
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { event: newEvent },
        }),
      });

      const TestComponent = () => {
        const [events, setEvents] = React.useState([mockEvent]);
        const [isModalOpen, setIsModalOpen] = React.useState(false);
        const [selectedDate, setSelectedDate] = React.useState<Date | null>(
          null
        );

        const handleEventCreated = (event: any) => {
          setEvents(prev => [...prev, event]);
          setIsModalOpen(false);
        };

        const handleDateClick = (date: Date) => {
          setSelectedDate(date);
          setIsModalOpen(true);
        };

        return (
          <div>
            <CalendarView
              events={events}
              view="month"
              onViewChange={() => {}}
              onEventClick={() => {}}
              onDateClick={handleDateClick}
            />
            <EventModal
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              onSave={handleEventCreated}
              defaultDate={selectedDate}
              teamId={mockTeam.id}
            />
          </div>
        );
      };

      render(<TestComponent />);

      // Verify initial event is displayed
      expect(screen.getByTestId('event-event-1')).toBeInTheDocument();

      // Click on a date to create new event
      await user.click(screen.getByTestId('add-event-btn'));

      // Verify modal opened
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Fill event form
      await user.type(screen.getByLabelText(/事件标题/), 'New Meeting');
      await user.type(screen.getByLabelText(/地点/), 'Conference Room A');
      await user.type(screen.getByLabelText(/描述/), 'Team planning meeting');

      // Set time
      await user.type(screen.getByLabelText(/开始时间/), '10:00');
      await user.type(screen.getByLabelText(/结束时间/), '11:00');

      // Select category
      await user.click(screen.getByLabelText(/分类/));
      await user.click(screen.getByText('会议'));

      // Submit form
      await user.click(screen.getByRole('button', { name: '保存事件' }));

      // Verify API call
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(`/api/teams/${mockTeam.id}/events`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'New Meeting',
            startTime: '2024-01-15T10:00:00.000Z',
            endTime: '2024-01-15T11:00:00.000Z',
            isAllDay: false,
            location: 'Conference Room A',
            description: 'Team planning meeting',
            category: 'meeting',
            color: '#3B82F6',
          }),
        });
      });

      // Verify new event appears in calendar
      await waitFor(() => {
        expect(screen.getByTestId('event-event-2')).toBeInTheDocument();
      });
    });

    it('creates all-day event', async () => {
      const user = userEvent.setup();

      const allDayEvent = {
        ...mockEvent,
        id: 'event-all-day',
        title: 'All Day Event',
        isAllDay: true,
        startTime: '2024-01-15T00:00:00Z',
        endTime: '2024-01-15T23:59:59Z',
      };

      // Mock API response
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { event: allDayEvent },
        }),
      });

      const TestComponent = () => {
        const [isModalOpen, setIsModalOpen] = React.useState(true);

        return (
          <EventModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSave={() => {}}
            defaultDate={new Date('2024-01-15')}
            teamId={mockTeam.id}
          />
        );
      };

      render(<TestComponent />);

      // Fill basic event info
      await user.type(screen.getByLabelText(/事件标题/), 'All Day Event');

      // Enable all-day option
      await user.click(screen.getByLabelText(/全天事件/));

      // Submit form
      await user.click(screen.getByRole('button', { name: '保存事件' }));

      // Verify API call with all-day event data
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(`/api/teams/${mockTeam.id}/events`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            expect.objectContaining({
              title: 'All Day Event',
              isAllDay: true,
            })
          ),
        });
      });
    });

    it('validates required fields', async () => {
      const user = userEvent.setup();

      const TestComponent = () => {
        const [isModalOpen, setIsModalOpen] = React.useState(true);

        return (
          <EventModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSave={() => {}}
            teamId={mockTeam.id}
          />
        );
      };

      render(<TestComponent />);

      // Try to submit without title
      await user.click(screen.getByRole('button', { name: '保存事件' }));

      // Verify validation error
      expect(screen.getByText('请输入事件标题')).toBeInTheDocument();
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe('Event Editing Flow', () => {
    it('completes event editing process', async () => {
      const user = userEvent.setup();

      const updatedEvent = {
        ...mockEvent,
        title: 'Updated Event Title',
        description: 'Updated description',
      };

      // Mock event update API
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { event: updatedEvent },
        }),
      });

      const TestComponent = () => {
        const [isModalOpen, setIsModalOpen] = React.useState(true);

        return (
          <EventModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSave={() => {}}
            event={mockEvent}
            teamId={mockTeam.id}
          />
        );
      };

      render(<TestComponent />);

      // Verify form is pre-filled with existing event data
      expect(screen.getByDisplayValue('Test Event')).toBeInTheDocument();

      // Update event title
      const titleInput = screen.getByLabelText(/事件标题/);
      await user.clear(titleInput);
      await user.type(titleInput, 'Updated Event Title');

      // Update description
      const descriptionInput = screen.getByLabelText(/描述/);
      await user.clear(descriptionInput);
      await user.type(descriptionInput, 'Updated description');

      // Submit form
      await user.click(screen.getByRole('button', { name: '保存事件' }));

      // Verify API call
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          `/api/teams/${mockTeam.id}/events/${mockEvent.id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(
              expect.objectContaining({
                title: 'Updated Event Title',
                description: 'Updated description',
              })
            ),
          }
        );
      });
    });

    it('handles event deletion', async () => {
      const user = userEvent.setup();

      // Mock confirmation
      window.confirm = jest.fn(() => true);

      // Mock event deletion API
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const TestComponent = () => {
        const [events, setEvents] = React.useState([mockEvent]);
        const [isModalOpen, setIsModalOpen] = React.useState(true);

        const handleEventDeleted = () => {
          setEvents(prev => prev.filter(e => e.id !== mockEvent.id));
          setIsModalOpen(false);
        };

        return (
          <div>
            <div data-testid="events-count">{events.length}</div>
            <EventModal
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              onSave={() => {}}
              onDelete={handleEventDeleted}
              event={mockEvent}
              teamId={mockTeam.id}
            />
          </div>
        );
      };

      render(<TestComponent />);

      // Verify initial event count
      expect(screen.getByTestId('events-count')).toHaveTextContent('1');

      // Click delete button
      await user.click(screen.getByRole('button', { name: '删除事件' }));

      // Verify confirmation was shown
      expect(window.confirm).toHaveBeenCalledWith('确定要删除这个事件吗？');

      // Verify API call
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          `/api/teams/${mockTeam.id}/events/${mockEvent.id}`,
          { method: 'DELETE' }
        );
      });

      // Verify event was removed
      expect(screen.getByTestId('events-count')).toHaveTextContent('0');
    });
  });

  describe('Calendar View Integration', () => {
    it('switches between different calendar views', async () => {
      const user = userEvent.setup();

      const TestComponent = () => {
        const [view, setView] = React.useState<'month' | 'week' | 'list'>(
          'month'
        );

        return (
          <div>
            <div data-testid="current-view">{view}</div>
            <button onClick={() => setView('month')}>月视图</button>
            <button onClick={() => setView('week')}>周视图</button>
            <button onClick={() => setView('list')}>列表视图</button>
            <CalendarView
              events={[mockEvent]}
              view={view}
              onViewChange={setView}
              onEventClick={() => {}}
              onDateClick={() => {}}
            />
          </div>
        );
      };

      render(<TestComponent />);

      // Verify initial view
      expect(screen.getByTestId('current-view')).toHaveTextContent('month');

      // Switch to week view
      await user.click(screen.getByText('周视图'));
      expect(screen.getByTestId('current-view')).toHaveTextContent('week');

      // Switch to list view
      await user.click(screen.getByText('列表视图'));
      expect(screen.getByTestId('current-view')).toHaveTextContent('list');
    });

    it('filters events by category', async () => {
      const user = userEvent.setup();

      const meetingEvent = { ...mockEvent, category: 'meeting' };
      const taskEvent = {
        ...mockEvent,
        id: 'event-2',
        category: 'task',
        title: 'Task Event',
      };
      const allEvents = [meetingEvent, taskEvent];

      const TestComponent = () => {
        const [selectedCategory, setSelectedCategory] =
          React.useState<string>('all');

        const filteredEvents =
          selectedCategory === 'all'
            ? allEvents
            : allEvents.filter(e => e.category === selectedCategory);

        return (
          <div>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              aria-label="分类筛选"
            >
              <option value="all">全部</option>
              <option value="meeting">会议</option>
              <option value="task">任务</option>
            </select>
            <div data-testid="filtered-events-count">
              {filteredEvents.length}
            </div>
            <CalendarView
              events={filteredEvents}
              view="month"
              onViewChange={() => {}}
              onEventClick={() => {}}
              onDateClick={() => {}}
            />
          </div>
        );
      };

      render(<TestComponent />);

      // Verify all events shown initially
      expect(screen.getByTestId('filtered-events-count')).toHaveTextContent(
        '2'
      );

      // Filter by meeting category
      await user.selectOptions(screen.getByLabelText('分类筛选'), 'meeting');
      expect(screen.getByTestId('filtered-events-count')).toHaveTextContent(
        '1'
      );

      // Filter by task category
      await user.selectOptions(screen.getByLabelText('分类筛选'), 'task');
      expect(screen.getByTestId('filtered-events-count')).toHaveTextContent(
        '1'
      );

      // Show all events
      await user.selectOptions(screen.getByLabelText('分类筛选'), 'all');
      expect(screen.getByTestId('filtered-events-count')).toHaveTextContent(
        '2'
      );
    });

    it('handles date navigation', async () => {
      const user = userEvent.setup();

      const TestComponent = () => {
        const [currentDate, setCurrentDate] = React.useState(
          new Date('2024-01-15')
        );

        const navigateMonth = (direction: 'prev' | 'next') => {
          setCurrentDate(prev => {
            const newDate = new Date(prev);
            if (direction === 'prev') {
              newDate.setMonth(newDate.getMonth() - 1);
            } else {
              newDate.setMonth(newDate.getMonth() + 1);
            }
            return newDate;
          });
        };

        return (
          <div>
            <div data-testid="current-month">
              {currentDate.toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'long',
              })}
            </div>
            <button onClick={() => navigateMonth('prev')}>上个月</button>
            <button onClick={() => navigateMonth('next')}>下个月</button>
            <CalendarView
              events={[mockEvent]}
              view="month"
              onViewChange={() => {}}
              onEventClick={() => {}}
              onDateClick={() => {}}
              currentDate={currentDate}
            />
          </div>
        );
      };

      render(<TestComponent />);

      // Verify initial month
      expect(screen.getByTestId('current-month')).toHaveTextContent(
        '2024年1月'
      );

      // Navigate to next month
      await user.click(screen.getByText('下个月'));
      expect(screen.getByTestId('current-month')).toHaveTextContent(
        '2024年2月'
      );

      // Navigate to previous month
      await user.click(screen.getByText('上个月'));
      expect(screen.getByTestId('current-month')).toHaveTextContent(
        '2024年1月'
      );
    });
  });

  describe('Event Permissions and Validation', () => {
    it('validates user permissions for event operations', async () => {
      const user = userEvent.setup();

      // Mock permission check API that returns forbidden
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({
          success: false,
          error: { code: 'FORBIDDEN', message: '权限不足' },
        }),
      });

      const TestComponent = () => {
        const [isModalOpen, setIsModalOpen] = React.useState(true);
        const [error, setError] = React.useState('');

        const handleSave = async (eventData: any) => {
          try {
            const response = await fetch(`/api/teams/${mockTeam.id}/events`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(eventData),
            });

            if (!response.ok) {
              const errorData = await response.json();
              setError(errorData.error.message);
              return;
            }
          } catch (err) {
            setError('操作失败');
          }
        };

        return (
          <div>
            {error && <div data-testid="error-message">{error}</div>}
            <EventModal
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              onSave={handleSave}
              teamId={mockTeam.id}
            />
          </div>
        );
      };

      render(<TestComponent />);

      // Fill and submit form
      await user.type(screen.getByLabelText(/事件标题/), 'Test Event');
      await user.click(screen.getByRole('button', { name: '保存事件' }));

      // Verify permission error is displayed
      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent(
          '权限不足'
        );
      });
    });

    it('validates event time constraints', async () => {
      const user = userEvent.setup();

      const TestComponent = () => {
        const [isModalOpen, setIsModalOpen] = React.useState(true);

        return (
          <EventModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSave={() => {}}
            teamId={mockTeam.id}
          />
        );
      };

      render(<TestComponent />);

      // Fill form with invalid time range (end before start)
      await user.type(screen.getByLabelText(/事件标题/), 'Test Event');
      await user.type(screen.getByLabelText(/开始时间/), '14:00');
      await user.type(screen.getByLabelText(/结束时间/), '13:00');

      // Submit form
      await user.click(screen.getByRole('button', { name: '保存事件' }));

      // Verify validation error
      expect(screen.getByText('结束时间不能早于开始时间')).toBeInTheDocument();
      expect(fetch).not.toHaveBeenCalled();
    });
  });
});
