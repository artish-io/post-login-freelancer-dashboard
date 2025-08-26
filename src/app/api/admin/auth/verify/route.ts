import { NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/admin-auth';

/**
 * Admin Token Verification API
 * 
 * Verifies if the provided JWT token is valid for admin access
 */

export async function GET(request: Request) {
  try {
    const authResult = await requireAdminAuth(request);
    
    if (authResult instanceof Response) {
      return authResult; // Return the error response
    }

    // Token is valid
    return NextResponse.json({
      success: true,
      user: authResult
    });

  } catch (error) {
    console.error('❌ Token verification error:', error);
    return NextResponse.json(
      { error: 'Token verification failed' },
      { status: 500 }
    );
  }
}
