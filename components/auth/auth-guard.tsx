'use client';

import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

interface AuthGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
  requiredUserType?: 'commissioner' | 'freelancer';
  fallbackComponent?: React.ReactNode;
  allowCrossUserTypeProfiles?: boolean;
}

export default function AuthGuard({
  children,
  redirectTo = '/login',
  requiredUserType,
  fallbackComponent,
  allowCrossUserTypeProfiles = false,
}: AuthGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      console.log('🔒 AuthGuard: No session, redirecting to:', redirectTo);
      router.push(redirectTo);
      return;
    }

    // Check user type if specified
    if (requiredUserType && (session.user as any).userType !== requiredUserType) {
      console.log('🔒 AuthGuard: User type mismatch', {
        required: requiredUserType,
        actual: (session.user as any).userType,
        pathname,
        allowCrossUserTypeProfiles
      });

      // Allow cross-user-type profile viewing if enabled
      if (allowCrossUserTypeProfiles && pathname.includes('/profile/')) {
        // Allow commissioners to view any profile in commissioner dashboard
        // Allow freelancers to view any profile in freelancer dashboard
        const isCommissionerDashboard = pathname.startsWith('/commissioner-dashboard');
        const isFreelancerDashboard = pathname.startsWith('/freelancer-dashboard');
        const userType = (session.user as any).userType;

        console.log('🔒 AuthGuard: Checking cross-user-type profile access', {
          isCommissionerDashboard,
          isFreelancerDashboard,
          userType,
          pathname
        });

        if ((isCommissionerDashboard && userType === 'commissioner') ||
            (isFreelancerDashboard && userType === 'freelancer')) {
          console.log('✅ AuthGuard: Allowing cross-user-type profile access');
          return; // Allow access
        }
      }

      const fallbackRedirect = requiredUserType === 'commissioner'
        ? '/login-commissioner'
        : '/login';
      console.log('🔒 AuthGuard: Redirecting to:', fallbackRedirect);
      router.push(fallbackRedirect);
      return;
    }

    console.log('✅ AuthGuard: Access granted', {
      userType: (session.user as any).userType,
      pathname
    });
  }, [session, status, router, redirectTo, requiredUserType, allowCrossUserTypeProfiles, pathname]);

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
