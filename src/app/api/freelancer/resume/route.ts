import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, unlink, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

const RESUME_UPLOAD_DIR = path.join(process.cwd(), 'uploads/resumes');

// Ensure upload directory exists
async function ensureUploadDir() {
  if (!existsSync(RESUME_UPLOAD_DIR)) {
    await mkdir(RESUME_UPLOAD_DIR, { recursive: true });
  }
}

// Get user's resume directory
function getUserResumeDir(userId: string) {
  return path.join(RESUME_UPLOAD_DIR, userId);
}

// Validate file type and size
function validateResumeFile(file: File) {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type. Only PDF, DOC, and DOCX files are allowed.');
  }

  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    throw new Error('File too large. Maximum size is 5MB.');
  }
}

// Upload resume
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('resume') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    validateResumeFile(file);

    await ensureUploadDir();
    const userDir = getUserResumeDir(session.user.id);
    
    // Create user directory if it doesn't exist
    if (!existsSync(userDir)) {
      await mkdir(userDir, { recursive: true });
    }

    // Remove existing resume files
    try {
      const existingFiles = await readdir(userDir);
      for (const existingFile of existingFiles) {
        await unlink(path.join(userDir, existingFile));
      }
    } catch (error) {
      // Directory might not exist or be empty, which is fine
    }

    // Generate filename
    const fileExtension = path.extname(file.name);
    const fileName = `resume_${Date.now()}${fileExtension}`;
    const filePath = path.join(userDir, fileName);

    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Update user profile with resume info
    const resumeInfo = {
      fileName: file.name,
      storedFileName: fileName,
      size: file.size,
      type: file.type,
      uploadedAt: new Date().toISOString()
    };

    // Here you would typically update the user's profile in your database
    // For now, we'll store it in a JSON file
    const profilePath = path.join(process.cwd(), 'data/users', `${session.user.id}.json`);
    try {
      const { readFileSync, writeFileSync } = require('fs');
      let profile = {};
      
      if (existsSync(profilePath)) {
        profile = JSON.parse(readFileSync(profilePath, 'utf8'));
      }
      
      profile = { ...profile, resume: resumeInfo };
      writeFileSync(profilePath, JSON.stringify(profile, null, 2));
    } catch (error) {
      console.error('Error updating profile:', error);
    }

    return NextResponse.json({
      success: true,
      resume: resumeInfo
    });

  } catch (error) {
    console.error('Resume upload error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to upload resume' 
    }, { status: 500 });
  }
}

// Get resume info
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Read user profile to get resume info
    const profilePath = path.join(process.cwd(), 'data/users', `${session.user.id}.json`);
    
    if (!existsSync(profilePath)) {
      return NextResponse.json({ resume: null });
    }

    const { readFileSync } = require('fs');
    const profile = JSON.parse(readFileSync(profilePath, 'utf8'));
    
    return NextResponse.json({ resume: profile.resume || null });

  } catch (error) {
    console.error('Error fetching resume info:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch resume info' 
    }, { status: 500 });
  }
}

// Delete resume
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userDir = getUserResumeDir(session.user.id);
    
    // Remove all files in user's resume directory
    try {
      const files = await readdir(userDir);
      for (const file of files) {
        await unlink(path.join(userDir, file));
      }
    } catch (error) {
      // Directory might not exist, which is fine
    }

    // Update user profile to remove resume info
    const profilePath = path.join(process.cwd(), 'data/users', `${session.user.id}.json`);
    try {
      const { readFileSync, writeFileSync } = require('fs');
      
      if (existsSync(profilePath)) {
        const profile = JSON.parse(readFileSync(profilePath, 'utf8'));
        delete profile.resume;
        writeFileSync(profilePath, JSON.stringify(profile, null, 2));
      }
    } catch (error) {
      console.error('Error updating profile:', error);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Resume deletion error:', error);
    return NextResponse.json({ 
      error: 'Failed to delete resume' 
    }, { status: 500 });
  }
}
