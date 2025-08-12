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
  commissionerId: number;
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
    console.log('🚀 [BillToInput] useEffect triggered with freelancerId:', freelancerId, 'readOnly:', readOnly);
    if (readOnly) {
      console.log('⏭️ [BillToInput] Skipping fetch - component is readOnly');
      return;
    }

    const fetchContacts = async () => {
      try {
        console.log('🔍 [BillToInput] Fetching contacts for freelancerId:', freelancerId);
        const url = `/api/user/contacts/${freelancerId}`;
        console.log('🌐 [BillToInput] API URL:', url);

        const res = await fetch(url);
        console.log('📡 [BillToInput] Response status:', res.status, res.statusText);

        if (!res.ok) {
          console.error('❌ [BillToInput] HTTP error:', res.status, res.statusText);
          setContacts([]);
          return;
        }

        const data = await res.json();
        console.log('📋 [BillToInput] API response:', data);

        if (data.error) {
          console.error('❌ [BillToInput] API error:', data.error);
          setContacts([]);
          return;
        }

        if (Array.isArray(data.contacts)) {
          console.log('✅ [BillToInput] Setting contacts:', data.contacts.length, 'contacts found');
          console.log('👥 [BillToInput] Contact details:', data.contacts.map((c: any) => ({ id: c.id, name: c.name, email: c.email })));
          setContacts(data.contacts);
        } else {
          console.warn('⚠️ [BillToInput] Expected contacts array, got:', typeof data.contacts, data.contacts);
          setContacts([]);
        }
      } catch (err) {
        console.error('❌ [BillToInput] Failed to fetch contacts:', err);
        setContacts([]);
      }
    };

    fetchContacts();
  }, [freelancerId, readOnly]);

  // Filter dropdown list based on input
  useEffect(() => {
    if (readOnly) return;

    const query = value.toLowerCase().trim();
    console.log('🔍 [BillToInput] Filtering with query:', query, 'from', contacts.length, 'contacts');

    if (!query) {
      // Show all contacts when input is empty (up to 5)
      const allContacts = contacts.slice(0, 5);
      console.log('📋 [BillToInput] Showing all contacts (empty query):', allContacts.length);
      setFiltered(allContacts);
      return;
    }

    const matches = contacts.filter(
      (c) => c.name.toLowerCase().includes(query) || c.email.toLowerCase().includes(query)
    );
    console.log('🎯 [BillToInput] Found matches for query "' + query + '":', matches.length);
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
      commissionerId: contact.id,
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
          // Show dropdown on focus if we have contacts to show
          if (contacts.length > 0) setShowDropdown(true);
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