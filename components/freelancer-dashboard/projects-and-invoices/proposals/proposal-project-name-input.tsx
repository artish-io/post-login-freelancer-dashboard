'use client';

import { ChangeEvent } from 'react';

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export default function ProposalProjectNameInput({ value, onChange }: Props) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs text-gray-500 font-medium mb-1 block">
        PROJECT NAME</label>
      <input
        type="text"
        placeholder="Enter project name"
        value={value}
        onChange={handleChange}
        className="border border-gray-300 rounded-lg px-4 py-2 w-full text-sm"
      />
    </div>
  );
}