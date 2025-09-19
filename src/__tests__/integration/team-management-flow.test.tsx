/**
 * Integration tests for team management flow
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render, mockUser, mockTeam } from '../test-utils';
import { TeamProvider } from '@/components/team/TeamProvider';
import { TeamSelector } from '@/components/team/TeamSelector';
import { CreateTeamDialog } from '@/components/team/CreateTeamDialog';
import { MemberManagement } from '@/components/team/MemberManagement';

// Mock NextAuth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: { user: mockUser },
    status: 'authenticated',
  })),
}));

// Mock fetch
global.fetch = jest.fn();

// Mock router
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard',
}));

describe('Team Management Flow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
    mockPush.mockClear();
  });

  describe('Team Creation and Selection Flow', () => {
    it('completes full team creation and selection process', async () => {
      const user = userEvent.setup();

      // Mock API responses
      const newTeam = {
        id: 'team-2',
        name: 'New Team',
        description: 'New team description',
        ownerId: mockUser.id,
        subscriptionKey: 'sub-key-2',
        createdAt: '2024-01-15T00:00:00Z',
        updatedAt: '2024-01-15T00:00:00Z',
      };

      // Mock teams list API
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: { teams: [mockTeam] },
          }),
        })
        // Mock team creation API
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: { team: newTeam },
          }),
        })
        // Mock updated teams list API
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: { teams: [mockTeam, newTeam] },
          }),
        });

      const TestComponent = () => {
        const [isCreateDialogOpen, setIsCreateDialogOpen] =
          React.useState(false);
        const [teams, setTeams] = React.useState([mockTeam]);
        const [currentTeam, setCurrentTeam] = React.useState(mockTeam);

        const handleTeamCreated = (team: any) => {
          setTeams(prev => [...prev, team]);
          setCurrentTeam(team);
          setIsCreateDialogOpen(false);
        };

        return (
          <div>
            <TeamSelector
              teams={teams}
              currentTeam={currentTeam}
              onTeamChange={teamId => {
                const team = teams.find(t => t.id === teamId);
                if (team) setCurrentTeam(team);
              }}
            />
            <button onClick={() => setIsCreateDialogOpen(true)}>
              创建新团队
            </button>
            <CreateTeamDialog
              isOpen={isCreateDialogOpen}
              onClose={() => setIsCreateDialogOpen(false)}
              onTeamCreated={handleTeamCreated}
            />
          </div>
        );
      };

      render(<TestComponent />);

      // Verify initial team is displayed
      expect(screen.getByText('Test Team')).toBeInTheDocument();

      // Open create team dialog
      await user.click(screen.getByText('创建新团队'));

      // Fill team creation form
      await user.type(screen.getByLabelText(/团队名称/), 'New Team');
      await user.type(
        screen.getByLabelText(/团队描述/),
        'New team description'
      );

      // Submit form
      await user.click(screen.getByRole('button', { name: '创建团队' }));

      // Verify API call
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/teams', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'New Team',
            description: 'New team description',
          }),
        });
      });

      // Verify new team is selected
      await waitFor(() => {
        expect(screen.getByText('New Team')).toBeInTheDocument();
      });
    });

    it('handles team switching between multiple teams', async () => {
      const user = userEvent.setup();

      const team2 = {
        ...mockTeam,
        id: 'team-2',
        name: 'Second Team',
      };

      const TestComponent = () => {
        const [currentTeam, setCurrentTeam] = React.useState(mockTeam);
        const teams = [mockTeam, team2];

        return (
          <div>
            <TeamSelector
              teams={teams}
              currentTeam={currentTeam}
              onTeamChange={teamId => {
                const team = teams.find(t => t.id === teamId);
                if (team) setCurrentTeam(team);
              }}
            />
            <div data-testid="current-team">{currentTeam.name}</div>
          </div>
        );
      };

      render(<TestComponent />);

      // Verify initial team
      expect(screen.getByTestId('current-team')).toHaveTextContent('Test Team');

      // Open team selector
      await user.click(screen.getByRole('button'));

      // Switch to second team
      await user.click(screen.getByText('Second Team'));

      // Verify team switched
      expect(screen.getByTestId('current-team')).toHaveTextContent(
        'Second Team'
      );
    });
  });

  describe('Member Management Flow', () => {
    const mockMembers = [
      {
        userId: mockUser.id,
        teamId: mockTeam.id,
        role: 'owner' as const,
        user: mockUser,
        joinedAt: '2024-01-01T00:00:00Z',
      },
      {
        userId: 'user-2',
        teamId: mockTeam.id,
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

    it('completes member invitation process', async () => {
      const user = userEvent.setup();

      // Mock invitation API
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { inviteUrl: 'https://example.com/invite/abc123' },
        }),
      });

      render(<MemberManagement members={mockMembers} teamId={mockTeam.id} />);

      // Open invite form
      await user.click(screen.getByText('邀请成员'));

      // Fill invitation form
      await user.type(
        screen.getByLabelText(/邮箱地址/),
        'newmember@example.com'
      );

      // Select role
      await user.click(screen.getByLabelText(/角色/));
      await user.click(screen.getByText('Member'));

      // Submit invitation
      await user.click(screen.getByRole('button', { name: '发送邀请' }));

      // Verify API call
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          `/api/teams/${mockTeam.id}/invitations`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: 'newmember@example.com',
              role: 'member',
            }),
          }
        );
      });

      // Verify success message
      expect(screen.getByText(/邀请已发送/)).toBeInTheDocument();
    });

    it('handles member role changes', async () => {
      const user = userEvent.setup();

      // Mock role update API
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<MemberManagement members={mockMembers} teamId={mockTeam.id} />);

      // Find member role selector (not the owner)
      const memberRoleSelects = screen.getAllByDisplayValue('Member');
      await user.click(memberRoleSelects[0]);

      // Change to viewer role
      await user.click(screen.getByText('Viewer'));

      // Verify API call
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          `/api/teams/${mockTeam.id}/members/user-2`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: 'viewer' }),
          }
        );
      });
    });

    it('handles member removal with confirmation', async () => {
      const user = userEvent.setup();

      // Mock confirmation dialog
      window.confirm = jest.fn(() => true);

      // Mock member removal API
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<MemberManagement members={mockMembers} teamId={mockTeam.id} />);

      // Find and click remove button for member (not owner)
      const removeButtons = screen.getAllByText('移除');
      await user.click(removeButtons[0]);

      // Verify confirmation was shown
      expect(window.confirm).toHaveBeenCalledWith(
        expect.stringContaining('确定要移除成员')
      );

      // Verify API call
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          `/api/teams/${mockTeam.id}/members/user-2`,
          {
            method: 'DELETE',
          }
        );
      });
    });

    it('prevents owner from removing themselves', () => {
      render(<MemberManagement members={mockMembers} teamId={mockTeam.id} />);

      // Owner should not have a remove button
      const ownerRow = screen.getByText('Test User').closest('tr');
      expect(ownerRow).not.toHaveTextContent('移除');
    });
  });

  describe('Team Settings and Management Flow', () => {
    it('updates team information', async () => {
      const user = userEvent.setup();

      // Mock team update API
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            team: { ...mockTeam, name: 'Updated Team Name' },
          },
        }),
      });

      const TestComponent = () => {
        const [team, setTeam] = React.useState(mockTeam);

        return (
          <div>
            <input
              value={team.name}
              onChange={e => setTeam({ ...team, name: e.target.value })}
              aria-label="团队名称"
            />
            <button
              onClick={async () => {
                const response = await fetch(`/api/teams/${team.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    name: team.name,
                    description: team.description,
                  }),
                });
                if (response.ok) {
                  const data = await response.json();
                  setTeam(data.data.team);
                }
              }}
            >
              保存更改
            </button>
          </div>
        );
      };

      render(<TestComponent />);

      // Update team name
      const nameInput = screen.getByLabelText('团队名称');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Team Name');

      // Save changes
      await user.click(screen.getByText('保存更改'));

      // Verify API call
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(`/api/teams/${mockTeam.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Updated Team Name',
            description: mockTeam.description,
          }),
        });
      });
    });

    it('handles team deletion with proper confirmation', async () => {
      const user = userEvent.setup();

      // Mock confirmation dialogs
      window.confirm = jest.fn(() => true);
      window.prompt = jest.fn(() => mockTeam.name);

      // Mock team deletion API
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const TestComponent = () => {
        const [isDeleted, setIsDeleted] = React.useState(false);

        const handleDelete = async () => {
          if (window.confirm('确定要删除团队吗？')) {
            const teamName = window.prompt('请输入团队名称以确认删除：');
            if (teamName === mockTeam.name) {
              const response = await fetch(`/api/teams/${mockTeam.id}`, {
                method: 'DELETE',
              });
              if (response.ok) {
                setIsDeleted(true);
              }
            }
          }
        };

        if (isDeleted) {
          return <div>团队已删除</div>;
        }

        return <button onClick={handleDelete}>删除团队</button>;
      };

      render(<TestComponent />);

      // Click delete button
      await user.click(screen.getByText('删除团队'));

      // Verify confirmations were shown
      expect(window.confirm).toHaveBeenCalledWith('确定要删除团队吗？');
      expect(window.prompt).toHaveBeenCalledWith('请输入团队名称以确认删除：');

      // Verify API call
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(`/api/teams/${mockTeam.id}`, {
          method: 'DELETE',
        });
      });

      // Verify deletion success
      expect(screen.getByText('团队已删除')).toBeInTheDocument();
    });

    it('prevents team deletion with incorrect confirmation', async () => {
      const user = userEvent.setup();

      // Mock confirmation dialogs with wrong team name
      window.confirm = jest.fn(() => true);
      window.prompt = jest.fn(() => 'Wrong Team Name');

      const TestComponent = () => {
        const [errorMessage, setErrorMessage] = React.useState('');

        const handleDelete = async () => {
          if (window.confirm('确定要删除团队吗？')) {
            const teamName = window.prompt('请输入团队名称以确认删除：');
            if (teamName !== mockTeam.name) {
              setErrorMessage('团队名称不匹配，删除取消');
              return;
            }
          }
        };

        return (
          <div>
            <button onClick={handleDelete}>删除团队</button>
            {errorMessage && <div>{errorMessage}</div>}
          </div>
        );
      };

      render(<TestComponent />);

      // Click delete button
      await user.click(screen.getByText('删除团队'));

      // Verify error message
      expect(screen.getByText('团队名称不匹配，删除取消')).toBeInTheDocument();

      // Verify no API call was made
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe('Team Context Integration', () => {
    it('manages team state across components', async () => {
      const user = userEvent.setup();

      // Mock teams API
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: { teams: [mockTeam] },
        }),
      });

      const TestApp = () => {
        return (
          <TeamProvider>
            <div data-testid="app-content">
              <TeamSelector
                teams={[mockTeam]}
                currentTeam={mockTeam}
                onTeamChange={() => {}}
              />
            </div>
          </TeamProvider>
        );
      };

      render(<TestApp />);

      // Verify team provider loads teams
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/teams');
      });

      // Verify team selector shows current team
      expect(screen.getByText('Test Team')).toBeInTheDocument();
    });
  });
});
