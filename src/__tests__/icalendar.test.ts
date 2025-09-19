/**
 * Tests for iCalendar generation utilities
 */

import {
  generateICalendar,
  generateSingleEventICalendar,
  generateMonthlyICalendar,
  validateICalendar,
  getICalendarMimeType,
  generateICalendarFilename,
} from '@/lib/icalendar';
import { CalendarEvent } from '@/types';

// Mock event data
const mockEvent: CalendarEvent = {
  id: 'event-1',
  teamId: 'team-1',
  title: 'Test Meeting',
  startTime: '2024-01-15T10:00:00.000Z',
  endTime: '2024-01-15T11:00:00.000Z',
  isAllDay: false,
  location: 'Conference Room A',
  description: 'This is a test meeting with special characters: ; , \\ \n',
  category: 'meeting',
  color: '#3b82f6',
  createdBy: 'user-1',
  createdAt: '2024-01-10T08:00:00.000Z',
  updatedAt: '2024-01-12T09:00:00.000Z',
};

const mockAllDayEvent: CalendarEvent = {
  id: 'event-2',
  teamId: 'team-1',
  title: 'All Day Event',
  startTime: '2024-01-20T00:00:00.000Z',
  endTime: '2024-01-20T23:59:59.000Z',
  isAllDay: true,
  category: 'task',
  color: '#ef4444',
  createdBy: 'user-1',
  createdAt: '2024-01-15T08:00:00.000Z',
  updatedAt: '2024-01-15T08:00:00.000Z',
};

describe('iCalendar Generation', () => {
  describe('generateICalendar', () => {
    it('should generate valid iCalendar content for multiple events', () => {
      const events = [mockEvent, mockAllDayEvent];
      const result = generateICalendar(
        events,
        'Test Calendar',
        'Test Description'
      );

      expect(result).toContain('BEGIN:VCALENDAR');
      expect(result).toContain('END:VCALENDAR');
      expect(result).toContain('VERSION:2.0');
      expect(result).toContain(
        'PRODID:-//Team Calendar Sync//Team Calendar//EN'
      );
      expect(result).toContain('X-WR-CALNAME:Test Calendar');
      expect(result).toContain('X-WR-CALDESC:Test Description');

      // Should contain both events
      expect(result).toContain('SUMMARY:Test Meeting');
      expect(result).toContain('SUMMARY:All Day Event');
    });

    it('should handle empty events array', () => {
      const result = generateICalendar([], 'Empty Calendar');

      expect(result).toContain('BEGIN:VCALENDAR');
      expect(result).toContain('END:VCALENDAR');
      expect(result).toContain('X-WR-CALNAME:Empty Calendar');
      expect(result).not.toContain('BEGIN:VEVENT');
    });

    it('should escape special characters in text fields', () => {
      const result = generateICalendar([mockEvent], 'Test Calendar');

      expect(result).toContain(
        'DESCRIPTION:This is a test meeting with special characters: \\; \\, \\\\ \\n'
      );
      expect(result).toContain('LOCATION:Conference Room A');
    });

    it('should format regular events with DATE-TIME', () => {
      const result = generateICalendar([mockEvent], 'Test Calendar');

      expect(result).toContain('DTSTART:20240115T100000Z');
      expect(result).toContain('DTEND:20240115T110000Z');
      expect(result).not.toContain('VALUE=DATE');
    });

    it('should format all-day events with DATE format', () => {
      const result = generateICalendar([mockAllDayEvent], 'Test Calendar');

      expect(result).toContain('DTSTART;VALUE=DATE:20240120');
      expect(result).toContain('DTEND;VALUE=DATE:20240120');
    });

    it('should include event metadata', () => {
      const result = generateICalendar([mockEvent], 'Test Calendar');

      expect(result).toContain('UID:event-1@team-team-1.calendar.app');
      expect(result).toContain('CATEGORIES:MEETING');
      expect(result).toContain('X-APPLE-CALENDAR-COLOR:#3b82f6');
      expect(result).toContain('CREATED:20240110T080000Z');
      expect(result).toContain('LAST-MODIFIED:20240112T090000Z');
    });
  });

  describe('generateSingleEventICalendar', () => {
    it('should generate iCalendar for single event', () => {
      const result = generateSingleEventICalendar(mockEvent, 'Test Calendar');

      expect(result).toContain('BEGIN:VCALENDAR');
      expect(result).toContain('END:VCALENDAR');
      expect(result).toContain('SUMMARY:Test Meeting');
      expect(result).toContain('X-WR-CALDESC:Single event: Test Meeting');
    });
  });

  describe('generateMonthlyICalendar', () => {
    it('should filter events by month', () => {
      const events = [
        mockEvent, // January 15, 2024
        mockAllDayEvent, // January 20, 2024
        {
          ...mockEvent,
          id: 'event-3',
          startTime: '2024-02-15T10:00:00.000Z',
          endTime: '2024-02-15T11:00:00.000Z',
          title: 'February Event',
        },
      ];

      const result = generateMonthlyICalendar(events, 2024, 1, 'Test Calendar');

      expect(result).toContain('SUMMARY:Test Meeting');
      expect(result).toContain('SUMMARY:All Day Event');
      expect(result).not.toContain('SUMMARY:February Event');
      expect(result).toContain('Events for January 2024');
    });

    it('should include events that span across month boundaries', () => {
      // Create an event that clearly spans from January 31 to February 1
      const spanningEvent: CalendarEvent = {
        ...mockEvent,
        id: 'spanning-event',
        startTime: '2024-01-31T20:00:00.000Z', // January 31, 8 PM UTC
        endTime: '2024-02-01T04:00:00.000Z', // February 1, 4 AM UTC
        title: 'Spanning Event',
      };

      // Test January - should include the event since it starts in January
      const januaryResult = generateMonthlyICalendar(
        [spanningEvent],
        2024,
        1,
        'Test Calendar'
      );
      expect(januaryResult).toContain('SUMMARY:Spanning Event');

      // Test February - should include the event since it ends in February
      const februaryResult = generateMonthlyICalendar(
        [spanningEvent],
        2024,
        2,
        'Test Calendar'
      );
      expect(februaryResult).toContain('SUMMARY:Spanning Event');

      // Test March - should NOT include the event
      const marchResult = generateMonthlyICalendar(
        [spanningEvent],
        2024,
        3,
        'Test Calendar'
      );
      expect(marchResult).not.toContain('SUMMARY:Spanning Event');
    });
  });

  describe('validateICalendar', () => {
    it('should validate correct iCalendar content', () => {
      const validContent = generateICalendar([mockEvent], 'Test Calendar');
      expect(validateICalendar(validContent)).toBe(true);
    });

    it('should reject invalid iCalendar content', () => {
      expect(validateICalendar('invalid content')).toBe(false);
      expect(validateICalendar('BEGIN:VCALENDAR\nEND:VCALENDAR')).toBe(false); // Missing required fields
    });

    it('should require essential iCalendar components', () => {
      const missingVersion = 'BEGIN:VCALENDAR\r\nPRODID:test\r\nEND:VCALENDAR';
      expect(validateICalendar(missingVersion)).toBe(false);

      const missingProdId = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR';
      expect(validateICalendar(missingProdId)).toBe(false);
    });
  });

  describe('getICalendarMimeType', () => {
    it('should return correct MIME type', () => {
      expect(getICalendarMimeType()).toBe('text/calendar; charset=utf-8');
    });
  });

  describe('generateICalendarFilename', () => {
    it('should generate filename for full export', () => {
      const filename = generateICalendarFilename('My Team');
      expect(filename).toBe('My_Team_calendar.ics');
    });

    it('should generate filename for monthly export', () => {
      const date = new Date('2024-01-15');
      const filename = generateICalendarFilename('My Team', 'monthly', date);
      expect(filename).toBe('My_Team_2024-01.ics');
    });

    it('should generate filename for single event export', () => {
      const filename = generateICalendarFilename('My Team', 'single');
      expect(filename).toBe('My_Team_event.ics');
    });

    it('should sanitize team name in filename', () => {
      const filename = generateICalendarFilename('My Team & Co. (2024)');
      expect(filename).toBe('My_Team___Co___2024__calendar.ics');
    });

    it('should throw error for monthly export without date', () => {
      expect(() => {
        generateICalendarFilename('My Team', 'monthly');
      }).toThrow('Date required for monthly export');
    });
  });
});

