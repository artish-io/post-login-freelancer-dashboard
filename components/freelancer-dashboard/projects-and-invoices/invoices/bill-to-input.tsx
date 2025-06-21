'use client';

import { useEffect, useRef, useState } from 'react';
import ContactSuggestionDropdown from './contact-suggestion-dropdown';

type Contact = {
  id: number;
  name: string;
  email: string;
  title?: string;
  avatar: string;
};

type Props = {
  freelancerId: number;
  value: string;
  onChange: (value: string) => void;
  onSelect: (contact: Contact) => void;
};

export default function BillToInput({ freelancerId, value, onChange, onSelect }: Props) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filtered, setFiltered] = useState<Contact[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Fetch freelancer's contacts
  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const res = await fetch(`/api/user/contacts/${freelancerId}`);
        const data = await res.json();
        if (Array.isArray(data.contacts)) {
          setContacts(data.contacts);
        } else {
          setContacts([]);
        }
      } catch (err) {
        console.error('Failed to fetch contacts:', err);
        setContacts([]);
      }
    };

    fetchContacts();
  }, [freelancerId]);

  // Filter contacts on value change
  useEffect(() => {
    if (value.trim().length === 0) {
      setFiltered([]);
      return;
    }

    const q = value.toLowerCase();
    const matches = contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
    );
    setFiltered(matches.slice(0, 5));
  }, [value, contacts]);

  const handleSelect = (contact: Contact) => {
    onChange(contact.email);
    onSelect(contact);
    setShowDropdown(false);
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setShowDropdown(true);
        }}
        placeholder="Client email or business name"
        className="w-full border border-gray-300 rounded-md px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-pink-500"
        onFocus={() => {
          if (value.trim()) setShowDropdown(true);
        }}
      />

      <ContactSuggestionDropdown
        contacts={filtered}
        onSelect={handleSelect}
        anchorRef={inputRef}
        visible={showDropdown}
        setVisible={setShowDropdown}
        noMatches={value.trim().length > 0 && filtered.length === 0}
      />
    </div>
  );
}