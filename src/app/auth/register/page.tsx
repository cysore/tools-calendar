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
import { FormError } from '@/components/auth/FormError';
import { RegisterCredentials } from '@/types/auth';

export default function RegisterPage() {
  const [credentials, setCredentials] = useState<RegisterCredentials>({
    email: '',
    password: '',
    name: '',
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const { register, status } = useAuth();
  const router = useRouter();

  // Redirect if already authenticated
  if (status === 'authenticated') {
    router.push('/dashboard');
    return null;
  }

  const validateForm = (): string | null => {
    if (!credentials.name.trim()) {
      return '请输入您的姓名';
    }
    if (!credentials.email.trim()) {
      return '请输入邮箱地址';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(credentials.email)) {
      return '请输入有效的邮箱地址';
    }
    if (credentials.password.length < 8) {
      return '密码至少需要8个字符';
    }
    if (credentials.password !== confirmPassword) {
      return '两次输入的密码不一致';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);

    try {
      await register(credentials);
      // Navigation is handled in the register function after successful login
    } catch (err) {
      setError(err instanceof Error ? err.message : '注册失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange =
    (field: keyof RegisterCredentials) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setCredentials(prev => ({
        ...prev,
        [field]: e.target.value,
      }));
      // Clear error when user starts typing
      if (error) setError('');
    };

  const handleConfirmPasswordChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setConfirmPassword(e.target.value);
    if (error) setError('');
  };

  const isFormValid =
    credentials.name.trim() &&
    credentials.email.trim() &&
    credentials.password &&
    confirmPassword;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">注册</CardTitle>
          <CardDescription className="text-center">
            创建您的账户来开始使用团队日历
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormError error={error} />

            <div className="space-y-2">
              <Label htmlFor="name">姓名</Label>
              <Input
                id="name"
                type="text"
                placeholder="输入您的姓名"
                value={credentials.name}
                onChange={handleInputChange('name')}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={credentials.email}
                onChange={handleInputChange('email')}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                placeholder="至少8个字符"
                value={credentials.password}
                onChange={handleInputChange('password')}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">确认密码</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="再次输入密码"
                value={confirmPassword}
                onChange={handleConfirmPasswordChange}
                required
                disabled={isLoading}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={!isFormValid || isLoading}
            >
              {isLoading ? '注册中...' : '注册'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <div className="text-sm text-muted-foreground">
              已有账户？{' '}
              <Link href="/auth/login" className="text-primary hover:underline">
                立即登录
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
