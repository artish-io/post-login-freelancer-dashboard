'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface AuthGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
  requiredUserType?: 'commissioner' | 'freelancer';
  fallbackComponent?: React.ReactNode;
}

export default function AuthGuard({
  children,
  redirectTo = '/login',
  requiredUserType,
  fallbackComponent,
}: AuthGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push(redirectTo);
      return;
    }

    // Check user type if specified
    if (requiredUserType && (session.user as any).userType !== requiredUserType) {
      const fallbackRedirect = requiredUserType === 'commissioner' 
        ? '/login-commissioner' 
        : '/login';
      router.push(fallbackRedirect);
      return;
    }
  }, [session, status, router, redirectTo, requiredUserType]);

  // Show loading state
  if (status === 'loading') {
    return (
      fallbackComponent || (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      )
    );
  }

  // Don't render children if not authenticated
  if (!session) {
    return null;
  }

  // Don't render children if user type doesn't match
  if (requiredUserType && (session.user as any).userType !== requiredUserType) {
    return null;
  }

  return <>{children}</>;
}
