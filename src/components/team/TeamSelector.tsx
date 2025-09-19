/**
 * Team selector component for switching between teams
 */

'use client';

import React from 'react';
import { Check, ChevronDown, Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useTeam } from './TeamProvider';

interface TeamSelectorProps {
  onCreateTeam?: () => void;
  className?: string;
}

export function TeamSelector({ onCreateTeam, className }: TeamSelectorProps) {
  const { currentTeam, teams, switchTeam } = useTeam();

  const getTeamInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={`w-full justify-between ${className}`}
        >
          <div className="flex items-center space-x-2">
            {currentTeam ? (
              <>
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs">
                    {getTeamInitials(currentTeam.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{currentTeam.name}</span>
              </>
            ) : (
              <>
                <Users className="h-4 w-4" />
                <span>选择团队</span>
              </>
            )}
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 md:w-56" align="start">
        <DropdownMenuLabel className="text-sm font-medium">
          我的团队
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {teams.length === 0 ? (
          <DropdownMenuItem disabled className="py-3">
            <span className="text-muted-foreground">暂无团队</span>
          </DropdownMenuItem>
        ) : (
          teams.map(team => (
            <DropdownMenuItem
              key={team.id}
              onClick={() => switchTeam(team.id)}
              className="flex items-center space-x-3 py-3 cursor-pointer touch-manipulation"
            >
              <Avatar className="h-8 w-8 md:h-6 md:w-6">
                <AvatarFallback className="text-xs">
                  {getTeamInitials(team.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 truncate">
                <div className="font-medium text-sm">{team.name}</div>
                {team.description && (
                  <div className="text-xs text-muted-foreground truncate">
                    {team.description}
                  </div>
                )}
              </div>
              {currentTeam?.id === team.id && (
                <Check className="h-4 w-4 text-blue-600" />
              )}
            </DropdownMenuItem>
          ))
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onCreateTeam}
          className="py-3 cursor-pointer touch-manipulation"
        >
          <Plus className="h-4 w-4 mr-2" />
          <span className="font-medium">创建新团队</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
