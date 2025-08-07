import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tab = searchParams.get('tab');
    const commissionerId = searchParams.get('commissionerId');
    const organizationId = searchParams.get('organizationId');

    if (!commissionerId || !organizationId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Read data files
    const [applicationsData, gigRequestsData, freelancersData, usersData, gigsData] = await Promise.all([
      readFile(path.join(process.cwd(), 'data/gigs/gig-applications.json'), 'utf-8').then(data => JSON.parse(data)),
      readFile(path.join(process.cwd(), 'data/gigs/gig-requests.json'), 'utf-8').then(data => JSON.parse(data)),
      readFile(path.join(process.cwd(), 'data/freelancers.json'), 'utf-8').then(data => JSON.parse(data)),
      readFile(path.join(process.cwd(), 'data/users.json'), 'utf-8').then(data => JSON.parse(data)),
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

    return NextResponse.json({
      data: filteredData,
      tab,
      count: filteredData.length
    });

  } catch (error) {
    console.error('Error fetching job listings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
