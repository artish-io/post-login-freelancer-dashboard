export interface ContactThread {
  id: string;
  messages: {
    id: string;
    senderId: number;
    recipientId: number;
    timestamp: string;
    content: string;
    read: Record<number, boolean>;
  }[];
  latestMessage: {
    id: string;
    senderId: number;
    recipientId: number;
    timestamp: string;
    content: string;
    read: Record<number, boolean>;
  };
}

export function sortThreadsByRecentMessage(threads: ContactThread[]): ContactThread[] {
  return [...threads].sort((a, b) =>
    new Date(b.latestMessage.timestamp).getTime() - new Date(a.latestMessage.timestamp).getTime()
  );
}

export function filterValidThreads(threads: ContactThread[]): ContactThread[] {
  return threads.filter(thread => thread.messages && thread.messages.length > 0);
}
