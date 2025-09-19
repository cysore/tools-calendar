'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
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
import { FormError, FormSuccess } from '@/components/auth/FormError';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const { resetPassword, status } = useAuth();
  const router = useRouter();

  // Redirect if already authenticated
  if (status === 'authenticated') {
    router.push('/dashboard');
    return null;
  }

  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email.trim()) {
      setError('请输入邮箱地址');
      return;
    }

    if (!validateEmail(email)) {
      setError('请输入有效的邮箱地址');
      return;
    }

    setIsLoading(true);

    try {
      await resetPassword({ email });
      setSuccess('密码重置邮件已发送，请检查您的邮箱');
    } catch (err) {
      setError(err instanceof Error ? err.message : '发送重置邮件失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    // Clear messages when user starts typing
    if (error) setError('');
    if (success) setSuccess('');
  };

  const isFormValid = email.trim();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">重置密码</CardTitle>
          <CardDescription className="text-center">
            输入您的邮箱地址，我们将发送重置密码的链接
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormError error={error} />
            <FormSuccess message={success} />

            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={handleEmailChange}
                required
                disabled={isLoading}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={!isFormValid || isLoading}
            >
              {isLoading ? '发送中...' : '发送重置邮件'}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <Link
              href="/auth/login"
              className="text-sm text-primary hover:underline"
            >
              返回登录
            </Link>
            <div className="text-sm text-muted-foreground">
              还没有账户？{' '}
              <Link
                href="/auth/register"
                className="text-primary hover:underline"
              >
                立即注册
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
