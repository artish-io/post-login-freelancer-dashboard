'use client';

import { lazy, Suspense, ComponentType } from 'react';
import { Skeleton } from './loading-skeleton';

// Lazy load framer-motion components to reduce initial bundle size
export const LazyMotion = lazy(() => 
  import('framer-motion').then(module => ({ default: module.motion.div }))
);

export const LazyAnimatePresence = lazy(() => 
  import('framer-motion').then(module => ({ default: module.AnimatePresence }))
);

// Wrapper component for lazy-loaded motion components
type LazyMotionWrapperProps = {
  children: React.ReactNode;
  className?: string;
  initial?: any;
  animate?: any;
  exit?: any;
  transition?: any;
  layout?: boolean;
  layoutId?: string;
  whileHover?: any;
  whileTap?: any;
  variants?: any;
  [key: string]: any;
};

export function LazyMotionWrapper({ 
  children, 
  className,
  initial,
  animate,
  exit,
  transition,
  layout,
  layoutId,
  whileHover,
  whileTap,
  variants,
  ...props 
}: LazyMotionWrapperProps) {
  return (
    <Suspense fallback={<Skeleton className={className} height={40} />}>
      <LazyMotion
        className={className}
        initial={initial}
        animate={animate}
        exit={exit}
        transition={transition}
        layout={layout}
        layoutId={layoutId}
        whileHover={whileHover}
        whileTap={whileTap}
        variants={variants}
        {...props}
      >
        {children}
      </LazyMotion>
    </Suspense>
  );
}

// Lazy load chart components
export const LazyLineChart = lazy(() => 
  import('recharts').then(module => ({ default: module.LineChart }))
);

export const LazyDoughnutChart = lazy(() => 
  import('react-chartjs-2').then(module => ({ default: module.Doughnut }))
);

// Chart wrapper with loading state
type LazyChartWrapperProps = {
  type: 'line' | 'doughnut';
  data: any;
  options?: any;
  width?: string | number;
  height?: string | number;
  className?: string;
  [key: string]: any;
};

export function LazyChartWrapper({ 
  type, 
  data, 
  options, 
  width = '100%', 
  height = 300,
  className,
  ...props 
}: LazyChartWrapperProps) {
  const fallback = (
    <div className={`flex items-center justify-center ${className}`} style={{ width, height }}>
      <Skeleton width={width} height={height} />
    </div>
  );

  if (type === 'line') {
    return (
      <Suspense fallback={fallback}>
        <LazyLineChart data={data} {...props} />
      </Suspense>
    );
  }

  if (type === 'doughnut') {
    return (
      <Suspense fallback={fallback}>
        <LazyDoughnutChart data={data} options={options} {...props} />
      </Suspense>
    );
  }

  return fallback;
}

// Lazy load Firebase auth components
export const LazyFirebaseAuth = lazy(() => 
  import('../freelancer-dashboard/settings/edit-payment/phone-verification-modal').then(module => ({ 
    default: module.default 
  }))
);

// Higher-order component for lazy loading any component
export function withLazyLoading<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback?: React.ReactNode
) {
  const LazyComponent = lazy(importFn);
  
  return function LazyLoadedComponent(props: React.ComponentProps<T>) {
    return (
      <Suspense fallback={fallback || <Skeleton height={200} />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

// Pre-configured lazy components for common use cases
export const LazyPageTransition = withLazyLoading(
  () => import('./page-transition'),
  <div className="min-h-screen" />
);

export const LazyLoadingSkeleton = withLazyLoading(
  () => import('./loading-skeleton').then(module => ({ default: module.PageSkeleton })),
  <div className="animate-pulse bg-gray-200 h-64 rounded" />
);
