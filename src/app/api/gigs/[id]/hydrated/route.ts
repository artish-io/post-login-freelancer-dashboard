

import { NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';

const GIGS_PATH = path.join(process.cwd(), 'data', 'gigs.json');
const ORGS_PATH = path.join(process.cwd(), 'data', 'organizations.json');
const USERS_PATH = path.join(process.cwd(), 'data', 'users.json');

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const gigId = Number(id);

  try {
    const [gigsRaw, orgsRaw, usersRaw] = await Promise.all([
      readFile(GIGS_PATH, 'utf-8'),
      readFile(ORGS_PATH, 'utf-8'),
      readFile(USERS_PATH, 'utf-8'),
    ]);

    const gigs = JSON.parse(gigsRaw);
    const orgs = JSON.parse(orgsRaw);
    const users = JSON.parse(usersRaw);

    const gig = gigs.find((g: any) => g.id === gigId);
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