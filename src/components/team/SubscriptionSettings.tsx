/**
 * Team subscription settings component
 * Manages iCalendar subscription links and instructions
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Copy,
  RefreshCw,
  Download,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useTeam } from '@/components/team/TeamProvider';

interface SubscriptionData {
  teamId: string;
  teamName: string;
  subscriptionUrl: string;
  instructions: SubscriptionInstruction[];
  isEnabled: boolean;
}

interface SubscriptionInstruction {
  platform: string;
  title: string;
  steps: string[];
}

export function SubscriptionSettings() {
  const { currentTeam } = useTeam();
  const [subscriptionData, setSubscriptionData] =
    useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // Fetch subscription settings
  const fetchSubscriptionSettings = useCallback(async () => {
    if (!currentTeam) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/teams/${currentTeam.id}/subscription`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(
          result.error?.message || 'Failed to fetch subscription settings'
        );
      }

      setSubscriptionData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [currentTeam]);

  // Regenerate subscription link
  const regenerateSubscription = async () => {
    if (!currentTeam) return;

    try {
      setRegenerating(true);
      setError(null);

      const response = await fetch(
        `/api/teams/${currentTeam.id}/subscription`,
        {
          method: 'POST',
        }
      );
      const result = await response.json();

      if (!result.success) {
        throw new Error(
          result.error?.message || 'Failed to regenerate subscription link'
        );
      }

      setSubscriptionData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setRegenerating(false);
    }
  };

  // Copy subscription URL to clipboard
  const copySubscriptionUrl = async () => {
    if (!subscriptionData?.subscriptionUrl) return;

    try {
      await navigator.clipboard.writeText(subscriptionData.subscriptionUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      setError('Failed to copy to clipboard');
    }
  };

  // Export calendar as .ics file
  const exportCalendar = async (type: 'full' | 'monthly' = 'full') => {
    if (!currentTeam) return;

    try {
      setExporting(true);
      setError(null);

      let url = `/api/teams/${currentTeam.id}/export?type=${type}`;

      if (type === 'monthly') {
        const now = new Date();
        url += `&year=${now.getFullYear()}&month=${now.getMonth() + 1}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to export calendar');
      }

      // Download the file
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${currentTeam.name}_calendar.ics`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    fetchSubscriptionSettings();
  }, [fetchSubscriptionSettings]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        <div className="h-32 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  if (!subscriptionData) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Unable to load subscription settings. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Subscription URL */}
      <Card>
        <CardHeader>
          <CardTitle>订阅链接</CardTitle>
          <CardDescription>
            使用此链接将团队日历订阅到您的个人日历应用中
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <div className="flex-1 p-3 bg-gray-50 rounded-md font-mono text-sm break-all">
              {subscriptionData.subscriptionUrl}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={copySubscriptionUrl}
              disabled={copySuccess}
            >
              <Copy className="h-4 w-4" />
              {copySuccess ? '已复制' : '复制'}
            </Button>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={regenerateSubscription}
              disabled={regenerating}
            >
              <RefreshCw
                className={`h-4 w-4 ${regenerating ? 'animate-spin' : ''}`}
              />
              重新生成链接
            </Button>
            <Button
              variant="outline"
              onClick={() => exportCalendar('full')}
              disabled={exporting}
            >
              <Download className="h-4 w-4" />
              导出完整日历
            </Button>
            <Button
              variant="outline"
              onClick={() => exportCalendar('monthly')}
              disabled={exporting}
            >
              <Download className="h-4 w-4" />
              导出本月事件
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Platform Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>订阅教程</CardTitle>
          <CardDescription>
            根据您使用的日历应用选择相应的设置方法
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {subscriptionData.instructions.map((instruction, index) => (
              <div key={instruction.platform}>
                {index > 0 && <Separator />}
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    {instruction.title}
                  </h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                    {instruction.steps.map((step, stepIndex) => (
                      <li key={stepIndex}>{step}</li>
                    ))}
                  </ol>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Additional Information */}
      <Card>
        <CardHeader>
          <CardTitle>重要说明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-600">
          <p>• 订阅链接会自动同步团队日历的最新事件</p>
          <p>• 大多数日历应用会每隔几小时自动更新订阅内容</p>
          <p>• 如果怀疑链接泄露，请及时重新生成新的订阅链接</p>
          <p>• 导出的 .ics 文件是静态的，不会自动更新</p>
        </CardContent>
      </Card>
    </div>
  );
}
