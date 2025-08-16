import { NextResponse } from 'next/server';
import { readGig } from '@/lib/gigs/hierarchical-storage';
import { readBriefFile, briefFileExists } from '@/lib/gigs/brief-storage';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const gigId = parseInt(id);

    if (!gigId) {
      return NextResponse.json({ error: 'Invalid gig ID' }, { status: 400 });
    }

    // Get the gig data
    const gig = await readGig(gigId);
    if (!gig) {
      return NextResponse.json({ error: 'Gig not found' }, { status: 404 });
    }

    // Check if gig has a brief file
    if (!gig.briefFile) {
      return NextResponse.json({ error: 'No brief file available for this gig' }, { status: 404 });
    }

    try {
      // Check if the file exists in hierarchical storage
      const fileExists = await briefFileExists(gig.id, gig.postedDate, gig.briefFile.name);

      if (!fileExists) {
        return NextResponse.json({
          error: 'Brief file not found on server',
          message: 'The brief file metadata exists but the actual file is not available in storage.',
          fileInfo: {
            name: gig.briefFile.name,
            size: gig.briefFile.size,
            type: gig.briefFile.type
          }
        }, { status: 404 });
      }

      // Read the file from hierarchical storage
      const fileBuffer = await readBriefFile(gig.id, gig.postedDate, gig.briefFile.name);

      if (!fileBuffer) {
        return NextResponse.json({
          error: 'Failed to read brief file',
          message: 'The file exists but could not be read from storage.'
        }, { status: 500 });
      }

      // Return the file with appropriate headers
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': gig.briefFile.type || 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${gig.briefFile.name}"`,
          'Content-Length': fileBuffer.length.toString(),
          'Cache-Control': 'no-cache',
        },
      });

    } catch (fileError) {
      console.error('File access error:', fileError);
      return NextResponse.json({
        error: 'Brief file access failed',
        message: 'An error occurred while trying to access the brief file.',
        fileInfo: {
          name: gig.briefFile.name,
          size: gig.briefFile.size,
          type: gig.briefFile.type
        }
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error downloading brief file:', error);
    return NextResponse.json({ 
      error: 'Failed to download brief file',
      message: 'An unexpected error occurred while trying to download the brief file.'
    }, { status: 500 });
  }
}
