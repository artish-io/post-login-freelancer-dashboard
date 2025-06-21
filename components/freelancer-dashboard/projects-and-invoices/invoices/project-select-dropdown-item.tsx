'use client';

import { RadioGroup } from '@headlessui/react';
import { Plus } from 'lucide-react';

type ProjectItemProps = {
  label: string;
  checked: boolean;
  isCustom: boolean;
};

export default function ProjectSelectDropdownItem({
  label,
  checked,
  isCustom
}: ProjectItemProps) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 text-sm cursor-pointer transition rounded-md ${
        checked ? 'bg-gray-100 font-semibold' : ''
      }`}
    >
      {isCustom ? (
        <>
          <Plus className="w-4 h-4 text-gray-500" />
          <span>{label}</span>
        </>
      ) : (
        <>
          <div
            className={`w-4 h-4 rounded-full border border-gray-400 flex items-center justify-center`}
          >
            {checked && <div className="w-2 h-2 rounded-full bg-black" />}
          </div>
          <span>{label}</span>
        </>
      )}
    </div>
  );
}