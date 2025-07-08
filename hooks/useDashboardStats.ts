import { useState, useEffect } from 'react';

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
  
  const [stats, setStats] = useState<DashboardStats | DashboardStats[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);

      if (useRealTime) {
        // Fetch from API for real-time calculation
        const url = userId 
          ? `/api/dashboard-stats?userId=${userId}`
          : '/api/dashboard-stats';
        
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        setStats(data);
      } else {
        // Fetch from static JSON file
        const response = await fetch('/data/dashboard-stats.json');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data: DashboardStats[] = await response.json();
        
        if (userId) {
          const userStats = data.find(s => s.userId === userId);
          setStats(userStats || null);
        } else {
          setStats(data);
        }
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const updateStats = async () => {
    try {
      const response = await fetch('/api/dashboard-stats', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Dashboard stats updated:', result.message);
      
      // Refresh the current stats
      await fetchStats();
      
      return result;
    } catch (err) {
      console.error('Error updating dashboard stats:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchStats();

    // Set up refresh interval if specified
    if (refreshInterval > 0) {
      const interval = setInterval(fetchStats, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [userId, refreshInterval, useRealTime]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
    updateStats
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
