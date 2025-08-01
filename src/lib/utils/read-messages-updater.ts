import fs from 'fs';
import path from 'path';

/**
 * Marks a message as read by a specific user.
 * 
 * @param threadPath - Path relative to /data/messages to the target message file.
 * Example: "2025/07/31/31-34/msg-1753972509917-p2vkldnhg/message.json"
 * @param userId - ID of the user who read the message.
 */
export async function markMessagesAsRead(threadPath: string, userId: number): Promise<void> {
  try {
    const fullPath = path.join(process.cwd(), 'data', 'messages', threadPath);
    const fileData = fs.readFileSync(fullPath, 'utf-8');
    if (!fileData.trim()) {
      console.warn(`Message file at ${fullPath} is empty or invalid.`);
      return;
    }
    const message = JSON.parse(fileData);

    if (!message.read) {
      message.read = {};
    }

    if (!message.read[userId]) {
      message.read[userId] = true;
      fs.writeFileSync(fullPath, JSON.stringify(message, null, 2), 'utf-8');
    }
  } catch (error) {
    console.error('Failed to mark message as read:', error);
  }
}