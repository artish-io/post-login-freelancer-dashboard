import { NextRequest, NextResponse } from 'next/server';
import { existsSync } from 'fs';
import path from 'path';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/[...nextauth]/route';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await params;

    // Get user profile to find resume info
    const profilePath = path.join(process.cwd(), 'data/users', `${userId}.json`);
    
    if (!existsSync(profilePath)) {
      return NextResponse.json({ resume: null });
    }

    const { readFileSync } = require('fs');
    const profile = JSON.parse(readFileSync(profilePath, 'utf8'));
    
    // Return resume info (but not the actual file)
    return NextResponse.json({ resume: profile.resume || null });

  } catch (error) {
    console.error('Error fetching resume info:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch resume info' 
    }, { status: 500 });
  }
}
