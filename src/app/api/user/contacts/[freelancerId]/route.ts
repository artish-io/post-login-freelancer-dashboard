import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

export async function GET(
  _request: Request,
  context: { params: Promise<{ freelancerId: string }> }
) {
  try {
    const { freelancerId } = await context.params;
    const freelancerIdNum = Number(freelancerId);

    const contactsPath = path.join(process.cwd(), 'data', 'contacts.json');
    const usersPath = path.join(process.cwd(), 'data', 'users.json');

    const [contactsRaw, usersRaw] = await Promise.all([
      readFile(contactsPath, 'utf-8'),
      readFile(usersPath, 'utf-8'),
    ]);

    const contactMap = JSON.parse(contactsRaw);
    const allUsers = JSON.parse(usersRaw);

    // Get contact ID list for this freelancer
    const entry = contactMap.find((item: any) => item.userId === freelancerIdNum);
    if (!entry || !entry.contacts) {
      return NextResponse.json({ contacts: [] });
    }

    const contactIds: number[] = entry.contacts;

    // Match full user records
    const matchedContacts = allUsers.filter((user: any) =>
      contactIds.includes(user.id)
    );

    return NextResponse.json({ contacts: matchedContacts });
  } catch (error) {
    console.error('Failed to fetch contacts:', error);
    return NextResponse.json({ error: 'Unable to load contacts' }, { status: 500 });
  }
}