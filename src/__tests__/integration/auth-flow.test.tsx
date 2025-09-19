/**
 * Integration tests for authentication flow
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../test-utils';
import LoginPage from '@/app/auth/login/page';
import RegisterPage from '@/app/auth/register/page';
import ForgotPasswordPage from '@/app/auth/forgot-password/page';

// Mock NextAuth
jest.mock('next-auth/react', () => ({
  signIn: jest.fn(),
  signOut: jest.fn(),
  useSession: jest.fn(() => ({
    data: null,
    status: 'unauthenticated',
  })),
  getSession: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

describe('Authentication Flow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  describe('User Registration Flow', () => {
    it('completes full registration process', async () => {
      const user = userEvent.setup();

      // Mock successful registration API call
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: '注册成功，请检查邮箱进行验证',
        }),
      });

      render(<RegisterPage />);

      // Fill registration form
      await user.type(screen.getByLabelText(/姓名/), 'Test User');
      await user.type(screen.getByLabelText(/邮箱/), 'test@example.com');
      await user.type(screen.getByLabelText(/密码/), 'SecurePassword123!');
      await user.type(screen.getByLabelText(/确认密码/), 'SecurePassword123!');

      // Submit form
      await user.click(screen.getByRole('button', { name: /注册/ }));

      // Verify API call
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Test User',
            email: 'test@example.com',
            password: 'SecurePassword123!',
          }),
        });
      });

      // Verify success message
      expect(
        screen.getByText('注册成功，请检查邮箱进行验证')
      ).toBeInTheDocument();
    });

    it('handles registration validation errors', async () => {
      const user = userEvent.setup();

      // Mock validation error response
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '邮箱格式不正确',
            details: { email: '邮箱格式不正确' },
          },
        }),
      });

      render(<RegisterPage />);

      // Fill form with invalid email
      await user.type(screen.getByLabelText(/姓名/), 'Test User');
      await user.type(screen.getByLabelText(/邮箱/), 'invalid-email');
      await user.type(screen.getByLabelText(/密码/), 'SecurePassword123!');
      await user.type(screen.getByLabelText(/确认密码/), 'SecurePassword123!');

      await user.click(screen.getByRole('button', { name: /注册/ }));

      // Verify error message
      await waitFor(() => {
        expect(screen.getByText('邮箱格式不正确')).toBeInTheDocument();
      });
    });

    it('validates password confirmation', async () => {
      const user = userEvent.setup();

      render(<RegisterPage />);

      // Fill form with mismatched passwords
      await user.type(screen.getByLabelText(/姓名/), 'Test User');
      await user.type(screen.getByLabelText(/邮箱/), 'test@example.com');
      await user.type(screen.getByLabelText(/密码/), 'SecurePassword123!');
      await user.type(
        screen.getByLabelText(/确认密码/),
        'DifferentPassword123!'
      );

      await user.click(screen.getByRole('button', { name: /注册/ }));

      // Verify client-side validation
      expect(screen.getByText('密码不匹配')).toBeInTheDocument();
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe('User Login Flow', () => {
    it('completes successful login process', async () => {
      const user = userEvent.setup();
      const { signIn } = require('next-auth/react');

      // Mock successful sign in
      signIn.mockResolvedValueOnce({
        ok: true,
        error: null,
        url: '/dashboard',
      });

      render(<LoginPage />);

      // Fill login form
      await user.type(screen.getByLabelText(/邮箱/), 'test@example.com');
      await user.type(screen.getByLabelText(/密码/), 'SecurePassword123!');

      // Submit form
      await user.click(screen.getByRole('button', { name: /登录/ }));

      // Verify NextAuth signIn was called
      await waitFor(() => {
        expect(signIn).toHaveBeenCalledWith('credentials', {
          email: 'test@example.com',
          password: 'SecurePassword123!',
          redirect: false,
        });
      });
    });

    it('handles login authentication errors', async () => {
      const user = userEvent.setup();
      const { signIn } = require('next-auth/react');

      // Mock failed sign in
      signIn.mockResolvedValueOnce({
        ok: false,
        error: 'CredentialsSignin',
      });

      render(<LoginPage />);

      // Fill login form
      await user.type(screen.getByLabelText(/邮箱/), 'test@example.com');
      await user.type(screen.getByLabelText(/密码/), 'WrongPassword');

      await user.click(screen.getByRole('button', { name: /登录/ }));

      // Verify error message
      await waitFor(() => {
        expect(screen.getByText('邮箱或密码错误')).toBeInTheDocument();
      });
    });

    it('navigates to registration page', async () => {
      const user = userEvent.setup();

      render(<LoginPage />);

      const registerLink = screen.getByText('立即注册');
      expect(registerLink).toHaveAttribute('href', '/auth/register');
    });

    it('navigates to forgot password page', async () => {
      const user = userEvent.setup();

      render(<LoginPage />);

      const forgotPasswordLink = screen.getByText('忘记密码？');
      expect(forgotPasswordLink).toHaveAttribute(
        'href',
        '/auth/forgot-password'
      );
    });
  });

  describe('Password Reset Flow', () => {
    it('completes password reset request', async () => {
      const user = userEvent.setup();

      // Mock successful password reset API call
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: '密码重置邮件已发送',
        }),
      });

      render(<ForgotPasswordPage />);

      // Fill email field
      await user.type(screen.getByLabelText(/邮箱/), 'test@example.com');

      // Submit form
      await user.click(screen.getByRole('button', { name: /发送重置邮件/ }));

      // Verify API call
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'test@example.com',
          }),
        });
      });

      // Verify success message
      expect(screen.getByText('密码重置邮件已发送')).toBeInTheDocument();
    });

    it('handles invalid email for password reset', async () => {
      const user = userEvent.setup();

      // Mock error response
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '邮箱格式不正确',
          },
        }),
      });

      render(<ForgotPasswordPage />);

      // Fill invalid email
      await user.type(screen.getByLabelText(/邮箱/), 'invalid-email');
      await user.click(screen.getByRole('button', { name: /发送重置邮件/ }));

      // Verify error message
      await waitFor(() => {
        expect(screen.getByText('邮箱格式不正确')).toBeInTheDocument();
      });
    });

    it('navigates back to login page', async () => {
      render(<ForgotPasswordPage />);

      const backToLoginLink = screen.getByText('返回登录');
      expect(backToLoginLink).toHaveAttribute('href', '/auth/login');
    });
  });

  describe('Authentication State Management', () => {
    it('redirects authenticated users from auth pages', async () => {
      const { useSession } = require('next-auth/react');

      // Mock authenticated session
      useSession.mockReturnValue({
        data: {
          user: { id: '1', email: 'test@example.com', name: 'Test User' },
        },
        status: 'authenticated',
      });

      const mockPush = jest.fn();
      jest.doMock('next/navigation', () => ({
        useRouter: () => ({ push: mockPush }),
      }));

      render(<LoginPage />);

      // Should redirect to dashboard
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('shows loading state during authentication check', () => {
      const { useSession } = require('next-auth/react');

      // Mock loading session
      useSession.mockReturnValue({
        data: null,
        status: 'loading',
      });

      render(<LoginPage />);

      expect(screen.getByText('加载中...')).toBeInTheDocument();
    });
  });
});
