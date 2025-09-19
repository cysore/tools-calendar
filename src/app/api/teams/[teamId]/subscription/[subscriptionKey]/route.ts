/**
 * Team calendar subscription endpoint
 * Serves iCalendar feed for team events
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTeamById, updateTeam } from '@/lib/data-access/teams';
import { getTeamEvents } from '@/lib/data-access/events';
import { generateICalendar, getICalendarMimeType } from '@/lib/icalendar';
import { validateSubscriptionKey } from '@/lib/subscription';

interface RouteParams {
  params: {
    teamId: string;
    subscriptionKey: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { teamId, subscriptionKey } = params;

    // Validate subscription key format
    if (!validateSubscriptionKey(subscriptionKey)) {
      return new NextResponse('Invalid subscription key', { status: 400 });
    }

    // Get team and verify subscription key
    const team = await getTeamById(teamId);
    if (!team) {
      return new NextResponse('Team not found', { status: 404 });
    }

    if (team.subscriptionKey !== subscriptionKey) {
      return new NextResponse('Invalid subscription key', { status: 403 });
    }

    // Get team events
    const events = await getTeamEvents(teamId);

    // Generate iCalendar content
    const calendarName = `${team.name} - Team Calendar`;
    const calendarDescription =
      team.description || `Calendar for team: ${team.name}`;
    const icsContent = generateICalendar(
      events,
      calendarName,
      calendarDescription
    );

    // Note: We could track access analytics here if needed

    // Return iCalendar content with proper headers
    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        'Content-Type': getICalendarMimeType(),
        'Content-Disposition': `attachment; filename="${team.name.replace(/[^a-zA-Z0-9]/g, '_')}_calendar.ics"`,
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('Subscription feed error:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
