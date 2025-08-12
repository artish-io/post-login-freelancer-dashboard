// src/app/api/invoices/preview-meta/bill-to-details/[userId]/route.ts

import { NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';

const USERS_PATH = path.join(process.cwd(), 'data', 'users.json');
const ORGS_PATH = path.join(process.cwd(), 'data', 'organizations.json');

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

    const [usersRaw, orgsRaw] = await Promise.all([
      readFile(USERS_PATH, 'utf-8'),
      readFile(ORGS_PATH, 'utf-8'),
    ]);

    const users = JSON.parse(usersRaw);
    const organizations = JSON.parse(orgsRaw);

    const user = users.find((u: any) => u.id === userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const organization = organizations.find(
      (org: any) => org.id === user.organizationId
    );

    const fullBillTo = {
      id: user.id, // Include user ID for commissioner identification
      name: user.name || '',
      email: user.email || '',
      avatar: user.avatar || '/default-avatar.png',
      address: user.address || '',
      organization: organization?.name || '',
      logo: organization?.logo || '', // Add logo field for consistency
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