/**
 * Team calendar subscription management utilities
 */

import { randomBytes } from 'crypto';

/**
 * Generates a secure subscription key for a team
 */
export function generateSubscriptionKey(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Generates the subscription URL for a team
 */
export function generateSubscriptionUrl(
  teamId: string,
  subscriptionKey: string,
  baseUrl?: string
): string {
  const domain =
    baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${domain}/api/teams/${teamId}/subscription/${subscriptionKey}`;
}

/**
 * Validates a subscription key format
 */
export function validateSubscriptionKey(key: string): boolean {
  // Should be a 64-character hex string
  return /^[a-f0-9]{64}$/.test(key);
}

/**
 * Generates subscription instructions for different calendar applications
 */
export interface SubscriptionInstructions {
  platform: string;
  title: string;
  steps: string[];
}

export function getSubscriptionInstructions(
  subscriptionUrl: string
): SubscriptionInstructions[] {
  return [
    {
      platform: 'ios',
      title: 'iPhone/iPad (iOS Calendar)',
      steps: [
        '打开"设置"应用',
        '滚动并点击"日历"',
        '点击"账户"',
        '点击"添加账户"',
        '选择"其他"',
        '点击"添加已订阅的日历"',
        `输入订阅链接: ${subscriptionUrl}`,
        '点击"下一步"并保存',
      ],
    },
    {
      platform: 'google',
      title: 'Google Calendar',
      steps: [
        '打开 Google Calendar (calendar.google.com)',
        '在左侧边栏找到"其他日历"',
        '点击"+"号',
        '选择"通过网址"',
        `输入订阅链接: ${subscriptionUrl}`,
        '点击"添加日历"',
      ],
    },
    {
      platform: 'outlook',
      title: 'Microsoft Outlook',
      steps: [
        '打开 Outlook 日历',
        '点击"添加日历"',
        '选择"从 Internet 订阅"',
        `输入订阅链接: ${subscriptionUrl}`,
        '输入日历名称',
        '点击"导入"',
      ],
    },
    {
      platform: 'apple',
      title: 'macOS Calendar',
      steps: [
        '打开"日历"应用',
        '点击菜单栏中的"文件"',
        '选择"新建日历订阅"',
        `输入订阅链接: ${subscriptionUrl}`,
        '点击"订阅"',
        '配置更新频率和其他设置',
      ],
    },
  ];
}

/**
 * Subscription settings interface
 */
export interface SubscriptionSettings {
  teamId: string;
  subscriptionKey: string;
  subscriptionUrl: string;
  isEnabled: boolean;
  lastAccessed?: string;
  accessCount: number;
}

/**
 * Creates default subscription settings for a team
 */
export function createDefaultSubscriptionSettings(
  teamId: string,
  subscriptionKey: string
): SubscriptionSettings {
  return {
    teamId,
    subscriptionKey,
    subscriptionUrl: generateSubscriptionUrl(teamId, subscriptionKey),
    isEnabled: true,
    accessCount: 0,
  };
}

/**
 * Regenerates subscription key and URL for a team
 */
export function regenerateSubscription(teamId: string): {
  subscriptionKey: string;
  subscriptionUrl: string;
} {
  const subscriptionKey = generateSubscriptionKey();
  const subscriptionUrl = generateSubscriptionUrl(teamId, subscriptionKey);

  return {
    subscriptionKey,
    subscriptionUrl,
  };
}
