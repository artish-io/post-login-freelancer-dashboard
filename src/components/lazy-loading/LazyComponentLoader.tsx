'use client';

import { lazy, Suspense, ComponentType, ReactNode } from 'react';
import { Skeleton } from '../../../components/ui/loading-skeleton';

/**
 * Lazy Component Loader
 * 
 * Provides utilities for lazy loading components with proper loading states
 * and error boundaries to improve initial bundle size and performance.
 */

interface LazyLoadOptions {
  /** Custom loading component */
  fallback?: ReactNode;
  /** Error boundary component */
  errorBoundary?: ComponentType<{ error: Error; retry: () => void }>;
  /** Whether to preload the component on hover */
  preloadOnHover?: boolean;
  /** Whether to preload the component when it enters viewport */
  preloadOnVisible?: boolean;
}

/**
 * Higher-order component for lazy loading
 */
export function withLazyLoading<P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  options: LazyLoadOptions = {}
) {
  const {
    fallback = <Skeleton height={200} />,
    preloadOnHover = false,
    preloadOnVisible = false
  } = options;

  const LazyComponent = lazy(importFn);

  return function LazyLoadedComponent(props: P) {
    return (
      <Suspense fallback={fallback}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

/**
 * Lazy load dashboard components
 */
export const LazyDashboardComponents = {
  // Charts
  RevenueChart: withLazyLoading(
    () => import('../../../components/shared/storefront/revenue-line-chart'),
    { fallback: <Skeleton height={300} /> }
  ),
  
  SalesChart: withLazyLoading(
    () => import('../../../components/shared/storefront/sales-sources-pie-chart'),
    { fallback: <Skeleton height={160} width={160} rounded /> }
  ),

  // Heavy UI components
  MessageThread: withLazyLoading(
    () => import('../../../components/freelancer-dashboard/message-thread'),
    { fallback: <Skeleton height={400} /> }
  ),

  NotificationsList: withLazyLoading(
    () => import('../../../components/notifications/notifications-list'),
    { fallback: <Skeleton height={300} /> }
  ),

  // Admin components
  SystemHealthDashboard: withLazyLoading(
    () => import('../../../components/admin/system-health-dashboard'),
    { fallback: <Skeleton height={500} /> }
  ),

  // Storefront components
  ProductGrid: withLazyLoading(
    () => import('../../../components/storefront/product-grid'),
    { fallback: <Skeleton height={400} /> }
  )
};

/**
 * Intersection Observer based lazy loading
 */
interface LazyOnVisibleProps {
  children: ReactNode;
  fallback?: ReactNode;
  rootMargin?: string;
  threshold?: number;
  once?: boolean;
}

export function LazyOnVisible({
  children,
  fallback = <Skeleton height={200} />,
  rootMargin = '50px',
  threshold = 0.1,
  once = true
}: LazyOnVisibleProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          setHasBeenVisible(true);
          
          if (once) {
            observer.disconnect();
          }
        } else if (!once) {
          setIsVisible(false);
        }
      },
      {
        rootMargin,
        threshold
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [rootMargin, threshold, once]);

  const shouldRender = once ? hasBeenVisible : isVisible;

  return (
    <div ref={ref}>
      {shouldRender ? children : fallback}
    </div>
  );
}

/**
 * Route-based code splitting
 */
export const LazyRoutes = {
  // Dashboard routes
  FreelancerDashboard: withLazyLoading(
    () => import('../../../src/app/freelancer-dashboard/page'),
    { fallback: <div className="min-h-screen bg-gray-50" /> }
  ),

  CommissionerDashboard: withLazyLoading(
    () => import('../../../src/app/commissioner-dashboard/page'),
    { fallback: <div className="min-h-screen bg-gray-50" /> }
  ),

  AdminDashboard: withLazyLoading(
    () => import('../../../src/app/admin-dashboard/page'),
    { fallback: <div className="min-h-screen bg-gray-50" /> }
  ),

  // Feature routes
  Messages: withLazyLoading(
    () => import('../../../src/app/freelancer-dashboard/messages/page'),
    { fallback: <Skeleton height={600} /> }
  ),

  Projects: withLazyLoading(
    () => import('../../../src/app/freelancer-dashboard/projects-and-invoices/page'),
    { fallback: <Skeleton height={600} /> }
  ),

  Storefront: withLazyLoading(
    () => import('../../../src/app/artish-storefront/page'),
    { fallback: <Skeleton height={600} /> }
  )
};

/**
 * Preload utilities
 */
export const PreloadManager = {
  preloadedComponents: new Set<string>(),

  async preload(importFn: () => Promise<any>, key: string) {
    if (this.preloadedComponents.has(key)) {
      return;
    }

    try {
      await importFn();
      this.preloadedComponents.add(key);
      console.log(`✅ Preloaded component: ${key}`);
    } catch (error) {
      console.error(`❌ Failed to preload component: ${key}`, error);
    }
  },

  preloadDashboard(userType: 'freelancer' | 'commissioner' | 'admin') {
    const preloadMap = {
      freelancer: [
        () => import('../../../src/app/freelancer-dashboard/page'),
        () => import('../../../components/freelancer-dashboard/message-thread'),
        () => import('../../../components/shared/storefront/revenue-line-chart')
      ],
      commissioner: [
        () => import('../../../src/app/commissioner-dashboard/page'),
        () => import('../../../components/commissioner-dashboard/payment/spending-chart'),
        () => import('../../../components/notifications/notifications-list')
      ],
      admin: [
        () => import('../../../src/app/admin-dashboard/page'),
        () => import('../../../components/admin/system-health-dashboard')
      ]
    };

    const componentsToPreload = preloadMap[userType] || [];
    
    componentsToPreload.forEach((importFn, index) => {
      this.preload(importFn, `${userType}-${index}`);
    });
  },

  preloadOnIdle() {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        // Preload common components during idle time
        this.preload(
          () => import('../../../components/shared/storefront/revenue-line-chart'),
          'revenue-chart'
        );
        this.preload(
          () => import('../../../components/notifications/notifications-list'),
          'notifications'
        );
      });
    }
  }
};

/**
 * Hook for lazy loading with preload capabilities
 */
import { useState, useEffect, useRef } from 'react';

export function useLazyLoad<T>(
  importFn: () => Promise<{ default: T }>,
  options: {
    preloadOnHover?: boolean;
    preloadOnVisible?: boolean;
    enabled?: boolean;
  } = {}
) {
  const { preloadOnHover = false, preloadOnVisible = false, enabled = true } = options;
  const [Component, setComponent] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const hasPreloaded = useRef(false);

  const load = async () => {
    if (!enabled || Component || loading || hasPreloaded.current) return;

    setLoading(true);
    setError(null);

    try {
      const module = await importFn();
      setComponent(module.default);
      hasPreloaded.current = true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load component'));
    } finally {
      setLoading(false);
    }
  };

  const preload = () => {
    if (!hasPreloaded.current) {
      load();
    }
  };

  return {
    Component,
    loading,
    error,
    load,
    preload,
    isLoaded: !!Component
  };
}
