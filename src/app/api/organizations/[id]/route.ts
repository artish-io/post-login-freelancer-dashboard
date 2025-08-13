import { NextResponse } from 'next/server';
import { getOrganizationById } from '@/lib/storage/unified-storage-service';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const organization = await getOrganizationById(parseInt(id));

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