/**
 * User registration API endpoint
 */

import { NextRequest } from 'next/server';
import { RegisterCredentials } from '@/types/auth';
import {
  createErrorResponse,
  createSuccessResponse,
  validateRequestBody,
} from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const credentials = validateRequestBody<RegisterCredentials>(body, [
      'email',
      'password',
      'name',
    ]);

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(credentials.email)) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        'Invalid email format',
        400
      );
    }

    // Password validation
    if (credentials.password.length < 8) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        'Password must be at least 8 characters',
        400
      );
    }

    // Name validation
    if (credentials.name.trim().length < 2) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        'Name must be at least 2 characters',
        400
      );
    }

    // TODO: Implement AWS Cognito user registration
    // This would typically involve calling AWS Cognito's AdminCreateUser API
    // For now, we'll simulate the registration process

    console.log('User registration attempt:', {
      email: credentials.email,
      name: credentials.name,
    });

    // Simulate registration delay
    await new Promise(resolve => setTimeout(resolve, 500));

    return createSuccessResponse({
      message: 'User registered successfully',
      user: {
        email: credentials.email,
        name: credentials.name,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);

    if (
      error instanceof Error &&
      error.message.startsWith('Missing required field:')
    ) {
      return createErrorResponse('VALIDATION_ERROR', error.message, 400);
    }

    return createErrorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
