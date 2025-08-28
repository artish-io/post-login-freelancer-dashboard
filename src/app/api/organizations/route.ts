import { NextResponse } from 'next/server';
import { getAllOrganizations, getOrganizationByCommissionerId } from '@/lib/storage/unified-storage-service';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const contactPersonId = searchParams.get('contactPersonId');

  try {
    if (contactPersonId) {
      // Find organization by contact person ID (now commissioner ID)
      const organization = await getOrganizationByCommissionerId(parseInt(contactPersonId));
      return NextResponse.json(organization);
    }

    // Return all organizations
    const organizations = await getAllOrganizations();
    return NextResponse.json(organizations);
  } catch (error) {
    console.error('Error reading organizations:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const organizationData = await req.json();

    // Read existing organizations using hierarchical storage
    const organizations = await getAllOrganizations();

    // Check if organization already exists for this contact person
    const existingOrgIndex = organizations.findIndex((org: any) =>
      org.contactPersonId === organizationData.contactPersonId
    );

    if (existingOrgIndex !== -1) {
      // Update existing organization
      organizations[existingOrgIndex] = {
        ...organizations[existingOrgIndex],
        ...organizationData,
      };
    } else {
      // Create new organization
      const newId = Math.max(...organizations.map((org: any) => org.id), 0) + 1;
      const newOrganization = {
        id: newId,
        ...organizationData,
      };
      organizations.push(newOrganization);
    }

    // Note: Individual organization updates should use writeOrganization()
    // This bulk update approach needs to be refactored for hierarchical storage

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating organization:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}