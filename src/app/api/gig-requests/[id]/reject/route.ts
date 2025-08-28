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
    const { readAllGigRequests, updateGigRequestStatus } = await import('../../../../../lib/gigs/gig-request-storage');
    const requestsData = await readAllGigRequests();
    
    // Find the specific request
    const requestIndex = requestsData.findIndex((r: any) => r.id === requestId);
    
    if (requestIndex === -1) {
      return NextResponse.json(
        { error: 'Gig request not found' },
        { status: 404 }
      );
    }

    // Update the request status using hierarchical storage
    await updateGigRequestStatus(requestId, {
      status: 'Rejected',
      responses: [
        ...(requestsData[requestIndex].responses || []),
        {
          type: 'rejected',
          timestamp: new Date().toISOString(),
          message: reason || 'Offer rejected',
          reason: reason
        }
      ]
    });

    return NextResponse.json({
      success: true,
      message: 'Gig request rejected successfully',
      requestId: requestId
    });
  } catch (error) {
    console.error('Error rejecting gig request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
