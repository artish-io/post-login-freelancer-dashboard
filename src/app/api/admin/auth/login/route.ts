import { NextResponse } from 'next/server';
import { SignJWT } from 'jose';

/**
 * Admin Authentication API
 * 
 * Simple authentication for admin dashboard access
 * Credentials: toye@artish.world / KingToye12!
 */

const ADMIN_EMAIL = 'toye@artish.world';
const ADMIN_PASSWORD = 'KingToye12!';
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'admin-dashboard-secret-key-2025'
);

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    // Validate credentials
    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Create JWT token
    const token = await new SignJWT({ 
      email: ADMIN_EMAIL,
      role: 'admin',
      iat: Math.floor(Date.now() / 1000),
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('24h')
      .sign(JWT_SECRET);

    console.log(`✅ Admin login successful for ${email}`);

    return NextResponse.json({
      success: true,
      token,
      user: {
        email: ADMIN_EMAIL,
        role: 'admin'
      }
    });

  } catch (error) {
    console.error('❌ Admin login error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
