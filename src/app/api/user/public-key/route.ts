// src/app/api/user/public-key/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import path from 'path';
import { promises as fs } from 'fs';

// Store public key for a user
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { userId, publicKey } = await req.json();
    
    // Verify user can only set their own public key
    if (userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const keysFile = path.join(process.cwd(), 'data/public-keys.json');
    
    let keys = [];
    try {
      const data = await fs.readFile(keysFile, 'utf-8');
      keys = JSON.parse(data);
    } catch (error) {
      // File doesn't exist, start with empty array
    }

    // Update or add user's public key
    const existingIndex = keys.findIndex((k: any) => k.userId === userId);
    if (existingIndex >= 0) {
      keys[existingIndex].publicKey = publicKey;
    } else {
      keys.push({ userId, publicKey });
    }

    await fs.writeFile(keysFile, JSON.stringify(keys, null, 2));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error storing public key:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
