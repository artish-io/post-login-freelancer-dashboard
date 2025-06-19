'use client';

import { TextareaHTMLAttributes } from 'react';

interface AdditionalNotesProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
}

export default function AdditionalNotes({ value, onChange, ...props }: AdditionalNotesProps) {
  return (
    <div className="mt-6">
      <label htmlFor="additional-notes" className="block text-sm font-medium text-gray-700 mb-1">
        Additional Notes
      </label>
      <textarea
        id="additional-notes"
        name="additional-notes"
        rows={4}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border rounded-md px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black"
        placeholder="Add any special notes, terms, or reminders for the client..."
        {...props}
      />
    </div>
  );
}