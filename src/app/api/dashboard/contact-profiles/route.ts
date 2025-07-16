// src/app/api/dashboard/contact-profiles/route.ts

import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userIdParam = searchParams.get('userId');

  // NOTE TO DEV TEAM:
  // This endpoint expects a `userId` query param passed from the client
  // using `useSession()` to fetch the logged-in user's ID.
  // This is a dev-friendly workaround while server-side session isn't fully reliable.
  // In production, secure this via `getServerSession()` or auth tokens.
  
  if (!userIdParam) {
    console.warn('[contact-profiles] Missing userId query param');
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  const userId = Number(userIdParam);

  try {
    const usersFile = path.join(process.cwd(), 'data/users.json');
    const contactsFile = path.join(process.cwd(), 'data/contacts.json');

    const [usersData, contactsData] = await Promise.all([
      fs.readFile(usersFile, 'utf-8'),
      fs.readFile(contactsFile, 'utf-8'),
    ]);

    const users = JSON.parse(usersData);
    const contacts = JSON.parse(contactsData);

    // Find user's contacts (works for both freelancers and commissioners)
    const userContacts = contacts.find((entry: any) => entry.userId === userId);

    if (!userContacts) {
      return NextResponse.json([], { status: 200 });
    }

    // Return contact profiles from users.json
    const contactProfiles = users.filter((user: any) =>
      userContacts.contacts.includes(user.id)
    );

    return NextResponse.json(contactProfiles, { status: 200 });
  } catch (error) {
    console.error('[contact-profiles] Error loading data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}