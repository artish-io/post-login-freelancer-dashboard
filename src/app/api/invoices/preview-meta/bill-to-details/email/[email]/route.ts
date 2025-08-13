// src/app/api/invoices/preview-meta/bill-to-details/email/[email]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getAllUsers, getAllOrganizations } from '@/lib/storage/unified-storage-service';

export async function GET(
  request: NextRequest
) {
  try {
    const emailParam = request.nextUrl.pathname.split('/').pop(); // gets the [email] segment
    const email = decodeURIComponent(emailParam ?? '').toLowerCase();

    const [users, organizations] = await Promise.all([
      getAllUsers(),
      getAllOrganizations(),
    ]);

    const user = users.find((u: any) => u.email?.toLowerCase() === email);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const organization = organizations.find(
      (org: any) => org.id === user.organizationId
    );

    return NextResponse.json({
      name: user.name || '',
      email: user.email || '',
      avatar: user.image || null,
      address: user.address || '',
      organization: organization?.name || '',
      logo: organization?.logo || '',
    });
  } catch (err) {
    console.error('❌ Failed to fetch bill-to details by email:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}