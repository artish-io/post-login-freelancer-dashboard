// File: /app/api/dashboard/contacts/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import path from 'path';
import { promises as fs } from 'fs';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const contactsFilePath = path.join(process.cwd(), 'data/contacts.json');
  const fileContent = await fs.readFile(contactsFilePath, 'utf8');
  const allContacts = JSON.parse(fileContent);

  const userEntry = allContacts.find((entry: any) => entry.userId === parseInt(session.user.id));

  if (!userEntry) {
    return NextResponse.json({ contacts: [] });
  }

  return NextResponse.json({ contacts: userEntry.contacts });
}