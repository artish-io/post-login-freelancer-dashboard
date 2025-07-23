'use client';

import { ReactNode } from 'react';

interface SettingsLayoutProps {
  sidebar: ReactNode;
  children: ReactNode;
  mobileComponent?: ReactNode;
}

export default function SettingsLayout({ 
  sidebar, 
  children, 
  mobileComponent 
}: SettingsLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex flex-col lg:flex-row gap-6 px-4 sm:px-6 lg:px-8 py-6 max-w-6xl mx-auto">
        {/* Mobile: Show mobile component if provided */}
        {mobileComponent && (
          <div className="lg:hidden w-full">
            <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm">
              {mobileComponent}
            </div>
          </div>
        )}

        {/* Desktop: Show sidebar + content layout */}
        <div className="hidden lg:flex lg:flex-row lg:gap-6 lg:w-full">
          <aside className="w-1/4 max-w-xs">
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              {sidebar}
            </div>
          </aside>
          <main className="w-3/4">
            <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
