// src/app/api/user/commissioners/route.ts
import { NextResponse } from 'next/server';
import { getAllUsers, getAllOrganizations } from '@/lib/storage/unified-storage-service';

export async function GET() {
  try {
    const [users, organizations] = await Promise.all([
      getAllUsers(), // Use hierarchical storage
      getAllOrganizations(), // Use hierarchical storage
    ]);

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

    return NextResponse.json(commissioners);
  } catch (error) {
    console.error('Error fetching enriched commissioners:', error);
    return NextResponse.json({ error: 'Failed to load commissioners' }, { status: 500 });
  }
}