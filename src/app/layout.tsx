// src/app/layout.tsx
import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { Suspense } from 'react';
import CustomSessionProvider from '../../components/providers/session-provider';
import NavigationProgress from '../../components/ui/navigation-progress';
import { CartProvider } from '../../components/storefront/cart-context';
import { ToastProvider } from '../../components/ui/toast';
import { bootstrapEventHandlers } from '../lib/events/bootstrap';
import { initializeLegacyPrevention } from '../lib/storage/legacy-prevention';
import './globals.css';

// Bootstrap event handlers and storage prevention on server startup
if (typeof window === 'undefined') {
  try {
    bootstrapEventHandlers();
    initializeLegacyPrevention();
  } catch (error) {
    console.error('Failed to bootstrap application:', error);
  }
}

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
});

export const metadata: Metadata = {
  title: 'ARTISH',
  description: 'Registered Trademark of ARTISH Inc',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body className="font-jakarta antialiased">
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        <CustomSessionProvider>
          <CartProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </CartProvider>
        </CustomSessionProvider>
      </body>
    </html>
  );
}