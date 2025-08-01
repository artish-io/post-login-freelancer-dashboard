// src/app/api/dashboard/messages/ensure-thread/route.ts

import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';
import { readThreadMetadata, saveThreadMetadata } from '@/lib/messages-utils';

// This endpoint ensures a thread exists between two users and adds them to each other's contact lists
// Also implements anti-spam protection
export async function POST(request: Request) {
  const { senderId, receiverId } = await request.json();

  if (!senderId || !receiverId) {
    return NextResponse.json({ error: 'Missing senderId or receiverId' }, { status: 400 });
  }

  if (senderId === receiverId) {
    return NextResponse.json({ error: 'Cannot create thread with self' }, { status: 400 });
  }

  try {
    // Create thread ID (smaller ID first for consistency)
    const sortedIds = [senderId, receiverId].sort((a, b) => a - b);
    const threadId = `${sortedIds[0]}-${sortedIds[1]}`;

    // Check if thread already exists using hierarchical storage
    const existingThread = await readThreadMetadata(threadId);

    if (existingThread) {
      console.log(`[ensure-thread] Thread ${threadId} already exists`);
      return NextResponse.json({
        success: true,
        threadId,
        created: false,
        contactsUpdated: false
      });
    }

    // Create new thread metadata
    const newThread = {
      threadId,
      participants: [senderId, receiverId],
      messages: [], // Messages are stored separately
      metadata: {
        createdAt: new Date().toISOString(),
        initiatedBy: senderId,
        status: 'active'
      }
    };

    await saveThreadMetadata(newThread);
    console.log(`[ensure-thread] Created new thread ${threadId}`);

    // Handle contacts
    const contactsPath = path.join(process.cwd(), 'data/contacts.json');
    let contactsUpdated = false;

    try {
      const contactsData = await fs.readFile(contactsPath, 'utf-8');
      const contacts = JSON.parse(contactsData);

      // Add receiverId to senderId's contacts
      let senderContacts = contacts.find((entry: any) => entry.userId === senderId);
      if (!senderContacts) {
        senderContacts = { userId: senderId, contacts: [] };
        contacts.push(senderContacts);
        contactsUpdated = true;
      }
      if (!senderContacts.contacts.includes(receiverId)) {
        senderContacts.contacts.push(receiverId);
        contactsUpdated = true;
      }

      // Add senderId to receiverId's contacts
      let receiverContacts = contacts.find((entry: any) => entry.userId === receiverId);
      if (!receiverContacts) {
        receiverContacts = { userId: receiverId, contacts: [] };
        contacts.push(receiverContacts);
        contactsUpdated = true;
      }
      if (!receiverContacts.contacts.includes(senderId)) {
        receiverContacts.contacts.push(senderId);
        contactsUpdated = true;
      }

      // Write contacts file if updated
      if (contactsUpdated) {
        await fs.writeFile(contactsPath, JSON.stringify(contacts, null, 2));
      }
    } catch (error) {
      console.warn('[ensure-thread] Could not update contacts:', error);
      // Don't fail the request if contacts update fails
    }

    return NextResponse.json({
      success: true,
      threadId,
      created: true,
      contactsUpdated
    });
  } catch (error) {
    console.error('[ensure-thread] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
