/**
 * Member management component for inviting and managing team members
 */

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { UserPlus, Copy, MoreHorizontal, Crown, User, Eye } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTeam } from './TeamProvider';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types/auth';

export function MemberManagement() {
  const { user } = useAuth();
  const { currentTeam, members, inviteMember, updateMemberRole } = useTeam();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'member' as UserRole,
  });
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [invitationUrl, setInvitationUrl] = useState('');

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'member':
        return <User className="h-4 w-4 text-blue-500" />;
      case 'viewer':
        return <Eye className="h-4 w-4 text-gray-500" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'owner':
        return '所有者';
      case 'member':
        return '成员';
      case 'viewer':
        return '查看者';
      default:
        return role;
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inviteForm.email.trim()) {
      setInviteError('邮箱地址不能为空');
      return;
    }

    setInviteLoading(true);
    setInviteError('');
    setInviteSuccess('');

    try {
      const url = await inviteMember({
        email: inviteForm.email.trim(),
        role: inviteForm.role,
      });

      setInvitationUrl(url);
      setInviteSuccess('邀请链接已生成');
      setInviteForm({ email: '', role: 'member' });
    } catch (error) {
      console.error('Error inviting member:', error);
      setInviteError(error instanceof Error ? error.message : '邀请成员失败');
    } finally {
      setInviteLoading(false);
    }
  };

  const copyInvitationUrl = async () => {
    try {
      await navigator.clipboard.writeText(invitationUrl);
      // 可以添加一个 toast 提示
    } catch (error) {
      console.error('Failed to copy URL:', error);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: UserRole) => {
    try {
      await updateMemberRole(memberId, newRole);
    } catch (error) {
      console.error('Error updating member role:', error);
      // 可以添加错误提示
    }
  };

  const currentUserMember = members.find(m => m.userId === user?.id);
  const isOwner = currentUserMember?.role === 'owner';

  return (
    <div className="space-y-6">
      {/* 邀请新成员 */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">团队成员</h3>
          <p className="text-sm text-muted-foreground">
            当前团队共有 {members.length} 名成员
          </p>
        </div>

        {isOwner && (
          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                邀请成员
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>邀请新成员</DialogTitle>
                <DialogDescription>
                  输入要邀请的用户邮箱地址和角色，系统将生成邀请链接。
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleInvite} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">邮箱地址 *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="输入邮箱地址"
                    value={inviteForm.email}
                    onChange={e =>
                      setInviteForm(prev => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    disabled={inviteLoading}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">角色</Label>
                  <Select
                    value={inviteForm.role}
                    onValueChange={(value: UserRole) =>
                      setInviteForm(prev => ({ ...prev, role: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">
                        成员 - 可以创建和编辑事件
                      </SelectItem>
                      <SelectItem value="viewer">
                        查看者 - 只能查看事件
                      </SelectItem>
                      <SelectItem value="owner">
                        所有者 - 拥有所有权限
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {inviteError && (
                  <div className="text-sm text-destructive">{inviteError}</div>
                )}

                {inviteSuccess && (
                  <div className="space-y-2">
                    <div className="text-sm text-green-600">
                      {inviteSuccess}
                    </div>
                    {invitationUrl && (
                      <div className="p-3 bg-muted rounded-md">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            邀请链接:
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={copyInvitationUrl}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="text-xs font-mono break-all mt-1">
                          {invitationUrl}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setInviteDialogOpen(false);
                      setInviteForm({ email: '', role: 'member' });
                      setInviteError('');
                      setInviteSuccess('');
                      setInvitationUrl('');
                    }}
                    disabled={inviteLoading}
                  >
                    取消
                  </Button>
                  <Button type="submit" disabled={inviteLoading}>
                    {inviteLoading && (
                      <LoadingSpinner className="mr-2 h-4 w-4" />
                    )}
                    生成邀请链接
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* 成员列表 */}
      <div className="space-y-2">
        {members.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">暂无团队成员</p>
          </div>
        ) : (
          members.map(member => (
            <div
              key={member.userId}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {member.user ? getUserInitials(member.user.name) : '?'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">
                    {member.user?.name || '未知用户'}
                    {member.userId === user?.id && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (您)
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {member.user?.email}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                  {getRoleIcon(member.role)}
                  <span className="text-sm">{getRoleLabel(member.role)}</span>
                </div>

                {isOwner && member.userId !== user?.id && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleRoleChange(member.userId, 'owner')}
                        disabled={member.role === 'owner'}
                      >
                        设为所有者
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          handleRoleChange(member.userId, 'member')
                        }
                        disabled={member.role === 'member'}
                      >
                        设为成员
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          handleRoleChange(member.userId, 'viewer')
                        }
                        disabled={member.role === 'viewer'}
                      >
                        设为查看者
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
