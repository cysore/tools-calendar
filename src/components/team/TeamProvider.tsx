/**
 * Team context provider for managing team state
 */

'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import {
  Team,
  TeamMember,
  CreateTeamData,
  InviteMemberData,
  TeamContextType,
} from '@/types/team';
import { useAuth } from '@/hooks/useAuth';

const TeamContext = createContext<TeamContextType | undefined>(undefined);

interface TeamProviderProps {
  children: React.ReactNode;
}

export function TeamProvider({ children }: TeamProviderProps) {
  const { user } = useAuth();
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  // 获取用户的所有团队
  const fetchTeams = useCallback(async () => {
    if (!user) return;

    try {
      const response = await fetch('/api/teams');
      if (!response.ok) {
        throw new Error('Failed to fetch teams');
      }

      const data = await response.json();
      setTeams(data.teams || []);

      // 如果没有当前团队但有团队列表，选择第一个团队
      if (!currentTeam && data.teams?.length > 0) {
        const savedTeamId = localStorage.getItem('currentTeamId');
        const teamToSelect = savedTeamId
          ? data.teams.find((t: Team) => t.id === savedTeamId) || data.teams[0]
          : data.teams[0];

        setCurrentTeam(teamToSelect);
        localStorage.setItem('currentTeamId', teamToSelect.id);
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setLoading(false);
    }
  }, [user, currentTeam]);

  // 获取当前团队的成员
  const fetchMembers = useCallback(async () => {
    if (!currentTeam) {
      setMembers([]);
      return;
    }

    try {
      const response = await fetch(`/api/teams/${currentTeam.id}/members`);
      if (!response.ok) {
        throw new Error('Failed to fetch members');
      }

      const data = await response.json();
      setMembers(data.members || []);
    } catch (error) {
      console.error('Error fetching members:', error);
      setMembers([]);
    }
  }, [currentTeam]);

  // 切换团队
  const switchTeam = useCallback(
    (teamId: string) => {
      const team = teams.find(t => t.id === teamId);
      if (team) {
        setCurrentTeam(team);
        localStorage.setItem('currentTeamId', teamId);
        // 清空当前成员列表，将在 useEffect 中重新获取
        setMembers([]);
      }
    },
    [teams]
  );

  // 创建团队
  const createTeam = useCallback(
    async (data: CreateTeamData): Promise<Team> => {
      try {
        const response = await fetch('/api/teams', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'Failed to create team');
        }

        const result = await response.json();
        const newTeam = result.team;

        // 更新团队列表
        setTeams(prev => [...prev, newTeam]);

        // 如果这是第一个团队，自动选择它
        if (teams.length === 0) {
          setCurrentTeam(newTeam);
          localStorage.setItem('currentTeamId', newTeam.id);
        }

        return newTeam;
      } catch (error) {
        console.error('Error creating team:', error);
        throw error;
      }
    },
    [teams.length]
  );

  // 邀请成员
  const inviteMember = useCallback(
    async (data: InviteMemberData): Promise<string> => {
      if (!currentTeam) {
        throw new Error('No current team selected');
      }

      try {
        const response = await fetch(`/api/teams/${currentTeam.id}/members`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...data,
            generateLink: true, // 生成邀请链接
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error?.message || 'Failed to invite member'
          );
        }

        const result = await response.json();

        // 刷新成员列表
        await fetchMembers();

        return result.invitationUrl;
      } catch (error) {
        console.error('Error inviting member:', error);
        throw error;
      }
    },
    [currentTeam, fetchMembers]
  );

  // 离开团队
  const leaveTeam = useCallback(
    async (teamId: string): Promise<void> => {
      if (!user) return;

      try {
        const response = await fetch(
          `/api/teams/${teamId}/members/${user.id}`,
          {
            method: 'DELETE',
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'Failed to leave team');
        }

        // 从团队列表中移除
        setTeams(prev => prev.filter(t => t.id !== teamId));

        // 如果离开的是当前团队，切换到其他团队或清空
        if (currentTeam?.id === teamId) {
          const remainingTeams = teams.filter(t => t.id !== teamId);
          if (remainingTeams.length > 0) {
            switchTeam(remainingTeams[0].id);
          } else {
            setCurrentTeam(null);
            setMembers([]);
            localStorage.removeItem('currentTeamId');
          }
        }
      } catch (error) {
        console.error('Error leaving team:', error);
        throw error;
      }
    },
    [user, currentTeam, teams, switchTeam]
  );

  // 更新成员角色
  const updateMemberRole = useCallback(
    async (userId: string, role: string): Promise<void> => {
      if (!currentTeam) return;

      try {
        const response = await fetch(
          `/api/teams/${currentTeam.id}/members/${userId}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ role }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error?.message || 'Failed to update member role'
          );
        }

        // 刷新成员列表
        await fetchMembers();
      } catch (error) {
        console.error('Error updating member role:', error);
        throw error;
      }
    },
    [currentTeam, fetchMembers]
  );

  // 初始化时获取团队列表
  useEffect(() => {
    if (user) {
      fetchTeams();
    } else {
      setTeams([]);
      setCurrentTeam(null);
      setMembers([]);
      setLoading(false);
    }
  }, [user, fetchTeams]);

  // 当前团队变化时获取成员列表
  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const value: TeamContextType = {
    currentTeam,
    teams,
    members,
    switchTeam,
    createTeam,
    inviteMember,
    leaveTeam,
    updateMemberRole,
  };

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
}

export function useTeam() {
  const context = useContext(TeamContext);
  if (context === undefined) {
    throw new Error('useTeam must be used within a TeamProvider');
  }
  return context;
}
