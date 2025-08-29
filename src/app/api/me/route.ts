import { NextRequest, NextResponse } from 'next/server';
import { readJson } from '@/lib/fs-json';
import { getUserById, getOrganizationByCommissionerId } from '@/lib/storage/unified-storage-service';
import { cookies } from 'next/headers';
import path from 'path';

// DEV-ONLY: Session-based user info endpoint
// TODO: Replace with production session management (NextAuth/Auth0) later

interface DevSession {
  sessionId: string;
  userId: number;
  email: string;
  userType: string;
  createdAt: string;
  expiresAt: string;
}

const SESSIONS_FILE = path.join(process.cwd(), 'data', 'dev-sessions.json');

export async function GET(request: NextRequest) {
  try {
    // Get session ID from cookie
    const cookieStore = cookies();
    const sessionId = cookieStore.get('sid')?.value;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'No active session' },
        { status: 401 }
      );
    }

    // Read sessions
    let sessions: DevSession[] = [];
    try {
      sessions = await readJson<DevSession[]>(SESSIONS_FILE, []);
    } catch (error) {
      return NextResponse.json(
        { error: 'No active session' },
        { status: 401 }
      );
    }

    // Find and validate session
    const session = sessions.find(s => s.sessionId === sessionId);
    if (!session) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    // Check if session is expired
    if (new Date(session.expiresAt) <= new Date()) {
      return NextResponse.json(
        { error: 'Session expired' },
        { status: 401 }
      );
    }

    // Get full user details
    const user = await getUserById(session.userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get organization details if user is a commissioner
    let organization = null;
    if (user.type === 'commissioner' && user.organizationId) {
      try {
        organization = await getOrganizationByCommissionerId(user.id);
      } catch (error) {
        console.warn(`Could not load organization for commissioner ${user.id}:`, error);
      }
    }

    console.log(`🔍 [DEV SESSION] User info requested: ${user.name} (${user.email})`);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        type: user.type,
        title: user.title,
        avatar: user.avatar,
        bio: user.bio,
        skills: user.skills || [],
        tools: user.tools || [],
        links: user.links || {},
        organizationId: user.organizationId || null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      organization: organization ? {
        id: organization.id,
        name: organization.name,
        bio: organization.bio,
        website: organization.website,
        logo: organization.logo,
        createdAt: organization.createdAt,
        updatedAt: organization.updatedAt
      } : null,
      session: {
        createdAt: session.createdAt,
        expiresAt: session.expiresAt
      }
    });

  } catch (error) {
    console.error('🔥 Session validation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST endpoint for programmatic session validation (useful for testing)
export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Same validation logic as GET but with provided sessionId
    let sessions: DevSession[] = [];
    try {
      sessions = await readJson<DevSession[]>(SESSIONS_FILE, []);
    } catch (error) {
      return NextResponse.json(
        { error: 'No active sessions' },
        { status: 401 }
      );
    }

    const session = sessions.find(s => s.sessionId === sessionId);
    if (!session || new Date(session.expiresAt) <= new Date()) {
      return NextResponse.json(
        { error: 'Invalid or expired session' },
        { status: 401 }
      );
    }

    const user = await getUserById(session.userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    let organization = null;
    if (user.type === 'commissioner' && user.organizationId) {
      try {
        organization = await getOrganizationByCommissionerId(user.id);
      } catch (error) {
        console.warn(`Could not load organization for commissioner ${user.id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        type: user.type,
        title: user.title,
        avatar: user.avatar,
        bio: user.bio,
        skills: user.skills || [],
        tools: user.tools || [],
        links: user.links || {},
        organizationId: user.organizationId || null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      organization,
      session: {
        createdAt: session.createdAt,
        expiresAt: session.expiresAt
      }
    });

  } catch (error) {
    console.error('🔥 Session validation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
