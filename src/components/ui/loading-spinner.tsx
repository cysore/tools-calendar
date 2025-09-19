'use client';

import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
}

export function LoadingSpinner({
  size = 'md',
  className = '',
  text,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div
        className={`animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 ${sizeClasses[size]}`}
      />
      {text && <p className="mt-2 text-sm text-gray-600">{text}</p>}
    </div>
  );
}

// 页面级加载组件
export function PageLoader({ text = '加载中...' }: { text?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <LoadingSpinner size="lg" text={text} />
    </div>
  );
}

// 内联加载组件
export function InlineLoader({ text }: { text?: string }) {
  return (
    <div className="flex items-center justify-center py-4">
      <LoadingSpinner size="sm" text={text} />
    </div>
  );
}

// 覆盖层加载组件
export function OverlayLoader({ text = '处理中...' }: { text?: string }) {
  return (
    <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
      <LoadingSpinner size="lg" text={text} />
    </div>
  );
}
