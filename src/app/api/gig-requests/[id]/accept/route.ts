import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const requestId = parseInt(params.id);
    const body = await request.json();
    
    if (isNaN(requestId)) {
      return NextResponse.json(
        { error: 'Invalid request ID' },
        { status: 400 }
      );
    }

    // Read gig requests data
    const requestsPath = path.join(process.cwd(), 'data', 'gigs', 'gig-requests.json');
    const requestsData = JSON.parse(fs.readFileSync(requestsPath, 'utf8'));
    
    // Find the specific request
    const requestIndex = requestsData.findIndex((r: any) => r.id === requestId);
    
    if (requestIndex === -1) {
      return NextResponse.json(
        { error: 'Gig request not found' },
        { status: 404 }
      );
    }

    // Update the request status
    requestsData[requestIndex] = {
      ...requestsData[requestIndex],
      status: 'Accepted',
      acceptedAt: new Date().toISOString(),
      responses: [
        ...(requestsData[requestIndex].responses || []),
        {
          type: 'accepted',
          timestamp: new Date().toISOString(),
          message: 'Offer accepted'
        }
      ]
    };

    // Write back to file
    fs.writeFileSync(requestsPath, JSON.stringify(requestsData, null, 2));

    return NextResponse.json({
      success: true,
      message: 'Gig request accepted successfully',
      request: requestsData[requestIndex]
    });
  } catch (error) {
    console.error('Error accepting gig request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
