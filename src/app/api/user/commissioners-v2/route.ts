// src/app/api/user/commissioners-v2/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  console.log('[commissioners-v2] Starting to fetch commissioners data...');
  try {
    // Use hierarchical storage instead of direct file access
    console.log('[commissioners-v2] Importing getAllUsers from unified storage...');
    const { getAllUsers } = await import('@/lib/storage/unified-storage-service');
    const users = await getAllUsers();
    console.log('[commissioners-v2] Got users:', users.length);
    
    // Use the organizations API endpoint to avoid direct file access
    console.log('[commissioners-v2] Fetching organizations from API...');
    const orgsResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/organizations`);
    if (!orgsResponse.ok) {
      throw new Error(`Failed to fetch organizations: ${orgsResponse.status}`);
    }
    const organizations = await orgsResponse.json();
    console.log('[commissioners-v2] Got organizations:', organizations.length);

    const commissioners = users
      .filter((user: any) => user.type === 'commissioner')
      .map((user: any) => {
        const org = organizations.find((o: any) => o.id === user.organizationId);

        return {
          ...user,
          organization: org
            ? {
                name: org.name,
                logo: org.logo,
                address: org.address,
              }
            : null,
        };
      });

    console.log('[commissioners-v2] Returning commissioners:', commissioners.length);
    return NextResponse.json(commissioners);
  } catch (error) {
    console.error('[commissioners-v2] Error fetching enriched commissioners:', error);
    return NextResponse.json({ error: 'Failed to load commissioners' }, { status: 500 });
  }
}
