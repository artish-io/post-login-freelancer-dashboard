'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ReactNode, MouseEvent } from 'react';
import { motion } from 'framer-motion';

type SmoothLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  replace?: boolean;
  scroll?: boolean;
  prefetch?: boolean;
};

export default function SmoothLink({
  href,
  children,
  className = '',
  onClick,
  replace = false,
  scroll = true,
  prefetch = true,
}: SmoothLinkProps) {
  const router = useRouter();

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // Don't prevent default for external links or special keys
    if (
      href.startsWith('http') ||
      href.startsWith('mailto:') ||
      href.startsWith('tel:') ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey
    ) {
      onClick?.();
      return;
    }

    e.preventDefault();
    onClick?.();

    // Add a small delay for smooth transition
    setTimeout(() => {
      if (replace) {
        router.replace(href, { scroll });
      } else {
        router.push(href, { scroll });
      }
    }, 50);
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.1 }}
    >
      <Link
        href={href}
        className={className}
        onClick={handleClick}
        prefetch={prefetch}
      >
        {children}
      </Link>
    </motion.div>
  );
}
