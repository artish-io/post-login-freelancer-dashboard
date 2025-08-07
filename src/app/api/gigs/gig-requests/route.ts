import { NextResponse } from 'next/server';
import { readAllGigRequests, filterGigRequestsByStatus } from '../../../../lib/gigs/gig-request-storage';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const commissionerId = searchParams.get('commissionerId');
    const freelancerId = searchParams.get('freelancerId');

    let requests = await readAllGigRequests();

    // Filter by commissioner if specified
    if (commissionerId) {
      const commissionerIdNum = parseInt(commissionerId);
      requests = requests.filter(request => request.commissionerId === commissionerIdNum);
    }

    // Filter by freelancer if specified
    if (freelancerId) {
      const freelancerIdNum = parseInt(freelancerId);
      requests = requests.filter(request => request.freelancerId === freelancerIdNum);
    }

    // Filter by status if specified
    if (status) {
      requests = filterGigRequestsByStatus(requests, status);
    }

    return NextResponse.json(requests);
  } catch (error) {
    console.error('Error reading gig requests:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
