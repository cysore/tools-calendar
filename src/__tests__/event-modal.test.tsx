import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EventModal } from '@/components/calendar/EventModal';
import { EventForm } from '@/components/calendar/EventForm';
import { EventDetails } from '@/components/calendar/EventDetails';
import { CalendarEvent, CreateEventFormData } from '@/types';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// Mock the team and auth providers
jest.mock('@/components/team/TeamProvider', () => ({
  useTeam: () => ({
    currentTeam: {
      id: 'team-1',
      name: 'Test Team',
    },
  }),
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
    },
  }),
}));

// Mock fetch
global.fetch = jest.fn();

const mockEvent: CalendarEvent = {
  id: 'event-1',
  teamId: 'team-1',
  title: 'Test Event',
  startTime: '2024-01-15T10:00:00Z',
  endTime: '2024-01-15T11:00:00Z',
  isAllDay: false,
  location: 'Test Location',
  description: 'Test Description',
  category: 'meeting',
  color: '#3B82F6',
  createdBy: 'user-1',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

describe('EventForm', () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders create form with default values', () => {
    render(<EventForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    expect(screen.getByLabelText(/事件标题/)).toBeInTheDocument();
    expect(screen.getByLabelText(/全天事件/)).toBeInTheDocument();
    expect(screen.getByLabelText(/开始时间/)).toBeInTheDocument();
    expect(screen.getByLabelText(/结束时间/)).toBeInTheDocument();
    expect(screen.getByText('创建事件')).toBeInTheDocument();
  });

  it('renders edit form with existing event data', () => {
    render(
      <EventForm
        event={mockEvent}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByDisplayValue('Test Event')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Location')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Description')).toBeInTheDocument();
    expect(screen.getByText('更新事件')).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();

    render(<EventForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    // Try to submit without title
    await user.click(screen.getByText('创建事件'));

    expect(screen.getByText('请输入事件标题')).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('handles all-day event toggle', async () => {
    const user = userEvent.setup();

    render(<EventForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const allDayCheckbox = screen.getByLabelText(/全天事件/);

    // Toggle to all-day
    await user.click(allDayCheckbox);

    expect(screen.getByLabelText(/开始日期/)).toBeInTheDocument();
    expect(screen.getByLabelText(/结束日期/)).toBeInTheDocument();
  });

  it('submits form with valid data', async () => {
    const user = userEvent.setup();

    render(<EventForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    // Fill in required fields
    await user.type(screen.getByLabelText(/事件标题/), 'New Event');

    // Submit form
    await user.click(screen.getByText('创建事件'));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'New Event',
          category: 'meeting',
          isAllDay: false,
        })
      );
    });
  });

  it('handles color selection', async () => {
    const user = userEvent.setup();

    render(<EventForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    // Click on a color option
    const colorButtons = screen.getAllByRole('button');
    const greenColorButton = colorButtons.find(
      button => button.style.backgroundColor === 'rgb(16, 185, 129)'
    );

    if (greenColorButton) {
      await user.click(greenColorButton);
    }

    // Fill in title and submit
    await user.type(screen.getByLabelText(/事件标题/), 'Colored Event');
    await user.click(screen.getByText('创建事件'));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          color: '#10B981',
        })
      );
    });
  });

  it('validates event duration limits', async () => {
    const user = userEvent.setup();

    render(<EventForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    // Set a very long duration (more than 7 days)
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 10); // 10 days later

    await user.type(screen.getByLabelText(/事件标题/), 'Long Event');

    const startTimeInput = screen.getByLabelText(/开始时间/);
    const endTimeInput = screen.getByLabelText(/结束时间/);

    await user.clear(startTimeInput);
    await user.type(startTimeInput, startDate.toISOString().slice(0, 16));

    await user.clear(endTimeInput);
    await user.type(endTimeInput, endDate.toISOString().slice(0, 16));

    await user.click(screen.getByText('创建事件'));

    expect(screen.getByText('事件时长不能超过7天')).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('handles keyboard shortcuts', async () => {
    const user = userEvent.setup();

    render(<EventForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    await user.type(screen.getByLabelText(/事件标题/), 'Keyboard Event');

    // Test Ctrl+Enter shortcut
    await user.keyboard('{Control>}{Enter}{/Control}');

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Keyboard Event',
        })
      );
    });
  });
});

