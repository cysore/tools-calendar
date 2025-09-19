/**
 * Tests for API routes
 */

import { NextRequest } from 'next/server';
import { mockUser, mockTeam, mockEvent } from './test-utils';

// Mock NextAuth
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}));

// Mock DynamoDB
jest.mock('@/lib/dynamodb', () => ({
  docClient: {
    send: jest.fn(),
  },
  TABLE_NAMES: {
    MAIN: 'test-table',
  },
  generateKeys: {
    user: jest.fn(),
    team: jest.fn(),
    teamMember: jest.fn(),
    event: jest.fn(),
  },
  DynamoDBError: class extends Error {
    constructor(
      message: string,
      public code: string,
      public statusCode = 500
    ) {
      super(message);
    }
  },
  ERROR_CODES: {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    NOT_FOUND: 'NOT_FOUND',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
  },
}));

// Mock data access layers
jest.mock('@/lib/data-access/teams', () => ({
  TeamRepository: {
    create: jest.fn(),
    getById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getUserTeams: jest.fn(),
  },
}));

jest.mock('@/lib/data-access/events', () => ({
  EventRepository: {
    create: jest.fn(),
    getById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getTeamEvents: jest.fn(),
    getEventsByDateRange: jest.fn(),
  },
}));

jest.mock('@/lib/data-access/team-members', () => ({
  TeamMemberRepository: {
    addMember: jest.fn(),
    removeMember: jest.fn(),
    updateRole: jest.fn(),
    getTeamMembers: jest.fn(),
    getUserTeamRole: jest.fn(),
  },
}));

describe('Teams API Routes', () => {
  const { getServerSession } = require('next-auth/next');
  const { TeamRepository } = require('@/lib/data-access/teams');

  beforeEach(() => {
    jest.clearAllMocks();
    getServerSession.mockResolvedValue({
      user: { id: mockUser.id, email: mockUser.email },
    });
  });

  describe('POST /api/teams', () => {
    it('creates a new team successfully', async () => {
      TeamRepository.create.mockResolvedValue(mockTeam);

      const request = new NextRequest('http://localhost/api/teams', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Team',
          description: 'Test Description',
        }),
      });

      // Import the route handler
      const { POST } = await import('@/app/api/teams/route');
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.team).toEqual(mockTeam);
      expect(TeamRepository.create).toHaveBeenCalledWith({
        name: 'Test Team',
        description: 'Test Description',
        ownerId: mockUser.id,
      });
    });

    it('validates required fields', async () => {
      const request = new NextRequest('http://localhost/api/teams', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const { POST } = await import('@/app/api/teams/route');
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('requires authentication', async () => {
      getServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/teams', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Team',
        }),
      });

      const { POST } = await import('@/app/api/teams/route');
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('GET /api/teams', () => {
    it('returns user teams', async () => {
      TeamRepository.getUserTeams.mockResolvedValue([mockTeam]);

      const request = new NextRequest('http://localhost/api/teams');

      const { GET } = await import('@/app/api/teams/route');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.teams).toEqual([mockTeam]);
      expect(TeamRepository.getUserTeams).toHaveBeenCalledWith(mockUser.id);
    });
  });
});

