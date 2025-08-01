import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

const filePath = path.join(process.cwd(), 'data', 'organizations.json');

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = fs.readFileSync(filePath, 'utf-8');
    const organizations = JSON.parse(data);

    const organization = organizations.find(
      (org: any) => String(org.id) === id
    );

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const enrichedOrganization = {
      ...organization,
      bio: organization.bio || 'No bio provided for this organization.',
    };

    return NextResponse.json(enrichedOrganization);
  } catch (error) {
    console.error('Failed to read organizations:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}