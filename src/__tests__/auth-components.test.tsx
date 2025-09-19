/**
 * Tests for authentication UI components
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useAuth } from '@/hooks/useAuth';
import { FormError, FormSuccess } from '@/components/auth/FormError';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { LoadingSpinner, LoadingPage } from '@/components/ui/loading-spinner';

// Mock the useAuth hook
jest.mock('@/hooks/useAuth');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

describe('FormError', () => {
  it('renders error message when error is provided', () => {
    render(<FormError error="Test error message" />);
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('does not render when error is null', () => {
    const { container } = render(<FormError error={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('does not render when error is empty string', () => {
    const { container } = render(<FormError error="" />);
    expect(container.firstChild).toBeNull();
  });
});

describe('FormSuccess', () => {
  it('renders success message when message is provided', () => {
    render(<FormSuccess message="Success message" />);
    expect(screen.getByText('Success message')).toBeInTheDocument();
  });

  it('does not render when message is null', () => {
    const { container } = render(<FormSuccess message={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('does not render when message is empty string', () => {
    const { container } = render(<FormSuccess message="" />);
    expect(container.firstChild).toBeNull();
  });
});

describe('LoadingSpinner', () => {
  it('renders with default size', () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('h-8', 'w-8');
  });

  it('renders with small size', () => {
    const { container } = render(<LoadingSpinner size="sm" />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toHaveClass('h-4', 'w-4');
  });

  it('renders with large size', () => {
    const { container } = render(<LoadingSpinner size="lg" />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toHaveClass('h-12', 'w-12');
  });
});

describe('LoadingPage', () => {
  it('renders with default message', () => {
    render(<LoadingPage />);
    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });

  it('renders with custom message', () => {
    render(<LoadingPage message="Custom loading message" />);
    expect(screen.getByText('Custom loading message')).toBeInTheDocument();
  });
});

describe('ProtectedRoute', () => {
  const TestComponent = () => <div>Protected Content</div>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state when status is loading', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      status: 'loading',
      login: jest.fn(),
      logout: jest.fn(),
      register: jest.fn(),
      resetPassword: jest.fn(),
    });

    const { container } = render(
      <ProtectedRoute>
        <TestComponent />
      </ProtectedRoute>
    );

    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders children when user is authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
      },
      session: null,
      status: 'authenticated',
      login: jest.fn(),
      logout: jest.fn(),
      register: jest.fn(),
      resetPassword: jest.fn(),
    });

    render(
      <ProtectedRoute>
        <TestComponent />
      </ProtectedRoute>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('does not render children when user is unauthenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      status: 'unauthenticated',
      login: jest.fn(),
      logout: jest.fn(),
      register: jest.fn(),
      resetPassword: jest.fn(),
    });

    const { container } = render(
      <ProtectedRoute>
        <TestComponent />
      </ProtectedRoute>
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(container.firstChild).toBeNull();
  });

  it('renders access denied when user lacks required role', () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'member',
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
      },
      session: null,
      status: 'authenticated',
      login: jest.fn(),
      logout: jest.fn(),
      register: jest.fn(),
      resetPassword: jest.fn(),
    });

    render(
      <ProtectedRoute requiredRole="owner">
        <TestComponent />
      </ProtectedRoute>
    );

    expect(screen.getByText('访问被拒绝')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });
});
