import { NextResponse } from 'next/server';
import { getAllUsers } from '@/lib/storage/unified-storage-service';
import { readFile } from 'fs/promises';
import path from 'path';

export async function GET(
  _request: Request,
  context: { params: Promise<{ freelancerId: string }> }
) {
  try {
    const { freelancerId } = await context.params;
    const freelancerIdNum = Number(freelancerId);

    console.log('🔍 [Contacts API] Fetching contacts for freelancerId:', freelancerIdNum);

    const contactsPath = path.join(process.cwd(), 'data', 'contacts.json');

    console.log('📁 [Contacts API] Contacts path:', contactsPath);

    const [contactsRaw, allUsers] = await Promise.all([
      readFile(contactsPath, 'utf-8').catch(err => {
        console.error('❌ [Contacts API] Failed to read contacts.json:', err);
        throw err;
      }),
      getAllUsers().catch(err => {
        console.error('❌ [Contacts API] Failed to get users from unified storage:', err);
        throw err;
      }),
    ]);

    let contactMap;
    try {
      contactMap = JSON.parse(contactsRaw);
      console.log('✅ [Contacts API] Parsed contacts.json successfully');
    } catch (err) {
      console.error('❌ [Contacts API] Failed to parse contacts.json:', err);
      throw err;
    }

    console.log('✅ [Contacts API] Got users from unified storage successfully');

    console.log('📋 [Contacts API] Total contact entries:', contactMap.length);
    console.log('👥 [Contacts API] Total users:', allUsers.length);

    // Get contact ID list for this freelancer
    const entry = contactMap.find((item: any) => item.userId === freelancerIdNum);
    console.log('🎯 [Contacts API] Found entry for user:', entry);

    if (!entry || !entry.contacts) {
      console.log('❌ [Contacts API] No contacts found for user:', freelancerIdNum);
      return NextResponse.json({ contacts: [] });
    }

    const contactIds: number[] = entry.contacts;
    console.log('📝 [Contacts API] Contact IDs:', contactIds);

    // Match full user records
    const matchedContacts = allUsers.filter((user: any) =>
      contactIds.includes(user.id)
    );

    console.log('✅ [Contacts API] Matched contacts:', matchedContacts.length);
    console.log('📧 [Contacts API] Contact emails:', matchedContacts.map(c => c.email));

    return NextResponse.json({ contacts: matchedContacts });
  } catch (error) {
    console.error('❌ [Contacts API] Failed to fetch contacts:', error);
    return NextResponse.json({ error: 'Unable to load contacts' }, { status: 500 });
  }
}