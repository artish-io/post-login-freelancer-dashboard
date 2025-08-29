import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { readJson, writeJsonAtomic } from '@/lib/fs-json';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

const DATA_ROOT = process.env.DATA_ROOT || './data';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('avatar') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ 
        error: 'Invalid file type. Only image files are allowed.' 
      }, { status: 400 });
    }

    // Validate file size (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'File too large. Maximum size is 5MB.' 
      }, { status: 400 });
    }

    const userId = session.user.id;
    const userDir = path.join(DATA_ROOT, 'users', userId);
    const avatarDir = path.join(userDir, 'avatar');

    // Ensure directories exist
    await fs.mkdir(avatarDir, { recursive: true });

    // Generate unique filename
    const fileExtension = path.extname(file.name);
    const storedFileName = `avatar_${uuidv4()}${fileExtension}`;
    const filePath = path.join(avatarDir, storedFileName);

    // Save file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(filePath, buffer);

    // Create avatar URL (relative path for serving)
    const avatarUrl = `/api/freelancer/avatar/${userId}/${storedFileName}`;

    // Load and update profile
    const profilePath = path.join(userDir, 'profile.json');
    let profile;
    
    try {
      profile = await readJson(profilePath, {});
      if (!profile || Object.keys(profile).length === 0) {
        // Create basic profile if it doesn't exist
        profile = { id: userId };
      }
    } catch (error) {
      profile = { id: userId };
    }

    // Remove old avatar file if exists
    if (profile.avatar && profile.avatarFileName) {
      const oldFilePath = path.join(avatarDir, profile.avatarFileName);
      try {
        await fs.unlink(oldFilePath);
      } catch (error) {
        console.log('Old avatar file not found or already deleted');
      }
    }

    profile.avatar = avatarUrl;
    profile.avatarFileName = storedFileName;
    profile.updatedAt = new Date().toISOString();

    await writeJsonAtomic(profilePath, profile);

    return NextResponse.json({ 
      success: true, 
      message: 'Avatar uploaded successfully',
      avatarUrl: avatarUrl
    });

  } catch (error) {
    console.error('Error uploading avatar:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
