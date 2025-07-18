import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

const filePath = path.join(process.cwd(), 'data', 'organizations.json');

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const contactPersonId = searchParams.get('contactPersonId');

  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    const organizations = JSON.parse(data);

    if (contactPersonId) {
      // Find organization by contact person ID
      const organization = organizations.find((org: any) =>
        org.contactPersonId === parseInt(contactPersonId)
      );

      if (organization) {
        return NextResponse.json(organization);
      } else {
        return NextResponse.json(null);
      }
    }

    return NextResponse.json(organizations);
  } catch (error) {
    console.error('Error reading organizations:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const organizationData = await req.json();

    // Read existing organizations
    const data = fs.readFileSync(filePath, 'utf-8');
    const organizations = JSON.parse(data);

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

    // Write back to file
    fs.writeFileSync(filePath, JSON.stringify(organizations, null, 2));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating organization:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}