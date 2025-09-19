/**
 * iCalendar (.ics) format generation utilities
 * Implements RFC 5545 specification for calendar data exchange
 */

import { CalendarEvent } from '@/types';

/**
 * Escapes special characters in iCalendar text fields
 */
function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
}

/**
 * Formats a date for iCalendar format (YYYYMMDDTHHMMSSZ)
 */
function formatICalDate(date: Date, isAllDay: boolean = false): string {
  if (isAllDay) {
    // All-day events use DATE format (YYYYMMDD)
    return date.toISOString().slice(0, 10).replace(/-/g, '');
  }
  // Regular events use DATE-TIME format in UTC
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}

/**
 * Generates a unique identifier for an event
 */
function generateEventUID(eventId: string, teamId: string): string {
  return `${eventId}@team-${teamId}.calendar.app`;
}

/**
 * Converts a CalendarEvent to iCalendar VEVENT format
 */
function eventToICalEvent(event: CalendarEvent): string {
  const startDate = new Date(event.startTime);
  const endDate = new Date(event.endTime);
  const createdDate = new Date(event.createdAt);
  const updatedDate = new Date(event.updatedAt);

  const lines = [
    'BEGIN:VEVENT',
    `UID:${generateEventUID(event.id, event.teamId)}`,
    `DTSTART${event.isAllDay ? ';VALUE=DATE' : ''}:${formatICalDate(startDate, event.isAllDay)}`,
    `DTEND${event.isAllDay ? ';VALUE=DATE' : ''}:${formatICalDate(endDate, event.isAllDay)}`,
    `DTSTAMP:${formatICalDate(createdDate)}`,
    `CREATED:${formatICalDate(createdDate)}`,
    `LAST-MODIFIED:${formatICalDate(updatedDate)}`,
    `SUMMARY:${escapeICalText(event.title)}`,
  ];

  // Add optional fields
  if (event.description) {
    lines.push(`DESCRIPTION:${escapeICalText(event.description)}`);
  }

  if (event.location) {
    lines.push(`LOCATION:${escapeICalText(event.location)}`);
  }

  // Add category as CATEGORIES field
  lines.push(`CATEGORIES:${event.category.toUpperCase()}`);

  // Add color as X-APPLE-CALENDAR-COLOR (for Apple Calendar compatibility)
  lines.push(`X-APPLE-CALENDAR-COLOR:${event.color}`);

  lines.push('END:VEVENT');

  return lines.join('\r\n');
}

/**
 * Generates a complete iCalendar (.ics) file content
 */
export function generateICalendar(
  events: CalendarEvent[],
  calendarName: string,
  description?: string
): string {
  const now = new Date();
  const prodId = '-//Team Calendar Sync//Team Calendar//EN';

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${prodId}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeICalText(calendarName)}`,
  ];

  if (description) {
    lines.push(`X-WR-CALDESC:${escapeICalText(description)}`);
  }

  // Add timezone information (UTC)
  lines.push(
    'BEGIN:VTIMEZONE',
    'TZID:UTC',
    'BEGIN:STANDARD',
    'DTSTART:19700101T000000Z',
    'TZOFFSETFROM:+0000',
    'TZOFFSETTO:+0000',
    'TZNAME:UTC',
    'END:STANDARD',
    'END:VTIMEZONE'
  );

  // Add all events
  events.forEach(event => {
    lines.push(eventToICalEvent(event));
  });

  lines.push('END:VCALENDAR');

  return lines.join('\r\n');
}

/**
 * Generates iCalendar content for a single event
 */
export function generateSingleEventICalendar(
  event: CalendarEvent,
  calendarName: string
): string {
  return generateICalendar(
    [event],
    calendarName,
    `Single event: ${event.title}`
  );
}

/**
 * Generates iCalendar content for events in a specific month
 */
export function generateMonthlyICalendar(
  events: CalendarEvent[],
  year: number,
  month: number,
  calendarName: string
): string {
  // Use UTC dates to avoid timezone issues
  const startOfMonth = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  const monthlyEvents = events.filter(event => {
    const eventStart = new Date(event.startTime);
    const eventEnd = new Date(event.endTime);

    // Include events that overlap with the month
    // Event overlaps if: event starts before month ends AND event ends after month starts
    return eventStart <= endOfMonth && eventEnd >= startOfMonth;
  });

  const monthName = new Date(year, month - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return generateICalendar(
    monthlyEvents,
    calendarName,
    `Events for ${monthName}`
  );
}

/**
 * Validates iCalendar content format
 */
export function validateICalendar(content: string): boolean {
  const lines = content.split('\r\n');

  // Basic validation
  if (!lines.includes('BEGIN:VCALENDAR')) return false;
  if (!lines.includes('END:VCALENDAR')) return false;
  if (!lines.some(line => line.startsWith('VERSION:'))) return false;
  if (!lines.some(line => line.startsWith('PRODID:'))) return false;

  return true;
}

/**
 * Gets the MIME type for iCalendar files
 */
export function getICalendarMimeType(): string {
  return 'text/calendar; charset=utf-8';
}

/**
 * Generates a filename for iCalendar export
 */
export function generateICalendarFilename(
  teamName: string,
  type: 'full' | 'monthly' | 'single' = 'full',
  date?: Date
): string {
  const sanitizedTeamName = teamName.replace(/[^a-zA-Z0-9]/g, '_');

  switch (type) {
    case 'monthly':
      if (!date) throw new Error('Date required for monthly export');
      const monthYear = date.toISOString().slice(0, 7); // YYYY-MM
      return `${sanitizedTeamName}_${monthYear}.ics`;
    case 'single':
      return `${sanitizedTeamName}_event.ics`;
    default:
      return `${sanitizedTeamName}_calendar.ics`;
  }
}
