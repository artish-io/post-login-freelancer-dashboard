import { useState, useEffect } from 'react';
import { useRequestCache } from '../src/hooks/useRequestCache';

export interface DashboardStats {
  userId: string;
  tasksToday: number;
  ongoingProjects: number;
  upcomingDeadlines: number;
  completedTasksThisWeek: number;
  totalActiveTasks: number;
}

interface UseDashboardStatsOptions {
  userId?: string;
  refreshInterval?: number; // in milliseconds
  useRealTime?: boolean; // if true, uses API; if false, uses static JSON
}

export function useDashboardStats(options: UseDashboardStatsOptions = {}) {
  const { userId, refreshInterval = 30000, useRealTime = true } = options;

  // Create cache key based on options
  const cacheKey = `dashboard-stats-${userId || 'all'}-${useRealTime}`;

  // Use request cache with 2-minute TTL for dashboard stats
  const { data: stats, error, loading, refresh } = useRequestCache(
    cacheKey,
    async () => {
      if (useRealTime) {
        // Fetch from API for real-time calculation
        const url = userId
          ? `/api/dashboard-stats?userId=${userId}`
          : '/api/dashboard-stats';

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
      } else {
        // Fetch from API endpoint
        const response = await fetch('/api/dashboard-stats');

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: DashboardStats[] = await response.json();

        if (userId) {
          const userStats = data.find(s => s.userId === userId);
          return userStats || null;
        } else {
          return data;
        }
      }
    },
    {
      ttl: 2 * 60 * 1000, // 2 minutes cache
      staleWhileRevalidate: true
    }
  );

  // Auto-refresh based on refreshInterval
  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(refresh, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refresh, refreshInterval]);

  return {
    stats,
    loading,
    error: error?.message || null,
    refetch: refresh
  };
}

// Utility hook for a specific user
export function useUserDashboardStats(userId: string, options: Omit<UseDashboardStatsOptions, 'userId'> = {}) {
  return useDashboardStats({ ...options, userId });
}

// Utility hook for all users
export function useAllDashboardStats(options: Omit<UseDashboardStatsOptions, 'userId'> = {}) {
  return useDashboardStats(options);
}
