/**
 * Hook for handling swipe gestures on touch devices
 */

import { useRef, useCallback, useEffect } from 'react';

interface SwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number; // Minimum distance for a swipe
  preventScroll?: boolean; // Prevent default scroll behavior
}

interface TouchPosition {
  x: number;
  y: number;
}

export function useSwipeGesture(options: SwipeGestureOptions) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = 50,
    preventScroll = false,
  } = options;

  const touchStartRef = useRef<TouchPosition | null>(null);
  const touchEndRef = useRef<TouchPosition | null>(null);
  const elementRef = useRef<HTMLElement | null>(null);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (preventScroll) {
        e.preventDefault();
      }

      const touch = e.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
      };
      touchEndRef.current = null;
    },
    [preventScroll]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (preventScroll) {
        e.preventDefault();
      }

      const touch = e.touches[0];
      touchEndRef.current = {
        x: touch.clientX,
        y: touch.clientY,
      };
    },
    [preventScroll]
  );

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (!touchStartRef.current || !touchEndRef.current) {
        return;
      }

      const deltaX = touchEndRef.current.x - touchStartRef.current.x;
      const deltaY = touchEndRef.current.y - touchStartRef.current.y;

      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      // Determine if this is a horizontal or vertical swipe
      if (absDeltaX > absDeltaY) {
        // Horizontal swipe
        if (absDeltaX > threshold) {
          if (deltaX > 0) {
            onSwipeRight?.();
          } else {
            onSwipeLeft?.();
          }
        }
      } else {
        // Vertical swipe
        if (absDeltaY > threshold) {
          if (deltaY > 0) {
            onSwipeDown?.();
          } else {
            onSwipeUp?.();
          }
        }
      }

      // Reset touch positions
      touchStartRef.current = null;
      touchEndRef.current = null;
    },
    [threshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]
  );

  const attachListeners = useCallback(
    (element: HTMLElement) => {
      if (!element) return;

      elementRef.current = element;

      element.addEventListener('touchstart', handleTouchStart, {
        passive: !preventScroll,
      });
      element.addEventListener('touchmove', handleTouchMove, {
        passive: !preventScroll,
      });
      element.addEventListener('touchend', handleTouchEnd, { passive: true });
    },
    [handleTouchStart, handleTouchMove, handleTouchEnd, preventScroll]
  );

  const detachListeners = useCallback(() => {
    const element = elementRef.current;
    if (!element) return;

    element.removeEventListener('touchstart', handleTouchStart);
    element.removeEventListener('touchmove', handleTouchMove);
    element.removeEventListener('touchend', handleTouchEnd);

    elementRef.current = null;
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      detachListeners();
    };
  }, [detachListeners]);

  return {
    attachListeners,
    detachListeners,
    ref: elementRef,
  };
}

/**
 * Hook specifically for calendar navigation swipes
 */
export function useCalendarSwipe(options: {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}) {
  return useSwipeGesture({
    onSwipeLeft: options.onSwipeLeft,
    onSwipeRight: options.onSwipeRight,
    threshold: 80, // Larger threshold for calendar navigation
    preventScroll: false, // Allow vertical scrolling
  });
}
