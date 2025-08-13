// src/app/api/invoices/preview-meta/bill-to-details/[userId]/route.ts

import { NextResponse } from 'next/server';
import { getAllUsers, getAllOrganizations } from '@/lib/storage/unified-storage-service';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: userIdParam } = await params;
    const userId = parseInt(userIdParam);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid userId' }, { status: 400 });
    }

    const [users, organizations] = await Promise.all([
      getAllUsers(),
      getAllOrganizations(),
    ]);

    const user = users.find((u: any) => u.id === userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const organization = organizations.find(
      (org: any) => org.id === user.organizationId
    );

    const fullBillTo = {
      name: user.name || '',
      email: user.email || '',
      avatar: user.avatar || '/default-avatar.png',
      address: user.address || '',
      organization: organization?.name || '',
    };

    return NextResponse.json(fullBillTo);
  } catch (error) {
    console.error('Failed to fetch bill-to details:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}