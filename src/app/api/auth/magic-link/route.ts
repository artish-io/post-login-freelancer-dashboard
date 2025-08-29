import { NextRequest, NextResponse } from 'next/server';
import { readJson, writeJsonAtomic } from '@/lib/fs-json';
import { getAllUsers } from '@/lib/storage/unified-storage-service';
import crypto from 'crypto';
import path from 'path';

// DEV-ONLY: Magic link generation for passwordless authentication
// TODO: Replace with production email service (SendGrid/SES) later

interface MagicLinkToken {
  token: string;
  userId: number;
  email: string;
  expiresAt: string;
  createdAt: string;
}

const TOKENS_FILE = path.join(process.cwd(), 'data', 'auth-tokens.json');

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Find user by email
    const users = await getAllUsers();
    const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (!user) {
      // For security, don't reveal if email exists or not
      // In dev mode, we'll still log this for debugging
      console.log(`🔍 [DEV MAGIC LINK] Email not found: ${email}`);
      return NextResponse.json({
        success: true,
        message: 'If an account with this email exists, a magic link has been sent.'
      });
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

    const magicLinkToken: MagicLinkToken = {
      token,
      userId: user.id,
      email: user.email,
      expiresAt,
      createdAt: new Date().toISOString()
    };

    // Read existing tokens
    let tokens: MagicLinkToken[] = [];
    try {
      tokens = await readJson<MagicLinkToken[]>(TOKENS_FILE, []);
    } catch (error) {
      // File doesn't exist yet, start with empty array
      tokens = [];
    }

    // Clean up expired tokens
    const now = new Date();
    tokens = tokens.filter(t => new Date(t.expiresAt) > now);

    // Add new token
    tokens.push(magicLinkToken);

    // Save tokens
    await writeJsonAtomic(TOKENS_FILE, tokens);

    // Generate magic link URL
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const magicLinkUrl = `${baseUrl}/api/auth/verify?token=${token}`;

    // DEV-ONLY: Log the magic link to console instead of sending email
    console.log('\n🔗 [DEV MAGIC LINK] Copy this URL to your browser:');
    console.log(`   ${magicLinkUrl}`);
    console.log(`   User: ${user.name} (${user.email})`);
    console.log(`   Expires: ${new Date(expiresAt).toLocaleString()}\n`);

    return NextResponse.json({
      success: true,
      message: 'Magic link generated! Check the server console for the link.',
      // DEV-ONLY: Include token in response for testing
      ...(process.env.NODE_ENV === 'development' && { 
        devToken: token,
        devUrl: magicLinkUrl 
      })
    });

  } catch (error) {
    console.error('🔥 Magic link generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper endpoint to list active tokens (DEV-ONLY)
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 });
  }

  try {
    const tokens = await readJson<MagicLinkToken[]>(TOKENS_FILE, []);
    const now = new Date();
    const activeTokens = tokens.filter(t => new Date(t.expiresAt) > now);

    return NextResponse.json({
      activeTokens: activeTokens.map(t => ({
        token: t.token,
        email: t.email,
        expiresAt: t.expiresAt,
        createdAt: t.createdAt
      }))
    });
  } catch (error) {
    console.error('Error reading tokens:', error);
    return NextResponse.json({ error: 'Error reading tokens' }, { status: 500 });
  }
}
