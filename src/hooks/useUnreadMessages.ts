// src/hooks/useUnreadMessages.ts
import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useSmartPolling } from './useSmartPolling';

export function useUnreadMessages() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { data: session } = useSession();

  const fetchUnreadCount = useCallback(async () => {
    if (!session?.user?.id) {
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(
        `/api/dashboard/messages/count?userId=${session.user.id}&t=${Date.now()}`
      );

      if (!res.ok) {
        console.warn(`Messages count API returned ${res.status}: ${res.statusText}`);
        setUnreadCount(0); // Set to 0 instead of leaving undefined
        setIsLoading(false);
        return;
      }

      const data = await res.json();
      
      if (typeof data.unreadCount === "number") {
        const newCount = data.unreadCount;
        
        // Only update if count actually changed to avoid unnecessary re-renders
        setUnreadCount(prevCount => {
          if (prevCount !== newCount) {
            console.log(`📧 Unread count updated: ${prevCount} → ${newCount}`);
            
            // Dispatch custom event for other components
            window.dispatchEvent(new CustomEvent('unreadCountChanged', {
              detail: { count: newCount, previousCount: prevCount }
            }));
            
            return newCount;
          }
          return prevCount;
        });
      }
    } catch (err) {
      console.error("[useUnreadMessages] Failed to fetch unread count:", err);
      setUnreadCount(0); // Set to 0 on error
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id]);

  // Initial fetch
  useEffect(() => {
    if (!session?.user?.id) return;
    fetchUnreadCount();
  }, [session?.user?.id, fetchUnreadCount]);

  // Smart polling for unread count - much less aggressive than before
  useSmartPolling(
    fetchUnreadCount,
    {
      activeInterval: 30000,    // 30 seconds when active (was 3 seconds)
      inactiveInterval: 120000, // 2 minutes when tab inactive
      idleInterval: 600000,     // 10 minutes when user idle
      enabled: !!session?.user?.id
    }
  );

  // Listen for manual refresh events
  useEffect(() => {
    const handleRefresh = () => {
      console.log('📧 Manual unread count refresh triggered');
      fetchUnreadCount();
    };

    const handleMessageSent = () => {
      console.log('📧 Message sent, refreshing unread count');
      fetchUnreadCount();
    };

    const handleVisibilityChange = () => {
      // Refresh when user comes back to the tab
      if (!document.hidden) {
        console.log('📧 Tab became visible, refreshing unread count');
        fetchUnreadCount();
      }
    };

    const handleRouteChange = () => {
      // Refresh when user navigates (especially useful when leaving/entering messages page)
      console.log('📧 Route change detected, refreshing unread count');
      setTimeout(fetchUnreadCount, 500); // Small delay to ensure any mark-as-read operations complete
    };

    // Listen for custom events from other components
    window.addEventListener('refreshUnreadCount', handleRefresh);
    window.addEventListener('messageSent', handleMessageSent);
    window.addEventListener('popstate', handleRouteChange); // Browser back/forward
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('refreshUnreadCount', handleRefresh);
      window.removeEventListener('messageSent', handleMessageSent);
      window.removeEventListener('popstate', handleRouteChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []); // Remove fetchUnreadCount dependency to prevent infinite re-renders

  // Manual refresh function for components to call
  const refreshCount = useCallback(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  // Function to manually update count (for optimistic updates)
  const updateCount = useCallback((newCount: number) => {
    setUnreadCount(newCount);
    window.dispatchEvent(new CustomEvent('unreadCountChanged', {
      detail: { count: newCount, previousCount: unreadCount }
    }));
  }, [unreadCount]);

  // Function to decrement count (when a message is read)
  const decrementCount = useCallback(() => {
    setUnreadCount(prevCount => {
      const newCount = Math.max(0, prevCount - 1);
      window.dispatchEvent(new CustomEvent('unreadCountChanged', {
        detail: { count: newCount, previousCount: prevCount }
      }));
      return newCount;
    });
  }, []);

  return {
    unreadCount,
    isLoading,
    refreshCount,
    updateCount,
    decrementCount
  };
}
