

import { NextResponse } from 'next/server';
import { readGig } from '../../../../../lib/gigs/hierarchical-storage';
import { getAllOrganizations, getAllUsers } from '@/lib/storage/unified-storage-service';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const gigId = Number(id);

  try {
    const [orgs, users] = await Promise.all([
      getAllOrganizations(),
      getAllUsers(),
    ]);

    const gig = await readGig(gigId);
    if (!gig) {
      return NextResponse.json({ error: 'Gig not found' }, { status: 404 });
    }

    const organization = orgs.find((o: any) => o.id === gig.organizationId);
    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 500 });
    }

    const contactPerson = users.find((u: any) => u.id === organization.contactPersonId);

    const hydratedGig = {
      ...gig,
      organization: {
        id: organization.id,
        name: organization.name,
        logo: organization.logo,
        address: organization.address,
        contactPerson: contactPerson
          ? {
              id: contactPerson.id,
              name: contactPerson.name,
              title: contactPerson.title,
              email: contactPerson.email,
              avatar: contactPerson.avatar,
            }
          : null,
      },
    };

    return NextResponse.json(hydratedGig);
  } catch (error) {
    console.error('Error hydrating gig:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}