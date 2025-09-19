/**
 * Team settings component for managing team information and settings
 */

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useTeam } from './TeamProvider';
import { MemberManagement } from './MemberManagement';
import { SubscriptionSettings } from './SubscriptionSettings';

export function TeamSettings() {
  const { currentTeam } = useTeam();
  const [formData, setFormData] = useState({
    name: currentTeam?.name || '',
    description: currentTeam?.description || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 当前团队变化时更新表单数据
  React.useEffect(() => {
    if (currentTeam) {
      setFormData({
        name: currentTeam.name,
        description: currentTeam.description || '',
      });
    }
  }, [currentTeam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentTeam) return;

    if (!formData.name.trim()) {
      setError('团队名称不能为空');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/teams/${currentTeam.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || '更新团队信息失败');
      }

      setSuccess('团队信息已成功更新');

      // 刷新页面以更新团队信息
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error updating team:', error);
      setError(error instanceof Error ? error.message : '更新团队信息失败');
    } finally {
      setLoading(false);
    }
  };

  if (!currentTeam) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-muted-foreground">请先选择一个团队</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">团队设置</h2>
        <p className="text-muted-foreground">管理团队信息、成员和权限设置</p>
      </div>

      <div className="grid gap-6">
        {/* 基本信息 */}
        <Card>
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
            <CardDescription>更新团队的基本信息</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">团队名称 *</Label>
                <Input
                  id="name"
                  placeholder="输入团队名称"
                  value={formData.name}
                  onChange={e =>
                    setFormData(prev => ({ ...prev, name: e.target.value }))
                  }
                  disabled={loading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">团队描述</Label>
                <Input
                  id="description"
                  placeholder="输入团队描述（可选）"
                  value={formData.description}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  disabled={loading}
                />
              </div>

              {error && <div className="text-sm text-destructive">{error}</div>}

              {success && (
                <div className="text-sm text-green-600">{success}</div>
              )}

              <Button type="submit" disabled={loading}>
                {loading && <LoadingSpinner className="mr-2 h-4 w-4" />}
                保存更改
              </Button>
            </form>
          </CardContent>
        </Card>

        <Separator />

        {/* 成员管理 */}
        <Card>
          <CardHeader>
            <CardTitle>成员管理</CardTitle>
            <CardDescription>
              邀请新成员、管理现有成员的角色和权限
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MemberManagement />
          </CardContent>
        </Card>

        <Separator />

        {/* 订阅设置 */}
        <Card>
          <CardHeader>
            <CardTitle>订阅设置</CardTitle>
            <CardDescription>
              管理 iCalendar 订阅链接和日历导出功能
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SubscriptionSettings />
          </CardContent>
        </Card>

        <Separator />

        {/* 团队信息 */}
        <Card>
          <CardHeader>
            <CardTitle>团队信息</CardTitle>
            <CardDescription>团队的基本信息和统计数据</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">团队 ID:</span>
                <p className="text-muted-foreground font-mono">
                  {currentTeam.id}
                </p>
              </div>
              <div>
                <span className="font-medium">创建时间:</span>
                <p className="text-muted-foreground">
                  {new Date(currentTeam.createdAt).toLocaleDateString('zh-CN')}
                </p>
              </div>
              <div>
                <span className="font-medium">最后更新:</span>
                <p className="text-muted-foreground">
                  {new Date(currentTeam.updatedAt).toLocaleDateString('zh-CN')}
                </p>
              </div>
              <div>
                <span className="font-medium">所有者 ID:</span>
                <p className="text-muted-foreground font-mono">
                  {currentTeam.ownerId}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