describe('Events API Routes', () => {
  const { getServerSession } = require('next-auth/next');
  const { EventRepository } = require('@/lib/data-access/events');
  const { TeamMemberRepository } = require('@/lib/data-access/team-members');

  beforeEach(() => {
    jest.clearAllMocks();
    getServerSession.mockResolvedValue({
      user: { id: mockUser.id, email: mockUser.email },
    });
    TeamMemberRepository.getUserTeamRole.mockResolvedValue('member');
  });

  describe('POST /api/teams/[teamId]/events', () => {
    it('creates a new event successfully', async () => {
      EventRepository.create.mockResolvedValue(mockEvent);

      const request = new NextRequest(
        'http://localhost/api/teams/team-1/events',
        {
          method: 'POST',
          body: JSON.stringify({
            title: 'Test Event',
            startTime: '2024-01-15T10:00:00Z',
            endTime: '2024-01-15T11:00:00Z',
            isAllDay: false,
            category: 'meeting',
            color: '#3B82F6',
          }),
        }
      );

      const { POST } = await import('@/app/api/teams/[teamId]/events/route');
      const response = await POST(request, { params: { teamId: 'team-1' } });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.event).toEqual(mockEvent);
    });

    it('validates event permissions', async () => {
      TeamMemberRepository.getUserTeamRole.mockResolvedValue('viewer');

      const request = new NextRequest(
        'http://localhost/api/teams/team-1/events',
        {
          method: 'POST',
          body: JSON.stringify({
            title: 'Test Event',
            startTime: '2024-01-15T10:00:00Z',
            endTime: '2024-01-15T11:00:00Z',
            isAllDay: false,
            category: 'meeting',
            color: '#3B82F6',
          }),
        }
      );

      const { POST } = await import('@/app/api/teams/[teamId]/events/route');
      const response = await POST(request, { params: { teamId: 'team-1' } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('FORBIDDEN');
    });

    it('validates event data', async () => {
      const request = new NextRequest(
        'http://localhost/api/teams/team-1/events',
        {
          method: 'POST',
          body: JSON.stringify({
            // Missing required title
            startTime: '2024-01-15T10:00:00Z',
            endTime: '2024-01-15T11:00:00Z',
          }),
        }
      );

      const { POST } = await import('@/app/api/teams/[teamId]/events/route');
      const response = await POST(request, { params: { teamId: 'team-1' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/teams/[teamId]/events', () => {
    it('returns team events', async () => {
      EventRepository.getTeamEvents.mockResolvedValue([mockEvent]);

      const request = new NextRequest(
        'http://localhost/api/teams/team-1/events'
      );

      const { GET } = await import('@/app/api/teams/[teamId]/events/route');
      const response = await GET(request, { params: { teamId: 'team-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.events).toEqual([mockEvent]);
    });

    it('filters events by date range', async () => {
      EventRepository.getEventsByDateRange.mockResolvedValue([mockEvent]);

      const request = new NextRequest(
        'http://localhost/api/teams/team-1/events?startDate=2024-01-01&endDate=2024-01-31'
      );

      const { GET } = await import('@/app/api/teams/[teamId]/events/route');
      const response = await GET(request, { params: { teamId: 'team-1' } });

      expect(EventRepository.getEventsByDateRange).toHaveBeenCalledWith(
        'team-1',
        '2024-01-01',
        '2024-01-31'
      );
    });

    it('filters events by category', async () => {
      EventRepository.getTeamEvents.mockResolvedValue([mockEvent]);

      const request = new NextRequest(
        'http://localhost/api/teams/team-1/events?category=meeting'
      );

      const { GET } = await import('@/app/api/teams/[teamId]/events/route');
      const response = await GET(request, { params: { teamId: 'team-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.events).toEqual([mockEvent]);
    });
  });

  describe('PUT /api/teams/[teamId]/events/[eventId]', () => {
    it('updates event successfully', async () => {
      EventRepository.getById.mockResolvedValue(mockEvent);
      EventRepository.update.mockResolvedValue({
        ...mockEvent,
        title: 'Updated Event',
      });

      const request = new NextRequest(
        'http://localhost/api/teams/team-1/events/event-1',
        {
          method: 'PUT',
          body: JSON.stringify({
            title: 'Updated Event',
          }),
        }
      );

      const { PUT } = await import(
        '@/app/api/teams/[teamId]/events/[eventId]/route'
      );
      const response = await PUT(request, {
        params: { teamId: 'team-1', eventId: 'event-1' },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.event.title).toBe('Updated Event');
    });

    it('validates edit permissions', async () => {
      const otherUserEvent = { ...mockEvent, createdBy: 'other-user' };
      EventRepository.getById.mockResolvedValue(otherUserEvent);
      TeamMemberRepository.getUserTeamRole.mockResolvedValue('member');

      const request = new NextRequest(
        'http://localhost/api/teams/team-1/events/event-1',
        {
          method: 'PUT',
          body: JSON.stringify({
            title: 'Updated Event',
          }),
        }
      );

      const { PUT } = await import(
        '@/app/api/teams/[teamId]/events/[eventId]/route'
      );
      const response = await PUT(request, {
        params: { teamId: 'team-1', eventId: 'event-1' },
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('FORBIDDEN');
    });
  });

  describe('DELETE /api/teams/[teamId]/events/[eventId]', () => {
    it('deletes event successfully', async () => {
      EventRepository.getById.mockResolvedValue(mockEvent);
      EventRepository.delete.mockResolvedValue(true);

      const request = new NextRequest(
        'http://localhost/api/teams/team-1/events/event-1',
        {
          method: 'DELETE',
        }
      );

      const { DELETE } = await import(
        '@/app/api/teams/[teamId]/events/[eventId]/route'
      );
      const response = await DELETE(request, {
        params: { teamId: 'team-1', eventId: 'event-1' },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(EventRepository.delete).toHaveBeenCalledWith('event-1');
    });

    it('validates delete permissions', async () => {
      const otherUserEvent = { ...mockEvent, createdBy: 'other-user' };
      EventRepository.getById.mockResolvedValue(otherUserEvent);
      TeamMemberRepository.getUserTeamRole.mockResolvedValue('viewer');

      const request = new NextRequest(
        'http://localhost/api/teams/team-1/events/event-1',
        {
          method: 'DELETE',
        }
      );

      const { DELETE } = await import(
        '@/app/api/teams/[teamId]/events/[eventId]/route'
      );
      const response = await DELETE(request, {
        params: { teamId: 'team-1', eventId: 'event-1' },
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('FORBIDDEN');
    });
  });
});

describe('Health API Route', () => {
  it('returns health status', async () => {
    const request = new NextRequest('http://localhost/api/health');

    const { GET } = await import('@/app/api/health/route');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('healthy');
    expect(data.timestamp).toBeDefined();
  });
});

describe('Auth API Routes', () => {
  const { getServerSession } = require('next-auth/next');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('registers new user successfully', async () => {
      // Mock Cognito signup
      const mockCognitoSignUp = jest.fn().mockResolvedValue({
        UserSub: 'cognito-user-id',
      });

      jest.doMock('@aws-sdk/client-cognito-identity-provider', () => ({
        CognitoIdentityProviderClient: jest.fn(() => ({
          send: mockCognitoSignUp,
        })),
        SignUpCommand: jest.fn(),
      }));

      const request = new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'SecurePassword123!',
          name: 'Test User',
        }),
      });

      const { POST } = await import('@/app/api/auth/register/route');
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.message).toContain('注册成功');
    });

    it('validates registration data', async () => {
      const request = new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'invalid-email',
          password: '123', // Too short
        }),
      });

      const { POST } = await import('@/app/api/auth/register/route');
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/auth/reset-password', () => {
    it('initiates password reset', async () => {
      const mockCognitoForgotPassword = jest.fn().mockResolvedValue({});

      jest.doMock('@aws-sdk/client-cognito-identity-provider', () => ({
        CognitoIdentityProviderClient: jest.fn(() => ({
          send: mockCognitoForgotPassword,
        })),
        ForgotPasswordCommand: jest.fn(),
      }));

      const request = new NextRequest(
        'http://localhost/api/auth/reset-password',
        {
          method: 'POST',
          body: JSON.stringify({
            email: 'test@example.com',
          }),
        }
      );

      const { POST } = await import('@/app/api/auth/reset-password/route');
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('密码重置邮件已发送');
    });

    it('validates email format', async () => {
      const request = new NextRequest(
        'http://localhost/api/auth/reset-password',
        {
          method: 'POST',
          body: JSON.stringify({
            email: 'invalid-email',
          }),
        }
      );

      const { POST } = await import('@/app/api/auth/reset-password/route');
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
