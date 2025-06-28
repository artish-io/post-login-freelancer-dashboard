'use client';

import { useEffect, useRef, useState } from 'react';
import ContactSuggestionDropdown from './contact-suggestion-dropdown';

type Contact = {
  id: number;
  name: string;
  email: string;
  title?: string; // used as address fallback
  avatar: string;
};

type BillToContact = {
  contactName: string;
  email: string;
  avatar: string;
  address: string;
};

type Props = {
  freelancerId: number;
  value: string;
  onChange: (value: string) => void;
  onSelect: (contact: BillToContact) => void;
  readOnly?: boolean;
};

export default function BillToInput({
  freelancerId,
  value = '',
  onChange,
  onSelect,
  readOnly = false,
}: Props) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filtered, setFiltered] = useState<Contact[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Fetch available contacts for this freelancer
  useEffect(() => {
    if (readOnly) return;

    const fetchContacts = async () => {
      try {
        const res = await fetch(`/api/user/contacts/${freelancerId}`);
        const data = await res.json();
        if (Array.isArray(data.contacts)) {
          setContacts(data.contacts);
        }
      } catch (err) {
        console.error('Failed to fetch contacts:', err);
      }
    };

    fetchContacts();
  }, [freelancerId, readOnly]);

  // Filter dropdown list based on input
  useEffect(() => {
    if (readOnly) return;

    const query = value.toLowerCase().trim();
    if (!query) {
      setFiltered([]);
      return;
    }

    const matches = contacts.filter(
      (c) => c.name.toLowerCase().includes(query) || c.email.toLowerCase().includes(query)
    );
    setFiltered(matches.slice(0, 5));
  }, [value, contacts, readOnly]);

  // Handle contact selection
  const handleSelect = (contact: Contact) => {
    onChange(contact.email);
    onSelect({
      contactName: contact.name,
      email: contact.email,
      avatar: contact.avatar,
      address: contact.title || '—',
    });
    setShowDropdown(false);
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => {
          if (readOnly) return;
          onChange(e.target.value);
          setShowDropdown(true);
        }}
        placeholder="Client email or business name"
        className="w-full border border-gray-300 rounded-md px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-pink-500 disabled:opacity-60"
        onFocus={() => {
          if (readOnly) return;
          if (value.trim()) setShowDropdown(true);
        }}
        disabled={readOnly}
      />

      {!readOnly && (
        <ContactSuggestionDropdown
          contacts={filtered}
          onSelect={handleSelect}
          anchorRef={inputRef}
          visible={showDropdown}
          setVisible={setShowDropdown}
          noMatches={value.trim().length > 0 && filtered.length === 0}
        />
      )}
    </div>
  );
}