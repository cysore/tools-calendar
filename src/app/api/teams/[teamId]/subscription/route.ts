/**
 * Team subscription management API
 * Handles subscription settings and regeneration
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTeamById } from '@/lib/data-access/teams';
import { TeamRepository } from '@/lib/data-access/teams';
import { checkTeamPermission } from '@/lib/team-auth';
import {
  regenerateSubscription,
  generateSubscriptionUrl,
  getSubscriptionInstructions,
} from '@/lib/subscription';

interface RouteParams {
  params: {
    teamId: string;
  };
}

/**
 * GET /api/teams/[teamId]/subscription
 * Get team subscription settings and instructions
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

    // Generate subscription URL
    const subscriptionUrl = generateSubscriptionUrl(
      teamId,
      team.subscriptionKey
    );

    // Get platform-specific instructions
    const instructions = getSubscriptionInstructions(subscriptionUrl);

    return NextResponse.json({
      success: true,
      data: {
        teamId,
        teamName: team.name,
        subscriptionUrl,
        instructions,
        isEnabled: true, // Always enabled for now
      },
    });
  } catch (error) {
    console.error('Get subscription settings error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/teams/[teamId]/subscription
 * Regenerate subscription key and URL
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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

    // Check team owner permission (only owners can regenerate)
    const hasPermission = await checkTeamPermission(
      session.user.id,
      teamId,
      'owner'
    );
    if (!hasPermission) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Only team owners can regenerate subscription links',
          },
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

    // Generate new subscription key and update team
    const newSubscriptionKey =
      await TeamRepository.regenerateSubscriptionKey(teamId);

    // Generate new subscription URL
    const subscriptionUrl = generateSubscriptionUrl(teamId, newSubscriptionKey);

    // Get updated instructions
    const instructions = getSubscriptionInstructions(subscriptionUrl);

    return NextResponse.json({
      success: true,
      data: {
        teamId,
        teamName: team.name,
        subscriptionUrl,
        instructions,
        message: 'Subscription link regenerated successfully',
      },
    });
  } catch (error) {
    console.error('Regenerate subscription error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      },
      { status: 500 }
    );
  }
}
