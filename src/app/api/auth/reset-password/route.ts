/**
 * Password reset API endpoint
 */

import { NextRequest } from 'next/server';
import { ResetPasswordRequest } from '@/types/auth';
import {
  createErrorResponse,
  createSuccessResponse,
  validateRequestBody,
} from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const resetRequest = validateRequestBody<ResetPasswordRequest>(body, [
      'email',
    ]);

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resetRequest.email)) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        'Invalid email format',
        400
      );
    }

    // TODO: Implement AWS Cognito password reset
    // This would typically involve calling AWS Cognito's ForgotPassword API

    console.log('Password reset request for:', resetRequest.email);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));

    return createSuccessResponse({
      message: 'Password reset email sent successfully',
      email: resetRequest.email,
    });
  } catch (error) {
    console.error('Password reset error:', error);

    if (
      error instanceof Error &&
      error.message.startsWith('Missing required field:')
    ) {
      return createErrorResponse('VALIDATION_ERROR', error.message, 400);
    }

    return createErrorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