describe('Date Formatting', () => {
  it('should format UTC dates correctly', () => {
    const result = generateICalendar([mockEvent], 'Test Calendar');

    // Check that dates are in UTC format
    expect(result).toContain('DTSTART:20240115T100000Z');
    expect(result).toContain('DTEND:20240115T110000Z');
    expect(result).toContain('DTSTAMP:20240110T080000Z');
  });

  it('should handle timezone conversion properly', () => {
    const localEvent: CalendarEvent = {
      ...mockEvent,
      startTime: '2024-01-15T15:30:45.123Z', // With milliseconds
      endTime: '2024-01-15T16:30:45.123Z',
    };

    const result = generateICalendar([localEvent], 'Test Calendar');

    // Should strip milliseconds and format correctly
    expect(result).toContain('DTSTART:20240115T153045Z');
    expect(result).toContain('DTEND:20240115T163045Z');
  });
});

describe('Edge Cases', () => {
  it('should handle events with minimal data', () => {
    const minimalEvent: CalendarEvent = {
      id: 'minimal',
      teamId: 'team-1',
      title: 'Minimal Event',
      startTime: '2024-01-15T10:00:00.000Z',
      endTime: '2024-01-15T11:00:00.000Z',
      isAllDay: false,
      category: 'task',
      color: '#000000',
      createdBy: 'user-1',
      createdAt: '2024-01-15T10:00:00.000Z',
      updatedAt: '2024-01-15T10:00:00.000Z',
    };

    const result = generateICalendar([minimalEvent], 'Test Calendar');

    expect(result).toContain('SUMMARY:Minimal Event');
    expect(result).not.toContain('DESCRIPTION:');
    expect(result).not.toContain('LOCATION:');
  });

  it('should handle very long event titles and descriptions', () => {
    const longText = 'A'.repeat(1000);
    const longEvent: CalendarEvent = {
      ...mockEvent,
      title: longText,
      description: longText,
    };

    const result = generateICalendar([longEvent], 'Test Calendar');

    expect(result).toContain(`SUMMARY:${longText}`);
    expect(result).toContain(`DESCRIPTION:${longText}`);
  });

  it('should handle special Unicode characters', () => {
    const unicodeEvent: CalendarEvent = {
      ...mockEvent,
      title: '会议 📅 Meeting 🎯',
      description: 'Unicode test: 中文 العربية русский 🚀',
      location: 'Room 会议室 №1',
    };

    const result = generateICalendar([unicodeEvent], 'Test Calendar');

    expect(result).toContain('SUMMARY:会议 📅 Meeting 🎯');
    expect(result).toContain(
      'DESCRIPTION:Unicode test: 中文 العربية русский 🚀'
    );
    expect(result).toContain('LOCATION:Room 会议室 №1');
  });
});
