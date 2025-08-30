'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ReactNode, MouseEvent } from 'react';
import { NavigationOptimizer } from '../../lib/utils/navigation-optimizer';

interface OptimizedLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  replace?: boolean;
  scroll?: boolean;
  prefetch?: boolean;
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
}

/**
 * Optimized Link component with automatic prefetching and faster navigation
 */
export default function OptimizedLink({
  href,
  children,
  className,
  replace = false,
  scroll = true,
  prefetch = true,
  onClick,
  ...props
}: OptimizedLinkProps) {
  const router = useRouter();

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // Call custom onClick if provided
    if (onClick) {
      onClick(e);
    }

    // Don't interfere with default Link behavior for external links
    if (href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:')) {
      return;
    }

    // For internal navigation, use optimized navigation
    e.preventDefault();
    NavigationOptimizer.navigate(router, href, { replace, scroll });
  };

  const handleMouseEnter = () => {
    // Prefetch on hover for instant navigation
    if (prefetch && !href.startsWith('http')) {
      NavigationOptimizer.prefetch(router, href);
    }
  };

  return (
    <Link
      href={href}
      className={className}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      prefetch={prefetch}
      {...props}
    >
      {children}
    </Link>
  );
}
