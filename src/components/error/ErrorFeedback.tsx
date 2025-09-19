'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  MessageSquare,
  Send,
  CheckCircle,
  AlertTriangle,
  X,
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';

interface ErrorFeedbackProps {
  error: Error;
  onClose: () => void;
  onSubmit?: (feedback: ErrorFeedback) => Promise<void>;
}

interface ErrorFeedback {
  description: string;
  email?: string;
  reproductionSteps?: string;
  expectedBehavior?: string;
  actualBehavior?: string;
  errorDetails: {
    message: string;
    stack?: string;
    timestamp: string;
    userAgent: string;
    url: string;
  };
}

export function ErrorFeedback({
  error,
  onClose,
  onSubmit,
}: ErrorFeedbackProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [feedback, setFeedback] = useState({
    description: '',
    email: '',
    reproductionSteps: '',
    expectedBehavior: '',
    actualBehavior: '',
  });
  const { success, error: showError } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!feedback.description.trim()) {
      showError('请描述遇到的问题');
      return;
    }

    setIsSubmitting(true);

    try {
      const errorFeedback: ErrorFeedback = {
        ...feedback,
        errorDetails: {
          message: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href,
        },
      };

      if (onSubmit) {
        await onSubmit(errorFeedback);
      } else {
        // 默认提交到错误反馈端点
        await fetch('/api/error-feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(errorFeedback),
        });
      }

      setIsSubmitted(true);
      success('感谢您的反馈，我们会尽快处理');

      // 3秒后自动关闭
      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (error) {
      showError('提交反馈失败，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-lg">反馈已提交</CardTitle>
          <CardDescription>
            感谢您的反馈，我们会尽快处理这个问题
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onClose} className="w-full">
            关闭
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">错误反馈</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription>帮助我们改进应用，请描述您遇到的问题</CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 问题描述 */}
          <div className="space-y-2">
            <Label htmlFor="description">问题描述 *</Label>
            <Textarea
              id="description"
              placeholder="请详细描述您遇到的问题..."
              value={feedback.description}
              onChange={e =>
                setFeedback(prev => ({ ...prev, description: e.target.value }))
              }
              className="min-h-[80px]"
              required
            />
          </div>

          {/* 联系邮箱 */}
          <div className="space-y-2">
            <Label htmlFor="email">联系邮箱（可选）</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={feedback.email}
              onChange={e =>
                setFeedback(prev => ({ ...prev, email: e.target.value }))
              }
            />
          </div>

          {/* 重现步骤 */}
          <div className="space-y-2">
            <Label htmlFor="reproductionSteps">重现步骤（可选）</Label>
            <Textarea
              id="reproductionSteps"
              placeholder="1. 点击...&#10;2. 然后...&#10;3. 结果..."
              value={feedback.reproductionSteps}
              onChange={e =>
                setFeedback(prev => ({
                  ...prev,
                  reproductionSteps: e.target.value,
                }))
              }
              className="min-h-[60px]"
            />
          </div>

          {/* 期望行为 */}
          <div className="space-y-2">
            <Label htmlFor="expectedBehavior">期望的行为（可选）</Label>
            <Textarea
              id="expectedBehavior"
              placeholder="您期望应该发生什么..."
              value={feedback.expectedBehavior}
              onChange={e =>
                setFeedback(prev => ({
                  ...prev,
                  expectedBehavior: e.target.value,
                }))
              }
              className="min-h-[60px]"
            />
          </div>

          {/* 实际行为 */}
          <div className="space-y-2">
            <Label htmlFor="actualBehavior">实际的行为（可选）</Label>
            <Textarea
              id="actualBehavior"
              placeholder="实际发生了什么..."
              value={feedback.actualBehavior}
              onChange={e =>
                setFeedback(prev => ({
                  ...prev,
                  actualBehavior: e.target.value,
                }))
              }
              className="min-h-[60px]"
            />
          </div>

          {/* 错误信息预览 */}
          <div className="rounded-md bg-gray-50 p-3">
            <div className="flex items-center space-x-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium text-gray-800">
                错误信息
              </span>
            </div>
            <p className="text-xs text-gray-600 break-all">{error.message}</p>
          </div>

          {/* 提交按钮 */}
          <div className="flex space-x-2">
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? (
                <>
                  <Send className="mr-2 h-4 w-4 animate-pulse" />
                  提交中...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  提交反馈
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              取消
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// 简化版错误反馈组件
export function QuickErrorFeedback({
  error,
  onSubmit,
}: {
  error: Error;
  onSubmit?: (message: string) => Promise<void>;
}) {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { success, error: showError } = useToast();

  const handleSubmit = async () => {
    if (!message.trim()) {
      showError('请输入反馈内容');
      return;
    }

    setIsSubmitting(true);

    try {
      if (onSubmit) {
        await onSubmit(message);
      } else {
        await fetch('/api/error-feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            description: message,
            errorDetails: {
              message: error.message,
              timestamp: new Date().toISOString(),
              userAgent: navigator.userAgent,
              url: window.location.href,
            },
          }),
        });
      }

      success('反馈已提交，感谢您的帮助');
      setMessage('');
    } catch (error) {
      showError('提交失败，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex space-x-2">
      <Input
        placeholder="快速反馈这个问题..."
        value={message}
        onChange={e => setMessage(e.target.value)}
        onKeyPress={e => e.key === 'Enter' && handleSubmit()}
        disabled={isSubmitting}
        className="flex-1"
      />
      <Button
        onClick={handleSubmit}
        disabled={isSubmitting || !message.trim()}
        size="sm"
      >
        {isSubmitting ? (
          <Send className="h-4 w-4 animate-pulse" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
