// User types
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export type UserRole = 'owner' | 'member' | 'viewer';

// Team types
export interface Team {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  subscriptionKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  teamId: string;
  userId: string;
  user: User;
  role: UserRole;
  joinedAt: string;
}

// Event types
export type EventCategory = 'meeting' | 'task' | 'reminder';

export interface CalendarEvent {
  id: string;
  teamId: string;
  title: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  location?: string;
  description?: string;
  category: EventCategory;
  color: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// API types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

// Form types
export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  email: string;
  password: string;
  name: string;
}

export interface CreateTeamFormData {
  name: string;
  description?: string;
}

export interface CreateEventFormData {
  title: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  location?: string;
  description?: string;
  category: EventCategory;
  color: string;
}

// Calendar view types
export type CalendarView = 'month' | 'week' | 'list';

// Error types
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
