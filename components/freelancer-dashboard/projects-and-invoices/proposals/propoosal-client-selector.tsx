'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

type Contact = {
  id: number;
  name: string;
  email: string;
  title?: string;
  avatar?: string;
  type: string;
  organization?: {
    name: string;
    logo?: string;
    address?: string;
  };
};

type Props = {
  selectedContact: Contact | { email: string } | null;
  onSelect: (contact: Contact | { email: string }) => void;
};

export default function ProposalClientSelector({ selectedContact, onSelect }: Props) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const res = await fetch('/api/user/commissioners');
        const data = await res.json();
        setContacts(data);
      } catch (err) {
        console.error('Failed to load contacts', err);
      }
    };
    fetchContacts();
  }, []);

  const filtered = contacts.filter((contact) => {
    const q = query.toLowerCase();
    return (
      contact.name.toLowerCase().includes(q) ||
      contact.email.toLowerCase().includes(q) ||
      contact.organization?.name.toLowerCase().includes(q)
    );
  });

  const isEmail = (text: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text.trim());

  const handleSelect = (contact: Contact | { email: string }) => {
    onSelect(contact);
    if ('name' in contact) {
      setQuery(contact.name);
    } else {
      setQuery(contact.email);
    }
    setShowDropdown(false);
  };

  return (
    <div className="flex flex-col gap-2 relative">
      <label className="text-xs text-gray-500 font-medium mb-1 block">
        WHO ARE YOU WORKING WITH? </label>

      <input
        type="text"
        placeholder="Search name, email, or company"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setShowDropdown(true);
        }}
        onFocus={() => {
          if (query.length > 1) setShowDropdown(true);
        }}
        className="border border-gray-300 rounded-lg px-4 py-2 text-sm"
      />

     {showDropdown && query.length > 1 && (
  <div className="absolute top-full mt-1 left-0 z-20 bg-white border border-gray-200 rounded-lg max-h-60 overflow-y-auto w-full shadow">
          {filtered.map((contact) => (
            <button
              key={contact.id}
              onClick={() => handleSelect(contact)}
              className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-100"
            >
              {contact.avatar && (
                <div className="w-6 h-6 rounded-full overflow-hidden relative">
                  <Image src={contact.avatar} alt={contact.name} fill className="object-cover" />
                </div>
              )}
              <div className="flex flex-col items-start">
                <span className="font-medium text-gray-800">{contact.name}</span>
                {contact.organization?.name && (
                  <span className="text-xs text-gray-500">{contact.organization.name}</span>
                )}
              </div>
            </button>
          ))}

          {/* If no matches and valid email typed */}
          {filtered.length === 0 && isEmail(query) && (
            <button
              onClick={() => handleSelect({ email: query.trim() })}
              className="w-full text-left px-4 py-3 text-sm text-blue-600 hover:bg-gray-50"
            >
              Send proposal to <strong>{query.trim()}</strong> (new commissioner)
            </button>
          )}
        </div>
      )}
    </div>
  );
}