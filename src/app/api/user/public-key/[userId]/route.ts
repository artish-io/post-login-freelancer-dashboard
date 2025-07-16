// src/app/api/user/public-key/[userId]/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import path from 'path';
import { promises as fs } from 'fs';

// Get public key for a user
export async function GET(
  req: Request,
  { params }: { params: { userId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { userId } = params;
    const keysFile = path.join(process.cwd(), 'data/public-keys.json');
    
    const data = await fs.readFile(keysFile, 'utf-8');
    const keys = JSON.parse(data);
    
    const userKey = keys.find((k: any) => k.userId === userId);
    
    if (!userKey) {
      return NextResponse.json({ error: 'Public key not found' }, { status: 404 });
    }

    return NextResponse.json({ publicKey: userKey.publicKey });
  } catch (error) {
    console.error('Error retrieving public key:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
