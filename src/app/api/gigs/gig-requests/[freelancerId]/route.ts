

import { NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';

const REQUESTS_PATH = path.join(process.cwd(), 'data/gigs/gig-requests.json');
const GIGS_PATH = path.join(process.cwd(), 'data/gigs/gigs.json');
const ORGANIZATIONS_PATH = path.join(process.cwd(), 'data/organizations.json');

export async function GET(
  _req: Request,
  { params }: { params: { freelancerId: string } }
) {
  const freelancerId = Number(params.freelancerId);

  try {
    // Read existing gig requests
    const requestsRaw = await readFile(REQUESTS_PATH, 'utf-8');
    const requests = JSON.parse(requestsRaw);

    // Read targeted gig requests from main gigs file
    const gigsRaw = await readFile(GIGS_PATH, 'utf-8');
    const gigs = JSON.parse(gigsRaw);

    // Read organizations for enrichment
    const organizationsRaw = await readFile(ORGANIZATIONS_PATH, 'utf-8');
    const organizations = JSON.parse(organizationsRaw);

    // Filter existing requests for this freelancer
    const existingRequests = requests.filter((r: any) => r.freelancerId === freelancerId);

    // Find targeted gig requests for this freelancer
    const targetedGigs = gigs.filter((gig: any) =>
      gig.isTargetedRequest && gig.targetFreelancerId === freelancerId
    );

    // Convert targeted gigs to request format
    const targetedRequests = targetedGigs.map((gig: any) => {
      const organization = organizations.find((org: any) => org.id === gig.organizationId);
      return {
        id: `targeted_${gig.id}`,
        gigId: gig.id,
        freelancerId: freelancerId,
        commissionerId: gig.commissionerId,
        title: gig.title,
        category: gig.category,
        subcategory: gig.subcategory,
        description: gig.description,
        hourlyRateMin: gig.hourlyRateMin,
        hourlyRateMax: gig.hourlyRateMax,
        deliveryTimeWeeks: gig.deliveryTimeWeeks,
        status: 'available', // Targeted requests start as available
        organizationName: organization?.name || 'Unknown Organization',
        organizationLogo: organization?.logo || '',
        isTargetedRequest: true,
        postedDate: gig.postedDate,
        lowerBudget: gig.lowerBudget,
        upperBudget: gig.upperBudget,
        tags: gig.tags,
        toolsRequired: gig.toolsRequired
      };
    });

    // Combine existing and targeted requests
    const allRequests = [...existingRequests, ...targetedRequests];

    const grouped = {
      available: [] as any[],
      pending: [] as any[],
      accepted: [] as any[],
      rejected: [] as any[],
      unknown: [] as any[],
    };

    for (const req of allRequests) {
      const status = (req.status || 'unknown').toLowerCase();

      if (status === 'available') {
        grouped.available.push(req);
      } else if (status === 'pending' || status === 'applied' || status === 'accepted') {
        grouped.pending.push(req);
      } else if (status === 'rejected') {
        grouped.rejected.push(req);
      } else {
        grouped.unknown.push(req);
      }
    }

    return NextResponse.json(grouped);
  } catch (error) {
    console.error('Error reading gig requests:', error);
    return NextResponse.json({ error: 'Failed to load requests' }, { status: 500 });
  }
}