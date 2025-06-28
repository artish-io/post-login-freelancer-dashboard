// src/app/api/invoices/preview-meta/bill-to-details/email/[email]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';

const USERS_PATH = path.join(process.cwd(), 'data', 'users.json');
const ORGS_PATH = path.join(process.cwd(), 'data', 'organizations.json');

export async function GET(
  request: NextRequest
) {
  try {
    const emailParam = request.nextUrl.pathname.split('/').pop(); // gets the [email] segment
    const email = decodeURIComponent(emailParam ?? '').toLowerCase();

    const [usersRaw, orgsRaw] = await Promise.all([
      readFile(USERS_PATH, 'utf-8'),
      readFile(ORGS_PATH, 'utf-8'),
    ]);

    const users = JSON.parse(usersRaw);
    const organizations = JSON.parse(orgsRaw);

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