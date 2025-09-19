/**
 * SubscriptionSettings component tests
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { SubscriptionSettings } from '@/components/team/SubscriptionSettings';

// Mock the useTeam hook
jest.mock('@/components/team/TeamProvider', () => ({
  useTeam: () => ({
    currentTeam: {
      id: 'team-123',
      name: 'Test Team',
      description: 'Test Description',
      ownerId: 'user-123',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
  }),
}));

// Mock fetch
global.fetch = jest.fn();

describe('SubscriptionSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          teamId: 'team-123',
          teamName: 'Test Team',
          subscriptionUrl:
            'https://example.com/api/teams/team-123/subscription/abc123',
          instructions: [
            {
              platform: 'ios',
              title: 'iOS 日历',
              steps: ['打开设置', '选择日历', '添加订阅'],
            },
          ],
          isEnabled: true,
        },
      }),
    });
  });

  it('renders subscription settings component', () => {
    render(<SubscriptionSettings />);

    // Component should render without crashing
    expect(document.body).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    render(<SubscriptionSettings />);

    // Should show loading skeleton
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });
});
