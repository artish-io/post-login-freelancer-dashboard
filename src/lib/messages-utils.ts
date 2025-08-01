// src/lib/messages-utils.ts
import fs from 'fs';
import path from 'path';
import { promises as fsPromises } from 'fs';

export interface Message {
  messageId?: string;
  senderId: number;
  timestamp: string;
  text: string;
  read: { [userId: string]: boolean };
  isEncrypted?: boolean;
}

export interface Thread {
  threadId: string;
  participants: number[];
  messages: Message[];
  metadata?: {
    createdAt: string;
    initiatedBy: number;
    status: string;
  };
}

export interface MessageLocation {
  year: string;
  month: string;
  day: string;
  threadId: string;
  messageId: string;
}

/**
 * Parse timestamp and return date components
 */
export function parseMessageDate(timestamp: string): { year: string; month: string; day: string } {
  const date = new Date(timestamp);
  return {
    year: date.getFullYear().toString(),
    month: String(date.getMonth() + 1).padStart(2, '0'),
    day: String(date.getDate()).padStart(2, '0')
  };
}

/**
 * Generate message file path based on timestamp and IDs
 */
export function getMessageFilePath(timestamp: string, threadId: string, messageId: string): string {
  const { year, month, day } = parseMessageDate(timestamp);
  return path.join(
    process.cwd(),
    'data',
    'messages',
    year,
    month,
    day,
    threadId,
    messageId,
    'message.json'
  );
}

/**
 * Generate thread metadata file path
 */
export function getThreadMetadataPath(threadId: string): string {
  return path.join(process.cwd(), 'data', 'messages', 'threads', `${threadId}.json`);
}

/**
 * Ensure directory exists
 */
export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fsPromises.mkdir(dirPath, { recursive: true });
  } catch (error) {
    // Directory might already exist, ignore error
  }
}

/**
 * Generate unique message ID
 */
export function generateMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Save a single message to hierarchical structure
 */
export async function saveMessage(message: Message, threadId: string): Promise<void> {
  const messageId = message.messageId || generateMessageId();
  const filePath = getMessageFilePath(message.timestamp, threadId, messageId);
  const dirPath = path.dirname(filePath);
  
  await ensureDirectoryExists(dirPath);
  
  const messageData = {
    ...message,
    messageId,
    threadId
  };
  
  await fsPromises.writeFile(filePath, JSON.stringify(messageData, null, 2));
}

/**
 * Read all messages for a thread from hierarchical structure
 */
export async function readThreadMessages(threadId: string): Promise<Message[]> {
  const messages: Message[] = [];
  const messagesBasePath = path.join(process.cwd(), 'data', 'messages');
  
  try {
    // Check if hierarchical structure exists
    if (!fs.existsSync(messagesBasePath)) {
      return [];
    }
    
    // Walk through year/month/day directories
    const years = await fsPromises.readdir(messagesBasePath, { withFileTypes: true });
    
    for (const yearDir of years) {
      if (!yearDir.isDirectory() || yearDir.name === 'threads') continue;
      
      const yearPath = path.join(messagesBasePath, yearDir.name);
      const months = await fsPromises.readdir(yearPath, { withFileTypes: true });
      
      for (const monthDir of months) {
        if (!monthDir.isDirectory()) continue;
        
        const monthPath = path.join(yearPath, monthDir.name);
        const days = await fsPromises.readdir(monthPath, { withFileTypes: true });
        
        for (const dayDir of days) {
          if (!dayDir.isDirectory()) continue;
          
          const dayPath = path.join(monthPath, dayDir.name);
          const threadPath = path.join(dayPath, threadId);
          
          if (fs.existsSync(threadPath)) {
            const messageIds = await fsPromises.readdir(threadPath, { withFileTypes: true });
            
            for (const messageIdDir of messageIds) {
              if (!messageIdDir.isDirectory()) continue;
              
              const messagePath = path.join(threadPath, messageIdDir.name, 'message.json');
              if (fs.existsSync(messagePath)) {
                try {
                  const messageData = await fsPromises.readFile(messagePath, 'utf-8');
                  // Skip empty files
                  if (!messageData.trim()) {
                    console.warn(`Skipping empty message file: ${messagePath}`);
                    continue;
                  }
                  const message = JSON.parse(messageData);
                  messages.push(message);
                } catch (error) {
                  console.error(`Error reading message ${messagePath}:`, error);
                }
              }
            }
          }
        }
      }
    }
    
    // Sort messages by timestamp
    return messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  } catch (error) {
    console.error(`Error reading thread messages for ${threadId}:`, error);
    return [];
  }
}

/**
 * Save thread metadata
 */
