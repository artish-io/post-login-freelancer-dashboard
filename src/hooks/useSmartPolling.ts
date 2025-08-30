import { useEffect, useRef, useCallback } from 'react';

interface SmartPollingOptions {
  /** Base polling interval in milliseconds when tab is active */
  activeInterval: number;
  /** Polling interval when tab is inactive (default: 5x activeInterval) */
  inactiveInterval?: number;
  /** Polling interval when user is idle (default: 10x activeInterval) */
  idleInterval?: number;
  /** Time in ms to consider user idle (default: 5 minutes) */
  idleThreshold?: number;
  /** Whether to enable smart polling optimizations */
  enabled?: boolean;
}

/**
 * Smart polling hook that automatically adjusts polling frequency based on:
 * - Tab visibility (active/inactive)
 * - User activity (active/idle)
 * - Network conditions
 * 
 * This dramatically reduces server load and improves performance on resource-constrained devices
 */
export function useSmartPolling(
  callback: () => void | Promise<void>,
  options: SmartPollingOptions
) {
  const {
    activeInterval,
    inactiveInterval = activeInterval * 5,
    idleInterval = activeInterval * 10,
    idleThreshold = 5 * 60 * 1000, // 5 minutes
    enabled = true
  } = options;

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const isVisibleRef = useRef<boolean>(true);
  const callbackRef = useRef(callback);

  // Update callback ref when it changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const getCurrentInterval = useCallback(() => {
    if (!enabled) return activeInterval;
    
    const now = Date.now();
    const timeSinceActivity = now - lastActivityRef.current;
    const isIdle = timeSinceActivity > idleThreshold;
    
    if (!isVisibleRef.current) {
      return inactiveInterval;
    } else if (isIdle) {
      return idleInterval;
    } else {
      return activeInterval;
    }
  }, [activeInterval, inactiveInterval, idleInterval, idleThreshold, enabled]);

  const startPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    const poll = async () => {
      try {
        await callbackRef.current();
      } catch (error) {
        console.error('Smart polling callback error:', error);
      }
      
      // Schedule next poll with current interval
      const currentInterval = getCurrentInterval();
      intervalRef.current = setTimeout(poll, currentInterval);
    };

    // Start first poll
    const currentInterval = getCurrentInterval();
    intervalRef.current = setTimeout(poll, currentInterval);
  }, [getCurrentInterval]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Track user activity
  useEffect(() => {
    if (!enabled) return;

    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity);
      });
    };
  }, [enabled]);

  // Track tab visibility
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      isVisibleRef.current = !document.hidden;
      
      if (isVisibleRef.current) {
        // Tab became visible - update activity and restart polling
        lastActivityRef.current = Date.now();
        startPolling();
      } else {
        // Tab became hidden - restart polling with inactive interval
        startPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [enabled, startPolling]);

  // Start/stop polling based on enabled state
  useEffect(() => {
    if (enabled) {
      startPolling();
    } else {
      stopPolling();
    }

    return stopPolling;
  }, [enabled, startPolling, stopPolling]);

  return {
    startPolling,
    stopPolling,
    getCurrentInterval
  };
}

/**
 * Legacy polling hook for components that need simple interval-based polling
 * with basic visibility awareness
 */
export function useVisibilityAwarePolling(
  callback: () => void | Promise<void>,
  interval: number,
  enabled: boolean = true
) {
  return useSmartPolling(callback, {
    activeInterval: interval,
    inactiveInterval: interval * 3, // Reduce frequency when tab not visible
    enabled
  });
}
