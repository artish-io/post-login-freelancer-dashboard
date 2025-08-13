import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { ok, err, ErrorCodes, withErrorHandling } from '@/lib/http/envelope';

async function handleJobListings(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const tab = searchParams.get('tab');
    const commissionerId = searchParams.get('commissionerId');
    const organizationId = searchParams.get('organizationId');

    if (!commissionerId || !organizationId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Import hierarchical storage
    const { readAllGigApplications } = await import('@/lib/gigs/gig-applications-storage');

    // Import hierarchical storage for users
    const { getAllUsers } = await import('@/lib/storage/unified-storage-service');

    // Read data files
    const [applicationsData, gigRequestsData, freelancersData, usersData, gigsData] = await Promise.all([
      readAllGigApplications(),
      readFile(path.join(process.cwd(), 'data/gigs/gig-requests.json'), 'utf-8').then(data => JSON.parse(data)),
      import('@/lib/storage/unified-storage-service').then(m => m.getAllFreelancers()),
      getAllUsers(), // Use hierarchical storage
      readFile(path.join(process.cwd(), 'data/gigs/2025/July/05/1/gig.json'), 'utf-8').then(data => JSON.parse(data)).catch(() => null)
    ]);

    // Filter applications by organization
    const organizationApplications = applicationsData.filter((app: any) => {
      // This would need to be enhanced to check gig organization
      return true; // Simplified for now
    });

    // Filter gig requests by commissioner
    const commissionerGigRequests = gigRequestsData.filter((req: any) => 
      req.commissionerId === parseInt(commissionerId) && req.organizationId === parseInt(organizationId)
    );

    // Combine and filter based on tab
    let filteredData = [];

    switch (tab) {
      case 'all':
        filteredData = [...organizationApplications, ...commissionerGigRequests];
        break;
      case 'gig-listings':
        filteredData = organizationApplications.filter((app: any) => 
          !app.status || app.status === 'pending'
        );
        break;
      case 'gig-requests':
        filteredData = commissionerGigRequests.filter((req: any) => 
          !req.status || req.status === 'pending' || req.status === 'Pending' || req.status === 'Available'
        );
        break;
      case 'matched-listings':
        filteredData = organizationApplications.filter((app: any) => 
          app.status === 'accepted'
        );
        break;
      case 'rejected-listings':
        filteredData = organizationApplications.filter((app: any) => 
          app.status === 'rejected'
        );
        break;
      case 'accepted-requests':
        filteredData = commissionerGigRequests.filter((req: any) => 
          req.status === 'accepted' || req.status === 'Accepted'
        );
        break;
      case 'rejected-requests':
        filteredData = commissionerGigRequests.filter((req: any) => 
          req.status === 'rejected' || req.status === 'Rejected'
        );
        break;
      default:
        filteredData = [...organizationApplications, ...commissionerGigRequests];
    }

    return NextResponse.json(
      ok({
        entities: {
          jobListings: filteredData,
          metadata: {
            tab,
            count: filteredData.length
          }
        },
        message: 'Job listings retrieved successfully'
      })
    );
}

// Wrap the handler with error handling
export const GET = withErrorHandling(handleJobListings);
