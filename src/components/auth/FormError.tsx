/**
 * Form Error component for displaying validation and API errors
 */

'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface FormErrorProps {
  error: string | null;
  className?: string;
}

export function FormError({ error, className }: FormErrorProps) {
  if (!error) return null;

  return (
    <Alert variant="destructive" className={className}>
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  );
}

interface FormSuccessProps {
  message: string | null;
  className?: string;
}

export function FormSuccess({ message, className }: FormSuccessProps) {
  if (!message) return null;

  return (
    <Alert className={className}>
      <AlertDescription className="text-green-700">{message}</AlertDescription>
    </Alert>
  );
}
