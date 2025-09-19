/**
 * Single event export API
 * Handles .ics file download for individual events
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTeamById } from '@/lib/data-access/teams';
import { getEventByIdAndTeam } from '@/lib/data-access/events';
import { checkTeamPermission } from '@/lib/team-auth';
import {
  generateSingleEventICalendar,
  getICalendarMimeType,
  generateICalendarFilename,
} from '@/lib/icalendar';

interface RouteParams {
  params: {
    teamId: string;
    eventId: string;
  };
}

/**
 * GET /api/teams/[teamId]/events/[eventId]/export
 * Export single event as .ics file
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        },
        { status: 401 }
      );
    }

    const { teamId, eventId } = params;

    // Check team access permission
    const hasAccess = await checkTeamPermission(
      session.user.id,
      teamId,
      'viewer'
    );
    if (!hasAccess) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'FORBIDDEN', message: 'Access denied' },
        },
        { status: 403 }
      );
    }

    // Get team data
    const team = await getTeamById(teamId);
    if (!team) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Team not found' },
        },
        { status: 404 }
      );
    }

    // Get event data
    const event = await getEventByIdAndTeam(teamId, eventId);
    if (!event) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Event not found' },
        },
        { status: 404 }
      );
    }

    // Generate single event iCalendar
    const icsContent = generateSingleEventICalendar(event, team.name);
    const filename = generateICalendarFilename(team.name, 'single');

    // Return .ics file
    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        'Content-Type': getICalendarMimeType(),
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error) {
    console.error('Export single event error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      },
      { status: 500 }
    );
  }
}
