import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/[...nextauth]/route';

const RESUME_UPLOAD_DIR = path.join(process.cwd(), 'uploads/resumes');

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
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const { readFileSync } = require('fs');
    const profile = JSON.parse(readFileSync(profilePath, 'utf8'));
    
    if (!profile.resume) {
      return NextResponse.json({ error: 'No resume found for this user' }, { status: 404 });
    }

    // Check if resume file exists
    const resumePath = path.join(RESUME_UPLOAD_DIR, userId, profile.resume.storedFileName);
    
    if (!existsSync(resumePath)) {
      return NextResponse.json({ 
        error: 'Resume file not found on server',
        message: 'The resume metadata exists but the actual file is not available.'
      }, { status: 404 });
    }

    // Read and return the file
    const fileBuffer = await readFile(resumePath);
    
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': profile.resume.type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${profile.resume.fileName}"`,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    console.error('Error downloading resume:', error);
    return NextResponse.json({ 
      error: 'Failed to download resume',
      message: 'An unexpected error occurred while trying to download the resume.'
    }, { status: 500 });
  }
}
