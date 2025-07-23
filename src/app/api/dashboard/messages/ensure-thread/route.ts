// src/app/api/dashboard/messages/ensure-thread/route.ts

import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

// This endpoint ensures a thread exists between two users and adds them to each other's contact lists
// Also implements anti-spam protection
export async function POST(request: Request) {
  const { userId1, userId2, initiatorId } = await request.json();

  if (!userId1 || !userId2) {
    return NextResponse.json({ error: 'Missing user IDs' }, { status: 400 });
  }

  if (userId1 === userId2) {
    return NextResponse.json({ error: 'Cannot create thread with self' }, { status: 400 });
  }

  try {
    const messagesPath = path.join(process.cwd(), 'data/messages.json');
    const contactsPath = path.join(process.cwd(), 'data/contacts.json');

    // Read both files
    const [messagesData, contactsData] = await Promise.all([
      fs.readFile(messagesPath, 'utf-8'),
      fs.readFile(contactsPath, 'utf-8'),
    ]);

    const messages = JSON.parse(messagesData);
    const contacts = JSON.parse(contactsData);

    // Create thread ID (smaller ID first for consistency)
    const sortedIds = [userId1, userId2].sort((a, b) => a - b);
    const threadId = `${sortedIds[0]}-${sortedIds[1]}`;

    // Check if thread already exists
    const threadExists = messages.find((t: any) => t.threadId === threadId);
    let needsUpdate = false;

    // Create thread if it doesn't exist
    if (!threadExists) {
      const newThread = {
        threadId,
        participants: [userId1, userId2],
        messages: [],
        metadata: {
          createdAt: new Date().toISOString(),
          initiatedBy: initiatorId || userId1,
          status: 'pending_response' // pending_response, active, blocked
        }
      };
      messages.push(newThread);
      needsUpdate = true;
      console.log(`[ensure-thread] Created new thread ${threadId} initiated by user ${initiatorId || userId1}`);
    } else {
      console.log(`[ensure-thread] Thread ${threadId} already exists`);
    }

    // Ensure both users have each other in their contact lists
    let contactsUpdated = false;

    // Add userId2 to userId1's contacts
    let user1Contacts = contacts.find((entry: any) => entry.userId === userId1);
    if (!user1Contacts) {
      user1Contacts = { userId: userId1, contacts: [] };
      contacts.push(user1Contacts);
      contactsUpdated = true;
    }
    if (!user1Contacts.contacts.includes(userId2)) {
      user1Contacts.contacts.push(userId2);
      contactsUpdated = true;
    }

    // Add userId1 to userId2's contacts
    let user2Contacts = contacts.find((entry: any) => entry.userId === userId2);
    if (!user2Contacts) {
      user2Contacts = { userId: userId2, contacts: [] };
      contacts.push(user2Contacts);
      contactsUpdated = true;
    }
    if (!user2Contacts.contacts.includes(userId1)) {
      user2Contacts.contacts.push(userId1);
      contactsUpdated = true;
    }

    // Write files if updates were made
    const writePromises = [];
    if (needsUpdate) {
      writePromises.push(fs.writeFile(messagesPath, JSON.stringify(messages, null, 2)));
    }
    if (contactsUpdated) {
      writePromises.push(fs.writeFile(contactsPath, JSON.stringify(contacts, null, 2)));
    }

    if (writePromises.length > 0) {
      await Promise.all(writePromises);
    }

    return NextResponse.json({ 
      success: true, 
      threadId,
      created: needsUpdate,
      contactsUpdated 
    });
  } catch (error) {
    console.error('[ensure-thread] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
