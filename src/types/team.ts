/**
 * Team related types and interfaces
 */

import { UserRole } from './auth';

export interface Team {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  subscriptionKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  teamId: string;
  userId: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  role: UserRole;
  joinedAt: string;
}

export interface CreateTeamData {
  name: string;
  description?: string;
}

export interface InviteMemberData {
  email: string;
  role: UserRole;
}

export interface TeamContextType {
  currentTeam: Team | null;
  teams: Team[];
  members: TeamMember[];
  switchTeam: (teamId: string) => void;
  createTeam: (data: CreateTeamData) => Promise<Team>;
  inviteMember: (data: InviteMemberData) => Promise<string>;
  leaveTeam: (teamId: string) => Promise<void>;
  updateMemberRole: (userId: string, role: UserRole) => Promise<void>;
}
