// src/hooks/useUnreadMessages.ts
import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';

export function useUnreadMessages() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { data: session } = useSession();

  const fetchUnreadCount = useCallback(async () => {
    if (!session?.user?.id) {
      console.log('[useUnreadMessages] No session or user ID available:', { session: !!session, userId: session?.user?.id });
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const endpoint = `/api/dashboard/messages/count?userId=${session.user.id}&t=${Date.now()}`;
      console.log('[useUnreadMessages] Fetching unread count from:', endpoint);
      console.log('[useUnreadMessages] Session info:', { userId: session.user.id, userEmail: session.user.email });

      const res = await fetch(endpoint);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      console.log('[useUnreadMessages] Received data:', data);

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
      console.error('[useUnreadMessages] Error details:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
        name: err instanceof Error ? err.name : undefined
      });

      // Set count to 0 on error to prevent UI issues
      setUnreadCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id]);

  // Initial fetch and polling
  useEffect(() => {
    if (!session?.user?.id) return;

    fetchUnreadCount();

    // More frequent polling (every 3 seconds for real-time feel)
    const interval = setInterval(fetchUnreadCount, 3000);
    return () => clearInterval(interval);
  }, [session?.user?.id]); // Remove fetchUnreadCount from dependencies

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
