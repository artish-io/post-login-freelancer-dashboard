'use client';

import clsx from 'clsx';
import dynamic from 'next/dynamic';

// Lazy load framer-motion to reduce initial bundle size
const motion = dynamic(() => import('framer-motion').then(mod => ({ default: mod.motion })), {
  ssr: false,
  loading: () => ({ div: 'div' as any })
});

type SkeletonProps = {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: boolean;
  animate?: boolean;
};

export function Skeleton({ 
  className = '', 
  width, 
  height, 
  rounded = false,
  animate = true 
}: SkeletonProps) {
  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  return (
    <motion.div
      className={clsx(
        'skeleton bg-gray-200',
        rounded ? 'rounded-full' : 'rounded',
        className
      )}
      style={style}
      initial={animate ? { opacity: 0 } : undefined}
      animate={animate ? { opacity: 1 } : undefined}
      transition={animate ? { duration: 0.3 } : undefined}
    />
  );
}

// Pre-built skeleton components for common use cases
export function CardSkeleton() {
  return (
    <motion.div 
      className="bg-white rounded-lg p-6 shadow-sm border"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Skeleton height={20} className="mb-4" />
      <Skeleton height={16} width="60%" className="mb-2" />
      <Skeleton height={16} width="80%" className="mb-4" />
      <div className="flex gap-2">
        <Skeleton height={32} width={80} rounded />
        <Skeleton height={32} width={80} rounded />
      </div>
    </motion.div>
  );
}

export function TableRowSkeleton() {
  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <td className="px-4 py-3">
        <Skeleton height={16} width="80%" />
      </td>
      <td className="px-4 py-3">
        <Skeleton height={16} width="60%" />
      </td>
      <td className="px-4 py-3">
        <Skeleton height={16} width="40%" />
      </td>
      <td className="px-4 py-3">
        <Skeleton height={24} width={60} rounded />
      </td>
    </motion.tr>
  );
}

export function AvatarSkeleton({ size = 40 }: { size?: number }) {
  return (
    <Skeleton 
      width={size} 
      height={size} 
      rounded 
      className="shrink-0" 
    />
  );
}

export function TextSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
          key={i}
          height={16} 
          width={i === lines - 1 ? '60%' : '100%'} 
        />
      ))}
    </div>
  );
}

export function ButtonSkeleton() {
  return (
    <Skeleton 
      height={40} 
      width={120} 
      className="rounded-lg" 
    />
  );
}

// Page loading skeleton
export function PageSkeleton() {
  return (
    <motion.div 
      className="space-y-6 p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton height={32} width={200} />
        <ButtonSkeleton />
      </div>
      
      {/* Content skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </motion.div>
  );
}
