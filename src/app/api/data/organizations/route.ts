import { NextResponse } from 'next/server';
import { getAllOrganizations } from '@/lib/storage/unified-storage-service';

export async function GET() {
  try {
    const organizations = await getAllOrganizations();
    return NextResponse.json(organizations);
  } catch (error) {
    console.error('Error loading organizations:', error);
    return NextResponse.json({ error: 'Failed to load organizations' }, { status: 500 });
  }
}