export async function saveThreadMetadata(thread: Thread): Promise<void> {
  const metadataPath = getThreadMetadataPath(thread.threadId);
  const dirPath = path.dirname(metadataPath);

  await ensureDirectoryExists(dirPath);

  const threadData = {
    threadId: thread.threadId,
    participants: thread.participants,
    metadata: thread.metadata
  };

  await fsPromises.writeFile(metadataPath, JSON.stringify(threadData, null, 2));
}

/**
 * Read thread metadata
 */
export async function readThreadMetadata(threadId: string): Promise<Thread | null> {
  const metadataPath = getThreadMetadataPath(threadId);

  try {
    if (!fs.existsSync(metadataPath)) {
      return null;
    }

    const data = await fsPromises.readFile(metadataPath, 'utf-8');
    const threadData = JSON.parse(data);

    return {
      ...threadData,
      messages: [] // Messages are loaded separately
    };
  } catch (error) {
    console.error(`Error reading thread metadata for ${threadId}:`, error);
    return null;
  }
}

/**
 * Get all thread IDs from metadata directory
 */
export async function getAllThreadIds(): Promise<string[]> {
  const threadsPath = path.join(process.cwd(), 'data', 'messages', 'threads');

  try {
    if (!fs.existsSync(threadsPath)) {
      return [];
    }

    const files = await fsPromises.readdir(threadsPath);
    return files
      .filter(file => file.endsWith('.json'))
      .map(file => file.replace('.json', ''));
  } catch (error) {
    console.error('Error reading thread IDs:', error);
    return [];
  }
}

/**
 * Read all threads with their messages
 */
export async function readAllThreads(): Promise<Thread[]> {
  const threadIds = await getAllThreadIds();
  const threads: Thread[] = [];

  for (const threadId of threadIds) {
    const metadata = await readThreadMetadata(threadId);
    if (metadata) {
      const messages = await readThreadMessages(threadId);
      threads.push({
        ...metadata,
        messages
      });
    }
  }

  return threads;
}

/**
 * Update message read status
 */
export async function updateMessageReadStatus(
  timestamp: string,
  threadId: string,
  messageId: string,
  userId: string,
  isRead: boolean
): Promise<void> {
  const filePath = getMessageFilePath(timestamp, threadId, messageId);

  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Message file not found: ${filePath}`);
    }

    const data = await fsPromises.readFile(filePath, 'utf-8');
    const message = JSON.parse(data);

    message.read = message.read || {};
    message.read[userId] = isRead;

    await fsPromises.writeFile(filePath, JSON.stringify(message, null, 2));
  } catch (error) {
    console.error(`Error updating read status for message ${messageId}:`, error);
    throw error;
  }
}

/**
 * Count unread messages for a user across all threads
 */
export async function countUnreadMessages(userId: string): Promise<number> {
  const threadIds = await getAllThreadIds();
  let unreadCount = 0;

  for (const threadId of threadIds) {
    const metadata = await readThreadMetadata(threadId);
    if (metadata && metadata.participants.includes(Number(userId))) {
      const messages = await readThreadMessages(threadId);

      for (const message of messages) {
        // Only count as unread if:
        // 1. message.read[currentUserId] === false
        // 2. The message recipientId === currentUserId (user is the recipient, not sender)
        const isUnreadForUser = message.read?.[userId] === false;
        const isRecipient = message.senderId !== Number(userId); // If user didn't send it, they're the recipient

        if (isUnreadForUser && isRecipient) {
          unreadCount++;
        }
      }
    }
  }

  return unreadCount;
}

// Migration functions removed - no longer needed since migration is complete

/**
 * Get messages with preview data for a user (for contact list)
 */
export async function getMessagesPreview(userId: number): Promise<any[]> {
  const threadIds = await getAllThreadIds();
  const previews: any[] = [];

  for (const threadId of threadIds) {
    const metadata = await readThreadMetadata(threadId);
    if (metadata && metadata.participants.includes(userId)) {
      const messages = await readThreadMessages(threadId);

      // Only include threads with messages to prevent ghost threads
      if (messages.length > 0) {
        const lastMessage = messages[messages.length - 1];

        // Fix unread count calculation: only count messages where user is recipient and read status is false
        const unreadCount = messages.filter(msg => {
          const isUnreadForUser = msg.read?.[userId.toString()] === false;
          const isRecipient = msg.senderId !== userId; // If user didn't send it, they're the recipient
          return isUnreadForUser && isRecipient;
        }).length;

        previews.push({
          threadId,
          participants: metadata.participants,
          lastMessage: {
            text: lastMessage.text,
            timestamp: lastMessage.timestamp,
            senderId: lastMessage.senderId
          },
          unreadCount,
          metadata: metadata.metadata
        });
      }
    }
  }

  return previews;
}
