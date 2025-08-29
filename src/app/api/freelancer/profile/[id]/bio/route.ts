import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../auth/[...nextauth]/route';
import { readJson, writeJsonAtomic } from '@/lib/fs-json';
import path from 'path';

const DATA_ROOT = process.env.DATA_ROOT || './data';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = params.id;
    
    // Verify user can only edit their own profile
    if (session.user.id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { bio } = await request.json();

    if (typeof bio !== 'string') {
      return NextResponse.json({ error: 'Invalid bio format' }, { status: 400 });
    }

    // Load current profile
    const profilePath = path.join(DATA_ROOT, 'users', userId, 'profile.json');
    let profile;

    try {
      profile = await readJson(profilePath, {});
      if (!profile || Object.keys(profile).length === 0) {
        return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
      }
    } catch (error) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Update bio
    profile.about = bio;
    profile.updatedAt = new Date().toISOString();

    // Save updated profile
    await writeJsonAtomic(profilePath, profile);

    return NextResponse.json({ 
      success: true, 
      message: 'Bio updated successfully',
      bio: bio
    });

  } catch (error) {
    console.error('Error updating bio:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
