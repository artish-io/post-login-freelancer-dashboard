/**
 * Navigation optimization utilities for faster page transitions
 */

import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

/**
 * Optimized navigation with prefetching and instant transitions
 */
export class NavigationOptimizer {
  private static prefetchedRoutes = new Set<string>();

  /**
   * Prefetch a route for instant navigation
   */
  static prefetch(router: AppRouterInstance, route: string) {
    if (!this.prefetchedRoutes.has(route)) {
      router.prefetch(route);
      this.prefetchedRoutes.add(route);
    }
  }

  /**
   * Navigate with optimizations
   */
  static navigate(router: AppRouterInstance, route: string, options?: {
    replace?: boolean;
    scroll?: boolean;
  }) {
    // Prefetch if not already done
    this.prefetch(router, route);

    // Use replace for better performance when appropriate
    if (options?.replace) {
      router.replace(route, { scroll: options.scroll ?? true });
    } else {
      router.push(route, { scroll: options.scroll ?? true });
    }
  }

  /**
   * Batch prefetch common routes for a dashboard
   */
  static prefetchDashboardRoutes(router: AppRouterInstance, userType: 'freelancer' | 'commissioner') {
    const commonRoutes = userType === 'freelancer' ? [
      '/freelancer-dashboard',
      '/freelancer-dashboard/projects-and-invoices',
      '/freelancer-dashboard/projects-and-invoices/proposals',
      '/freelancer-dashboard/projects-and-invoices/invoices',
      '/freelancer-dashboard/projects-and-invoices/project-list',
      '/freelancer-dashboard/notifications',
      '/freelancer-dashboard/messages',
      '/freelancer-dashboard/gigs/explore-gigs',
      '/freelancer-dashboard/gig-requests'
    ] : [
      '/commissioner-dashboard',
      '/commissioner-dashboard/projects-and-invoices',
      '/commissioner-dashboard/projects-and-invoices/project-list',
      '/commissioner-dashboard/projects-and-invoices/invoices',
      '/commissioner-dashboard/projects-and-invoices/recieved-proposals-list',
      '/commissioner-dashboard/projects-and-invoices/tasks-to-review',
      '/commissioner-dashboard/notifications',
      '/commissioner-dashboard/messages',
      '/commissioner-dashboard/discover-talent'
    ];

    // Prefetch routes with a small delay to avoid blocking initial load
    setTimeout(() => {
      commonRoutes.forEach(route => this.prefetch(router, route));
    }, 100);
  }
}

/**
 * Hook for optimized navigation
 */
export function useOptimizedNavigation() {
  return {
    navigate: NavigationOptimizer.navigate,
    prefetch: NavigationOptimizer.prefetch,
    prefetchDashboardRoutes: NavigationOptimizer.prefetchDashboardRoutes
  };
}
