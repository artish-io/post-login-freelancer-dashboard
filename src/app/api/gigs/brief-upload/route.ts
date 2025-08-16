import { NextRequest, NextResponse } from 'next/server';
import { readGig, saveGig } from '@/lib/gigs/hierarchical-storage';
import { saveBriefFile } from '@/lib/gigs/brief-storage';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    
    const gigId = formData.get('gigId') as string;
    const file = formData.get('file') as File;
    
    if (!gigId || !file) {
      return NextResponse.json({ 
        error: 'Missing required fields',
        message: 'Both gigId and file are required.'
      }, { status: 400 });
    }

    const gigIdNum = parseInt(gigId);
    if (isNaN(gigIdNum)) {
      return NextResponse.json({ 
        error: 'Invalid gig ID',
        message: 'Gig ID must be a valid number.'
      }, { status: 400 });
    }

    // Get the gig to verify it exists and get the posted date
    const gig = await readGig(gigIdNum);
    if (!gig) {
      return NextResponse.json({ 
        error: 'Gig not found',
        message: 'The specified gig does not exist.'
      }, { status: 404 });
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/rtf',
      'application/vnd.oasis.opendocument.text'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type',
        message: 'Only PDF, DOC, DOCX, TXT, RTF, and ODT files are allowed.',
        allowedTypes
      }, { status: 400 });
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'File too large',
        message: 'File size must be less than 10MB.',
        maxSize: '10MB',
        fileSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`
      }, { status: 400 });
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Save the file using hierarchical storage
    const briefInfo = await saveBriefFile(gigIdNum, gig.postedDate, file.name, fileBuffer);

    // Update the gig with brief file information
    const updatedGig = {
      ...gig,
      briefFile: {
        name: briefInfo.name,
        size: briefInfo.size,
        type: briefInfo.type,
        path: briefInfo.path
      }
    };

    // Save the updated gig
    await saveGig(updatedGig);

    return NextResponse.json({
      success: true,
      message: 'Brief file uploaded successfully',
      briefFile: {
        name: briefInfo.name,
        size: briefInfo.size,
        type: briefInfo.type,
        uploadedAt: briefInfo.uploadedAt
      }
    });

  } catch (error) {
    console.error('Error uploading brief file:', error);
    return NextResponse.json({ 
      error: 'Upload failed',
      message: 'An unexpected error occurred while uploading the brief file.'
    }, { status: 500 });
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
