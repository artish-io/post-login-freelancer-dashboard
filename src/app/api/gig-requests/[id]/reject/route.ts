import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const requestId = parseInt(id);
    const body = await request.json();
    const { reason } = body;
    
    if (isNaN(requestId)) {
      return NextResponse.json(
        { error: 'Invalid request ID' },
        { status: 400 }
      );
    }

    // Read gig requests data from hierarchical storage
    const { readAllGigRequests } = await import('../../../../../lib/gigs/gig-request-storage');
    const requestsData = await readAllGigRequests();
    
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
      status: 'Rejected',
      rejectedAt: new Date().toISOString(),
      rejectionReason: reason || 'No reason provided',
      responses: [
        ...(requestsData[requestIndex].responses || []),
        {
          type: 'rejected',
          timestamp: new Date().toISOString(),
          message: reason || 'Offer rejected',
          reason: reason
        }
      ]
    };

    // Write back to file
    fs.writeFileSync(requestsPath, JSON.stringify(requestsData, null, 2));

    return NextResponse.json({
      success: true,
      message: 'Gig request rejected successfully',
      request: requestsData[requestIndex]
    });
  } catch (error) {
    console.error('Error rejecting gig request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
