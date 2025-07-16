// scripts/migrate-to-encryption.js
// Script to mark existing messages as unencrypted

const fs = require('fs').promises;
const path = require('path');

async function migrateMessages() {
  try {
    const messagesPath = path.join(process.cwd(), 'data/messages.json');
    const data = await fs.readFile(messagesPath, 'utf-8');
    const messages = JSON.parse(data);

    // Add isEncrypted: false to all existing messages
    messages.forEach(thread => {
      thread.messages.forEach(message => {
        if (message.isEncrypted === undefined) {
          message.isEncrypted = false;
        }
      });
    });

    await fs.writeFile(messagesPath, JSON.stringify(messages, null, 2));
    console.log('✅ Successfully migrated existing messages to include encryption flag');
  } catch (error) {
    console.error('❌ Failed to migrate messages:', error);
  }
}

migrateMessages();
