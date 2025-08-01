

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface ChatHistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

interface ChatSession {
  prompt: string;
  timestamp: string;
  userId: string;
  sessionId: string;
}

export default function ChatHistoryPanel({ isOpen, onClose, userId }: ChatHistoryPanelProps) {
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const router = useRouter();

  const handleDeleteChat = async (sessionId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent navigation when clicking delete

    try {
      // Optimistically remove from UI using the correct sessionId
      setChatSessions(prev => prev.filter(session => session.sessionId !== sessionId));

      // Make API call to delete using correct DELETE method and sessionId parameter
      const response = await fetch('/api/app/chat-history/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, sessionId })
      });

      if (!response.ok) {
        throw new Error(`Delete failed: ${response.status} ${response.statusText}`);
      }

      console.log('✅ Chat session deleted successfully');
    } catch (error) {
      console.error('Failed to delete chat:', error);
      // Revert optimistic update on error
      const fetchHistory = async () => {
        try {
          const res = await fetch(`/api/app/chat-history?userId=${userId}`);
          if (res.ok) {
            const sessions = await res.json();
            setChatSessions(Array.isArray(sessions) ? sessions : []);
          }
        } catch (err) {
          console.error('Failed to revert chat history:', err);
        }
      };
      fetchHistory();
    }
  };

  useEffect(() => {
    const fetchHistory = async () => {
      if (!userId) {
        console.warn('No userId provided for chat history fetch');
        setChatSessions([]);
        return;
      }

      try {
        const res = await fetch(`/api/app/chat-history?userId=${userId}`);
        if (!res.ok) {
          throw new Error(`Failed to fetch chat history: ${res.status} ${res.statusText}`);
        }
        const sessions = await res.json();
        setChatSessions(Array.isArray(sessions) ? sessions : []);
      } catch (err) {
        console.error('Failed to load chat history from API:', err);
        setChatSessions([]); // Fallback to empty array to prevent UI crashes
      }
    };

    if (isOpen && userId) {
      fetchHistory();
    }

    // Listen for new chat sessions
    const handleNewChatSession = () => {
      if (isOpen && userId) {
        fetchHistory();
      }
    };

    window.addEventListener('newChatSession', handleNewChatSession);
    return () => {
      window.removeEventListener('newChatSession', handleNewChatSession);
    };
  }, [userId, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed top-0 left-0 w-full h-full bg-black/40 backdrop-blur-sm z-50" onClick={onClose}>
      <div
        className="absolute top-20 left-4 max-w-sm w-full bg-white shadow-xl rounded-xl p-4 z-50"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h3
            className="text-lg font-bold text-gray-900"
            style={{ fontFamily: 'Plus Jakarta Sans' }}
          >
            Chat History
          </h3>
          <button
            onClick={onClose}
            className="text-sm text-gray-600 hover:text-black font-medium px-3 py-1 rounded-lg hover:bg-gray-100 transition-colors"
            style={{ fontFamily: 'Plus Jakarta Sans' }}
          >
            Close
          </button>
        </div>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {chatSessions.length === 0 && (
            <p
              className="text-sm text-gray-500 text-center py-8"
              style={{ fontFamily: 'Plus Jakarta Sans' }}
            >
              No previous chats yet.
            </p>
          )}
          {chatSessions.map((session, idx) => (
            <div
              key={idx}
              className="border border-gray-200 p-4 rounded-xl hover:bg-gray-50 transition-all shadow-sm hover:shadow-md"
            >
              <div className="flex justify-between items-start">
                <button
                  onClick={() => {
                    router.push(`/app/worksheet?prompt=${encodeURIComponent(session.prompt)}`);
                    onClose();
                  }}
                  className="flex-1 text-left"
                  style={{ fontFamily: 'Plus Jakarta Sans' }}
                >
                  <div className="text-sm font-medium truncate text-gray-900">
                    {session.prompt.slice(0, 60) || 'Untitled Prompt'}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    {session.timestamp ?
                      new Date(session.timestamp).toLocaleString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        month: 'short',
                        day: 'numeric'
                      }) : '-'
                    }
                  </div>
                </button>
                <button
                  onClick={(e) => handleDeleteChat(session.sessionId, e)}
                  className="text-xs text-red-500 hover:underline flex-shrink-0 ml-2"
                  style={{ fontFamily: 'Plus Jakarta Sans' }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}