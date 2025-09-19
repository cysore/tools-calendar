/**
 * Team calendar export API
 * Handles .ics file downloads for events
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTeamById } from '@/lib/data-access/teams';
import { getTeamEvents } from '@/lib/data-access/events';
import { checkTeamPermission } from '@/lib/team-auth';
import {
  generateICalendar,
  generateMonthlyICalendar,
  getICalendarMimeType,
  generateICalendarFilename,
} from '@/lib/icalendar';

interface RouteParams {
  params: {
    teamId: string;
  };
}

/**
 * GET /api/teams/[teamId]/export
 * Export team events as .ics file
 * Query parameters:
 * - type: 'full' | 'monthly' (default: 'full')
 * - year: number (required for monthly)
 * - month: number (required for monthly, 1-12)
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

    const { teamId } = params;
    const { searchParams } = new URL(request.url);
    const exportType = searchParams.get('type') || 'full';
    const year = searchParams.get('year');
    const month = searchParams.get('month');

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

    // Get team events
    const events = await getTeamEvents(teamId);

    let icsContent: string;
    let filename: string;

    if (exportType === 'monthly') {
      // Validate year and month parameters
      if (!year || !month) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Year and month are required for monthly export',
            },
          },
          { status: 400 }
        );
      }

      const yearNum = parseInt(year);
      const monthNum = parseInt(month);

      if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid year or month',
            },
          },
          { status: 400 }
        );
      }

      // Generate monthly export
      icsContent = generateMonthlyICalendar(
        events,
        yearNum,
        monthNum,
        team.name
      );
      filename = generateICalendarFilename(
        team.name,
        'monthly',
        new Date(yearNum, monthNum - 1)
      );
    } else {
      // Generate full export
      const calendarDescription =
        team.description || `Full calendar export for team: ${team.name}`;
      icsContent = generateICalendar(events, team.name, calendarDescription);
      filename = generateICalendarFilename(team.name, 'full');
    }

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
    console.error('Export calendar error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      },
      { status: 500 }
    );
  }
}
