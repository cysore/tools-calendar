/**
 * Team join page for handling invitation links
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { CheckCircle, XCircle, Users } from 'lucide-react';

function TeamJoinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [teamInfo, setTeamInfo] = useState<{
    name: string;
    description?: string;
    role: string;
  } | null>(null);

  const token = searchParams.get('token');
  const teamId = searchParams.get('teamId');
  const email = searchParams.get('email');
  const role = searchParams.get('role');

  useEffect(() => {
    const joinTeam = async () => {
      if (!token || !teamId || !email || !role) {
        setError('邀请链接无效或已过期');
        setLoading(false);
        return;
      }

      if (!user) {
        setLoading(false);
        return;
      }

      // 检查邮箱是否匹配
      if (user.email !== email) {
        setError('此邀请链接不是为您的邮箱地址创建的');
        setLoading(false);
        return;
      }

      try {
        // 首先获取团队信息
        const teamResponse = await fetch(`/api/teams/${teamId}`);
        if (!teamResponse.ok) {
          throw new Error('团队不存在或您没有访问权限');
        }

        const teamData = await teamResponse.json();
        setTeamInfo({
          name: teamData.team.name,
          description: teamData.team.description,
          role: role,
        });

        // 尝试加入团队
        const joinResponse = await fetch(`/api/teams/join`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token,
            teamId,
            email,
            role,
          }),
        });

        if (!joinResponse.ok) {
          const errorData = await joinResponse.json();
          throw new Error(errorData.error?.message || '加入团队失败');
        }

        setSuccess(true);
      } catch (error) {
        console.error('Error joining team:', error);
        setError(error instanceof Error ? error.message : '加入团队失败');
      } finally {
        setLoading(false);
      }
    };

    joinTeam();
  }, [token, teamId, email, role, user]);

  const getRoleLabel = (role: string) => {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center space-y-4">
              <LoadingSpinner className="h-8 w-8 mx-auto" />
              <p className="text-muted-foreground">正在处理邀请...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            {success ? (
              <CheckCircle className="h-12 w-12 text-green-500" />
            ) : error ? (
              <XCircle className="h-12 w-12 text-red-500" />
            ) : (
              <Users className="h-12 w-12 text-blue-500" />
            )}
          </div>
          <CardTitle>
            {success ? '成功加入团队！' : error ? '加入失败' : '团队邀请'}
          </CardTitle>
          <CardDescription>
            {success
              ? '您已成功加入团队，现在可以访问团队日历了。'
              : error
                ? '很抱歉，无法处理您的团队邀请。'
                : '您收到了一个团队邀请'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {teamInfo && (
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div>
                <span className="font-medium">团队名称:</span>
                <p className="text-muted-foreground">{teamInfo.name}</p>
              </div>
              {teamInfo.description && (
                <div>
                  <span className="font-medium">团队描述:</span>
                  <p className="text-muted-foreground">
                    {teamInfo.description}
                  </p>
                </div>
              )}
              <div>
                <span className="font-medium">您的角色:</span>
                <p className="text-muted-foreground">
                  {getRoleLabel(teamInfo.role)}
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </div>
          )}

          <div className="flex flex-col space-y-2">
            {success ? (
              <Button
                onClick={() => router.push('/dashboard')}
                className="w-full"
              >
                前往控制面板
              </Button>
            ) : (
              <Button
                onClick={() => router.push('/dashboard')}
                variant="outline"
                className="w-full"
              >
                返回控制面板
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function TeamJoinPage() {
  return (
    <ProtectedRoute>
      <TeamJoinContent />
    </ProtectedRoute>
  );
}
