/**
 * Dashboard page - protected route for authenticated users
 */

'use client';

import { useState } from 'react';
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
import { AuthStatus } from '@/components/auth/AuthStatus';
import {
  TeamProvider,
  TeamSelector,
  CreateTeamDialog,
} from '@/components/team';
import { LazyTeamSettings } from '@/lib/performance/lazy-components';
import { CalendarPage } from '@/components/calendar';
import { Settings, Calendar, Link, Plus } from 'lucide-react';
import { CalendarEvent } from '@/types';
import { MobileNavigation } from '@/components/ui/mobile-navigation';
import { PerformanceMonitor } from '@/components/performance/PerformanceMonitor';

function DashboardContent() {
  const { user, logout } = useAuth();
  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'calendar' | 'settings'
  >('overview');
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null
  );
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <TeamProvider>
      <div className="min-h-screen-mobile bg-gray-50 p-4 md:p-6 pb-20 md:pb-6">
        <div className="max-w-6xl mx-auto space-y-4 md:space-y-6">
          {/* Header - 移动端优化 */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground truncate">
                欢迎，{user?.name}！
              </h1>
              <p className="text-sm md:text-base text-muted-foreground">
                团队日历同步器控制面板
              </p>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="self-start sm:self-auto touch-manipulation"
            >
              退出登录
            </Button>
          </div>

          {/* Team Selector and Navigation - 移动端优化 */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="w-full lg:w-64">
              <TeamSelector onCreateTeam={() => setCreateTeamOpen(true)} />
            </div>

            {/* 导航标签 - 移动端优化 */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg overflow-x-auto">
              <Button
                variant={activeTab === 'overview' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('overview')}
                className="flex-shrink-0 touch-manipulation"
                size="sm"
              >
                <span className="lg:hidden">概览</span>
                <span className="hidden lg:inline">概览</span>
              </Button>
              <Button
                variant={activeTab === 'calendar' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('calendar')}
                className="flex-shrink-0 touch-manipulation"
                size="sm"
              >
                <Calendar className="h-4 w-4 lg:mr-2" />
                <span className="hidden sm:inline">日历</span>
              </Button>
              <Button
                variant={activeTab === 'settings' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('settings')}
                className="flex-shrink-0 touch-manipulation"
                size="sm"
              >
                <Settings className="h-4 w-4 lg:mr-2" />
                <span className="hidden sm:inline">设置</span>
              </Button>
            </div>
          </div>

          {/* Main Content */}
          {activeTab === 'overview' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Settings className="h-5 w-5 mr-2" />
                    团队管理
                  </CardTitle>
                  <CardDescription>管理您的团队和成员</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full"
                    onClick={() => setActiveTab('settings')}
                  >
                    管理团队
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="h-5 w-5 mr-2" />
                    日历事件
                  </CardTitle>
                  <CardDescription>查看和管理团队事件</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full"
                    onClick={() => setActiveTab('calendar')}
                  >
                    查看日历
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Link className="h-5 w-5 mr-2" />
                    订阅设置
                  </CardTitle>
                  <CardDescription>管理 iCalendar 订阅</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full"
                    onClick={() => setActiveTab('settings')}
                  >
                    管理订阅
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : activeTab === 'calendar' ? (
            <CalendarPage
              onCreateEvent={date => {
                setSelectedDate(date || null);
                setSelectedEvent(null);
                setShowEventModal(true);
              }}
              onEditEvent={event => {
                setSelectedEvent(event);
                setSelectedDate(null);
                setShowEventModal(true);
              }}
            />
          ) : (
            <LazyTeamSettings />
          )}

          {/* Debug Info (only in development) */}
          {process.env.NODE_ENV === 'development' && (
            <Card>
              <CardHeader>
                <CardTitle>认证状态</CardTitle>
                <CardDescription>
                  当前用户认证信息（开发调试用）
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AuthStatus />
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Mobile Navigation */}
      <MobileNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onCreateEvent={() => {
          if (activeTab !== 'calendar') {
            setActiveTab('calendar');
          }
          setSelectedDate(new Date());
          setSelectedEvent(null);
          setShowEventModal(true);
        }}
      />

      {/* Create Team Dialog */}
      <CreateTeamDialog
        open={createTeamOpen}
        onOpenChange={setCreateTeamOpen}
      />

      {/* Performance Monitor */}
      <PerformanceMonitor enabled={true} />
    </TeamProvider>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
