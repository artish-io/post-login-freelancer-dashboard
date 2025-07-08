'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

type Contact = {
  id: number;
  name: string;
  title: string;
  avatar: string;
};

type ContactSearchModalProps = {
  onSelect: (recipientId: number) => void;
  disabled?: boolean; // ✅ Now supported
};

export default function ContactSearchModal({ onSelect, disabled }: ContactSearchModalProps) {
  const [query, setQuery] = useState('');
  const [filtered, setFiltered] = useState<Contact[]>([]);
  const [allUsers, setAllUsers] = useState<Contact[]>([]);

  // Fetch users on component mount
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch('/api/users');
        const users = await res.json();
        setAllUsers(users);
      } catch (error) {
        console.error('Failed to fetch users:', error);
      }
    };
    fetchUsers();
  }, []);

  // Filter users based on query
  useEffect(() => {
    const q = query.toLowerCase();
    const result = allUsers.filter(
      (user: Contact) =>
        user.name.toLowerCase().includes(q) || user.title.toLowerCase().includes(q)
    );
    setFiltered(result);
  }, [query, allUsers]);

  return (
    <div className="p-4">
      <div className="mb-3 relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search contacts"
          className="w-full px-4 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
        />
      </div>

      <div className="space-y-2">
        {filtered.map((user) => (
          <button
            key={user.id}
            onClick={() => !disabled && onSelect(user.id)}
            disabled={disabled}
            className={`w-full text-left flex items-center justify-between px-3 py-2 rounded-lg ${
              disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-pink-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <Image
                src={user.avatar}
                alt={user.name}
                width={36}
                height={36}
                className="rounded-full object-cover"
              />
              <div>
                <p className="text-sm font-medium text-gray-800">{user.name}</p>
                <p className="text-xs text-gray-500">{user.title}</p>
              </div>
            </div>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-gray-400 text-center mt-4">No matching contacts.</p>
        )}
      </div>
    </div>
  );
}