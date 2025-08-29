import { NextRequest, NextResponse } from 'next/server';
import { readJson, writeJsonAtomic } from '@/lib/fs-json';
import { getUserById } from '@/lib/storage/unified-storage-service';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import path from 'path';

// DEV-ONLY: Magic link verification and session creation
// TODO: Replace with production session management (NextAuth/Auth0) later

interface MagicLinkToken {
  token: string;
  userId: number;
  email: string;
  expiresAt: string;
  createdAt: string;
}

interface DevSession {
  sessionId: string;
  userId: number;
  email: string;
  userType: string;
  createdAt: string;
  expiresAt: string;
}

const TOKENS_FILE = path.join(process.cwd(), 'data', 'auth-tokens.json');
const SESSIONS_FILE = path.join(process.cwd(), 'data', 'dev-sessions.json');

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    // Read and validate token
    let tokens: MagicLinkToken[] = [];
    try {
      tokens = await readJson<MagicLinkToken[]>(TOKENS_FILE, []);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const magicToken = tokens.find(t => t.token === token);
    if (!magicToken) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Check if token is expired
    if (new Date(magicToken.expiresAt) <= new Date()) {
      return NextResponse.json(
        { error: 'Token has expired' },
        { status: 401 }
      );
    }

    // Get user details
    const user = await getUserById(magicToken.userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Create session
    const sessionId = crypto.randomBytes(32).toString('hex');
    const sessionExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    const session: DevSession = {
      sessionId,
      userId: user.id,
      email: user.email,
      userType: user.type,
      createdAt: new Date().toISOString(),
      expiresAt: sessionExpiresAt
    };

    // Read existing sessions
    let sessions: DevSession[] = [];
    try {
      sessions = await readJson<DevSession[]>(SESSIONS_FILE, []);
    } catch (error) {
      sessions = [];
    }

    // Clean up expired sessions
    const now = new Date();
    sessions = sessions.filter(s => new Date(s.expiresAt) > now);

    // Add new session
    sessions.push(session);

    // Save sessions
    await writeJsonAtomic(SESSIONS_FILE, sessions);

    // Remove used token
    const remainingTokens = tokens.filter(t => t.token !== token);
    await writeJsonAtomic(TOKENS_FILE, remainingTokens);

    // Set HttpOnly cookie
    const cookieStore = cookies();
    cookieStore.set('sid', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/'
    });

    console.log(`✅ [DEV AUTH] Session created for user: ${user.name} (${user.email})`);

    // Redirect to appropriate dashboard based on user type
    const redirectUrl = user.type === 'commissioner' 
      ? '/commissioner-dashboard' 
      : '/freelancer-dashboard';

    return NextResponse.redirect(new URL(redirectUrl, request.url));

  } catch (error) {
    console.error('🔥 Token verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Alternative POST endpoint for JSON response (useful for testing)
export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    // Same verification logic as GET
    let tokens: MagicLinkToken[] = [];
    try {
      tokens = await readJson<MagicLinkToken[]>(TOKENS_FILE, []);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const magicToken = tokens.find(t => t.token === token);
    if (!magicToken || new Date(magicToken.expiresAt) <= new Date()) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const user = await getUserById(magicToken.userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Create session (same logic as GET)
    const sessionId = crypto.randomBytes(32).toString('hex');
    const sessionExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const session: DevSession = {
      sessionId,
      userId: user.id,
      email: user.email,
      userType: user.type,
      createdAt: new Date().toISOString(),
      expiresAt: sessionExpiresAt
    };

    let sessions: DevSession[] = [];
    try {
      sessions = await readJson<DevSession[]>(SESSIONS_FILE, []);
    } catch (error) {
      sessions = [];
    }

    const now = new Date();
    sessions = sessions.filter(s => new Date(s.expiresAt) > now);
    sessions.push(session);

    await writeJsonAtomic(SESSIONS_FILE, sessions);

    // Remove used token
    const remainingTokens = tokens.filter(t => t.token !== token);
    await writeJsonAtomic(TOKENS_FILE, remainingTokens);

    return NextResponse.json({
      success: true,
      sessionId,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        type: user.type
      },
      redirectTo: user.type === 'commissioner' ? '/commissioner-dashboard' : '/freelancer-dashboard'
    });

  } catch (error) {
    console.error('🔥 Token verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
