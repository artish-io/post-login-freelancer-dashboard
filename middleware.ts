import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // Allow access to login pages and public routes
    if (
      pathname.startsWith('/login') ||
      pathname.startsWith('/sign-up') ||
      pathname.startsWith('/reset-password') ||
      pathname.startsWith('/reset-confirmation') ||
      pathname.startsWith('/get-started') ||
      pathname.startsWith('/marketplace') ||
      pathname.startsWith('/api/auth') ||
      pathname.startsWith('/api/organizations') ||
      pathname.startsWith('/test-login-tilly') ||
      pathname.startsWith('/test-login-neilsan') ||
      pathname.startsWith('/login-freelancer-tobi') ||
      pathname === '/' ||
      pathname.startsWith('/_next') ||
      pathname.startsWith('/public')
    ) {
      return NextResponse.next();
    }

    // Protect dashboard routes
    if (pathname.startsWith('/commissioner-dashboard') || pathname.startsWith('/freelancer-dashboard')) {
      if (!token) {
        // Redirect to appropriate login page based on the dashboard type
        const loginUrl = pathname.startsWith('/commissioner-dashboard')
          ? '/login-commissioner'
          : '/login';

        const url = req.nextUrl.clone();
        url.pathname = loginUrl;
        return NextResponse.redirect(url);
      }

      // Add user type validation to redirect users to appropriate dashboards
      if (pathname.startsWith('/commissioner-dashboard') && token.userType !== 'commissioner') {
        const url = req.nextUrl.clone();
        url.pathname = '/freelancer-dashboard';
        return NextResponse.redirect(url);
      }

      if (pathname.startsWith('/freelancer-dashboard') && token.userType !== 'freelancer') {
        const url = req.nextUrl.clone();
        url.pathname = '/commissioner-dashboard';
        return NextResponse.redirect(url);
      }
    }

    // Protect admin routes
    if (pathname.startsWith('/admin')) {
      if (!token) {
        const url = req.nextUrl.clone();
        url.pathname = '/login';
        return NextResponse.redirect(url);
      }

      // Optional: Add admin role validation
      // if (token.userType !== 'admin') {
      //   const url = req.nextUrl.clone();
      //   url.pathname = '/login';
      //   return NextResponse.redirect(url);
      // }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        
        // Allow access to public routes without authentication
        if (
          pathname.startsWith('/login') ||
          pathname.startsWith('/sign-up') ||
          pathname.startsWith('/reset-password') ||
          pathname.startsWith('/reset-confirmation') ||
          pathname.startsWith('/get-started') ||
          pathname.startsWith('/marketplace') ||
          pathname.startsWith('/api/auth') ||
          pathname.startsWith('/api/organizations') ||
          pathname.startsWith('/test-login-tilly') ||
          pathname.startsWith('/test-login-neilsan') ||
          pathname.startsWith('/login-freelancer-tobi') ||
          pathname === '/' ||
          pathname.startsWith('/_next') ||
          pathname.startsWith('/public')
        ) {
          return true;
        }

        // Require authentication for dashboard and admin routes
        if (pathname.startsWith('/commissioner-dashboard') || pathname.startsWith('/freelancer-dashboard') || pathname.startsWith('/admin')) {
          return !!token;
        }

        // Allow other routes by default
        return true;
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth.js routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|public).*)',
  ],
};
