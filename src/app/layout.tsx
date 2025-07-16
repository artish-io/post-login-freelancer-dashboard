// src/app/layout.tsx
import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import CustomSessionProvider from '../../components/providers/session-provider';
import NavigationProgress from '../../components/ui/navigation-progress';
import './globals.css';

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
        <NavigationProgress />
        <CustomSessionProvider>{children}</CustomSessionProvider>
      </body>
    </html>
  );
}