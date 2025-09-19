import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { ToastProvider } from '@/components/ui/toast';

// Mock providers for testing
const MockTeamProvider = ({ children }: { children: React.ReactNode }) => {
  return <div data-testid="mock-team-provider">{children}</div>;
};

const MockAuthProvider = ({ children }: { children: React.ReactNode }) => {
  return <div data-testid="mock-auth-provider">{children}</div>;
};

// Test wrapper with all required providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <MockAuthProvider>
      <MockTeamProvider>
        <ToastProvider>{children}</ToastProvider>
      </MockTeamProvider>
    </MockAuthProvider>
  );
};

// Custom render function with providers
const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };

// Mock data for tests
export const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

export const mockTeam = {
  id: 'team-1',
  name: 'Test Team',
  description: 'Test Description',
  ownerId: 'user-1',
  subscriptionKey: 'sub-key',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

export const mockEvent = {
  id: 'event-1',
  teamId: 'team-1',
  title: 'Test Event',
  startTime: '2024-01-15T10:00:00Z',
  endTime: '2024-01-15T11:00:00Z',
  isAllDay: false,
  location: 'Test Location',
  description: 'Test Description',
  category: 'meeting' as const,
  color: '#3B82F6',
  createdBy: 'user-1',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};
