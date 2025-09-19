/**
 * Tests for team management UI components
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render, mockUser, mockTeam } from './test-utils';
import { TeamSelector } from '@/components/team/TeamSelector';
import { CreateTeamDialog } from '@/components/team/CreateTeamDialog';
import { MemberManagement } from '@/components/team/MemberManagement';
import { TeamSettings } from '@/components/team/TeamSettings';

// Mock the team provider
jest.mock('@/components/team/TeamProvider', () => ({
  useTeam: () => ({
    currentTeam: mockTeam,
    teams: [mockTeam],
    switchTeam: jest.fn(),
    createTeam: jest.fn(),
    inviteMember: jest.fn(),
  }),
}));

// Mock the auth hook
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    session: null,
    status: 'authenticated',
  }),
}));

// Mock fetch
global.fetch = jest.fn();

describe('TeamSelector', () => {
  const mockOnTeamChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders current team name', () => {
    render(
      <TeamSelector
        teams={[mockTeam]}
        currentTeam={mockTeam}
        onTeamChange={mockOnTeamChange}
      />
    );

    expect(screen.getByText('Test Team')).toBeInTheDocument();
  });

  it('shows team list when clicked', async () => {
    const user = userEvent.setup();

    render(
      <TeamSelector
        teams={[mockTeam]}
        currentTeam={mockTeam}
        onTeamChange={mockOnTeamChange}
      />
    );

    await user.click(screen.getByRole('button'));

    expect(screen.getByText('切换团队')).toBeInTheDocument();
  });

  it('calls onTeamChange when team is selected', async () => {
    const user = userEvent.setup();
    const anotherTeam = { ...mockTeam, id: 'team-2', name: 'Another Team' };

    render(
      <TeamSelector
        teams={[mockTeam, anotherTeam]}
        currentTeam={mockTeam}
        onTeamChange={mockOnTeamChange}
      />
    );

    await user.click(screen.getByRole('button'));
    await user.click(screen.getByText('Another Team'));

    expect(mockOnTeamChange).toHaveBeenCalledWith('team-2');
  });

  it('shows create team option', async () => {
    const user = userEvent.setup();

    render(
      <TeamSelector
        teams={[mockTeam]}
        currentTeam={mockTeam}
        onTeamChange={mockOnTeamChange}
      />
    );

    await user.click(screen.getByRole('button'));

    expect(screen.getByText('创建新团队')).toBeInTheDocument();
  });
});

describe('CreateTeamDialog', () => {
  const mockOnTeamCreated = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  it('renders create team form', () => {
    render(
      <CreateTeamDialog
        isOpen={true}
        onClose={mockOnClose}
        onTeamCreated={mockOnTeamCreated}
      />
    );

    expect(screen.getByLabelText(/团队名称/)).toBeInTheDocument();
    expect(screen.getByLabelText(/团队描述/)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '创建团队' })
    ).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();

    render(
      <CreateTeamDialog
        isOpen={true}
        onClose={mockOnClose}
        onTeamCreated={mockOnTeamCreated}
      />
    );

    await user.click(screen.getByRole('button', { name: '创建团队' }));

    expect(screen.getByText('请输入团队名称')).toBeInTheDocument();
    expect(mockOnTeamCreated).not.toHaveBeenCalled();
  });

  it('creates team successfully', async () => {
    const user = userEvent.setup();

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { team: mockTeam },
      }),
    });

    render(
      <CreateTeamDialog
        isOpen={true}
        onClose={mockOnClose}
        onTeamCreated={mockOnTeamCreated}
      />
    );

    await user.type(screen.getByLabelText(/团队名称/), 'New Team');
    await user.type(screen.getByLabelText(/团队描述/), 'Team description');
    await user.click(screen.getByRole('button', { name: '创建团队' }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New Team',
          description: 'Team description',
        }),
      });
      expect(mockOnTeamCreated).toHaveBeenCalledWith(mockTeam);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('handles API errors', async () => {
    const user = userEvent.setup();

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        success: false,
        error: { message: 'Team creation failed' },
      }),
    });

    render(
      <CreateTeamDialog
        isOpen={true}
        onClose={mockOnClose}
        onTeamCreated={mockOnTeamCreated}
      />
    );

    await user.type(screen.getByLabelText(/团队名称/), 'New Team');
    await user.click(screen.getByRole('button', { name: '创建团队' }));

    await waitFor(() => {
      expect(screen.getByText('Team creation failed')).toBeInTheDocument();
    });
  });
});

describe('MemberManagement', () => {
  const mockMembers = [
    {
      userId: 'user-1',
      teamId: 'team-1',
      role: 'owner' as const,
      user: mockUser,
      joinedAt: '2024-01-01T00:00:00Z',
    },
    {
      userId: 'user-2',
      teamId: 'team-1',
      role: 'member' as const,
      user: {
        id: 'user-2',
        email: 'member@example.com',
        name: 'Team Member',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      joinedAt: '2024-01-02T00:00:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  it('renders member list', () => {
    render(<MemberManagement members={mockMembers} teamId="team-1" />);

    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('Team Member')).toBeInTheDocument();
    expect(screen.getByText('Owner')).toBeInTheDocument();
    expect(screen.getByText('Member')).toBeInTheDocument();
  });

  it('shows invite member form', async () => {
    const user = userEvent.setup();

    render(<MemberManagement members={mockMembers} teamId="team-1" />);

    await user.click(screen.getByText('邀请成员'));

    expect(screen.getByLabelText(/邮箱地址/)).toBeInTheDocument();
    expect(screen.getByLabelText(/角色/)).toBeInTheDocument();
  });

  it('invites new member', async () => {
    const user = userEvent.setup();

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { inviteUrl: 'https://example.com/invite/abc123' },
      }),
    });

    render(<MemberManagement members={mockMembers} teamId="team-1" />);

    await user.click(screen.getByText('邀请成员'));
    await user.type(screen.getByLabelText(/邮箱地址/), 'new@example.com');
    await user.click(screen.getByRole('button', { name: '发送邀请' }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/teams/team-1/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'new@example.com',
          role: 'member',
        }),
      });
    });
  });

  it('removes team member', async () => {
    const user = userEvent.setup();

    // Mock window.confirm
    window.confirm = jest.fn(() => true);

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<MemberManagement members={mockMembers} teamId="team-1" />);

    const removeButtons = screen.getAllByText('移除');
    await user.click(removeButtons[0]); // Remove the member (not owner)

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/teams/team-1/members/user-2', {
        method: 'DELETE',
      });
    });
  });

  it('changes member role', async () => {
    const user = userEvent.setup();

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<MemberManagement members={mockMembers} teamId="team-1" />);

    // Find and click the role dropdown for the member
    const roleSelects = screen.getAllByDisplayValue('Member');
    await user.click(roleSelects[0]);
    await user.click(screen.getByText('Viewer'));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/teams/team-1/members/user-2', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'viewer' }),
      });
    });
  });
});

describe('TeamSettings', () => {
  const mockOnTeamUpdated = jest.fn();
  const mockOnTeamDeleted = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  it('renders team settings form', () => {
    render(
      <TeamSettings
        team={mockTeam}
        onTeamUpdated={mockOnTeamUpdated}
        onTeamDeleted={mockOnTeamDeleted}
      />
    );

    expect(screen.getByDisplayValue('Test Team')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Description')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '保存更改' })
    ).toBeInTheDocument();
  });

  it('updates team information', async () => {
    const user = userEvent.setup();

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { team: { ...mockTeam, name: 'Updated Team' } },
      }),
    });

    render(
      <TeamSettings
        team={mockTeam}
        onTeamUpdated={mockOnTeamUpdated}
        onTeamDeleted={mockOnTeamDeleted}
      />
    );

    const nameInput = screen.getByDisplayValue('Test Team');
    await user.clear(nameInput);
    await user.type(nameInput, 'Updated Team');
    await user.click(screen.getByRole('button', { name: '保存更改' }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/teams/team-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Updated Team',
          description: 'Test Description',
        }),
      });
      expect(mockOnTeamUpdated).toHaveBeenCalled();
    });
  });

  it('deletes team with confirmation', async () => {
    const user = userEvent.setup();

    // Mock window.confirm and prompt
    window.confirm = jest.fn(() => true);
    window.prompt = jest.fn(() => 'Test Team');

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(
      <TeamSettings
        team={mockTeam}
        onTeamUpdated={mockOnTeamUpdated}
        onTeamDeleted={mockOnTeamDeleted}
      />
    );

    await user.click(screen.getByText('删除团队'));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/teams/team-1', {
        method: 'DELETE',
      });
      expect(mockOnTeamDeleted).toHaveBeenCalled();
    });
  });

  it('prevents team deletion without confirmation', async () => {
    const user = userEvent.setup();

    // Mock window.prompt to return wrong team name
    window.confirm = jest.fn(() => true);
    window.prompt = jest.fn(() => 'Wrong Name');

    render(
      <TeamSettings
        team={mockTeam}
        onTeamUpdated={mockOnTeamUpdated}
        onTeamDeleted={mockOnTeamDeleted}
      />
    );

    await user.click(screen.getByText('删除团队'));

    expect(fetch).not.toHaveBeenCalled();
    expect(mockOnTeamDeleted).not.toHaveBeenCalled();
  });
});