describe('EventDetails', () => {
  const mockOnEdit = jest.fn();
  const mockOnDelete = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders event details correctly', () => {
    render(
      <EventDetails
        event={mockEvent}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onClose={mockOnClose}
        canEdit={true}
        canDelete={true}
      />
    );

    expect(screen.getByText('Test Event')).toBeInTheDocument();
    expect(screen.getByText('Test Location')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
    expect(screen.getByText('编辑')).toBeInTheDocument();
    expect(screen.getByText('删除')).toBeInTheDocument();
  });

  it('shows correct category badge', () => {
    render(
      <EventDetails
        event={mockEvent}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('👥')).toBeInTheDocument();
    expect(screen.getByText('会议')).toBeInTheDocument();
  });

  it('handles edit button click', async () => {
    const user = userEvent.setup();

    render(
      <EventDetails
        event={mockEvent}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onClose={mockOnClose}
        canEdit={true}
      />
    );

    await user.click(screen.getByText('编辑'));
    expect(mockOnEdit).toHaveBeenCalled();
  });

  it('handles delete button click', async () => {
    const user = userEvent.setup();

    // Mock window.confirm
    window.confirm = jest.fn(() => true);

    render(
      <EventDetails
        event={mockEvent}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onClose={mockOnClose}
        canDelete={true}
      />
    );

    await user.click(screen.getByText('删除'));
    expect(mockOnDelete).toHaveBeenCalled();
  });

  it('hides edit/delete buttons when no permissions', () => {
    render(
      <EventDetails
        event={mockEvent}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onClose={mockOnClose}
        canEdit={false}
        canDelete={false}
      />
    );

    expect(screen.queryByText('编辑')).not.toBeInTheDocument();
    expect(screen.queryByText('删除')).not.toBeInTheDocument();
    expect(
      screen.getByText('您只有查看权限，无法编辑或删除此事件')
    ).toBeInTheDocument();
  });

  it('formats all-day events correctly', () => {
    const allDayEvent = {
      ...mockEvent,
      isAllDay: true,
    };

    render(
      <EventDetails
        event={allDayEvent}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('持续时间：全天')).toBeInTheDocument();
  });

  it('shows duplicate button when onDuplicate is provided', () => {
    const mockOnDuplicate = jest.fn();

    render(
      <EventDetails
        event={mockEvent}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onClose={mockOnClose}
        onDuplicate={mockOnDuplicate}
        canEdit={true}
        canDelete={true}
      />
    );

    expect(screen.getByText('复制')).toBeInTheDocument();
  });

  it('handles duplicate button click', async () => {
    const user = userEvent.setup();
    const mockOnDuplicate = jest.fn();

    render(
      <EventDetails
        event={mockEvent}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onClose={mockOnClose}
        onDuplicate={mockOnDuplicate}
        canEdit={true}
        canDelete={true}
      />
    );

    await user.click(screen.getByText('复制'));
    expect(mockOnDuplicate).toHaveBeenCalled();
  });
});

describe('EventModal', () => {
  const mockOnClose = jest.fn();
  const mockOnEventCreated = jest.fn();
  const mockOnEventUpdated = jest.fn();
  const mockOnEventDeleted = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  it('renders create modal', () => {
    render(
      <EventModal
        isOpen={true}
        onClose={mockOnClose}
        mode="create"
        onEventCreated={mockOnEventCreated}
        onEventUpdated={mockOnEventUpdated}
        onEventDeleted={mockOnEventDeleted}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText(/事件标题/)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '创建事件' })
    ).toBeInTheDocument();
  });

  it('renders view modal with event', () => {
    render(
      <EventModal
        isOpen={true}
        onClose={mockOnClose}
        event={mockEvent}
        mode="view"
        onEventCreated={mockOnEventCreated}
        onEventUpdated={mockOnEventUpdated}
        onEventDeleted={mockOnEventDeleted}
      />
    );

    expect(screen.getByText('事件详情')).toBeInTheDocument();
    expect(screen.getByText('Test Event')).toBeInTheDocument();
  });

  it('handles successful event creation', async () => {
    const user = userEvent.setup();

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { event: { ...mockEvent, id: 'new-event' } },
      }),
    });

    render(
      <EventModal
        isOpen={true}
        onClose={mockOnClose}
        mode="create"
        onEventCreated={mockOnEventCreated}
        onEventUpdated={mockOnEventUpdated}
        onEventDeleted={mockOnEventDeleted}
      />
    );

    // Fill form and submit
    await user.type(screen.getByLabelText(/事件标题/), 'New Event');
    await user.click(screen.getByRole('button', { name: '创建事件' }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/teams/team-1/events',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
      expect(mockOnEventCreated).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('handles API errors', async () => {
    const user = userEvent.setup();

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        success: false,
        error: { message: 'Creation failed' },
      }),
    });

    render(
      <EventModal
        isOpen={true}
        onClose={mockOnClose}
        mode="create"
        onEventCreated={mockOnEventCreated}
        onEventUpdated={mockOnEventUpdated}
        onEventDeleted={mockOnEventDeleted}
      />
    );

    // Fill form and submit
    await user.type(screen.getByLabelText(/事件标题/), 'New Event');
    await user.click(screen.getByRole('button', { name: '创建事件' }));

    await waitFor(() => {
      expect(screen.getByText('Creation failed')).toBeInTheDocument();
    });
  });

  it('handles event duplication', async () => {
    const user = userEvent.setup();

    render(
      <EventModal
        isOpen={true}
        onClose={mockOnClose}
        event={mockEvent}
        mode="view"
        onEventCreated={mockOnEventCreated}
        onEventUpdated={mockOnEventUpdated}
        onEventDeleted={mockOnEventDeleted}
      />
    );

    // Click duplicate button
    await user.click(screen.getByText('复制'));

    // Should switch to create mode with event data
    expect(
      screen.getByRole('button', { name: '创建事件' })
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Event')).toBeInTheDocument();
  });

  it('shows error dismissal button', async () => {
    const user = userEvent.setup();

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        success: false,
        error: { message: 'Test error' },
      }),
    });

    render(
      <EventModal
        isOpen={true}
        onClose={mockOnClose}
        mode="create"
        onEventCreated={mockOnEventCreated}
        onEventUpdated={mockOnEventUpdated}
        onEventDeleted={mockOnEventDeleted}
      />
    );

    // Trigger an error
    await user.type(screen.getByLabelText(/事件标题/), 'New Event');
    await user.click(screen.getByRole('button', { name: '创建事件' }));

    await waitFor(() => {
      expect(screen.getByText('Test error')).toBeInTheDocument();
    });

    // Click dismiss button
    await user.click(screen.getByText('✕'));

    expect(screen.queryByText('Test error')).not.toBeInTheDocument();
  });
});
