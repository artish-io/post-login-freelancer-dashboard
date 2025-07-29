'use client';

import { RadioGroup } from '@headlessui/react';
import { Plus } from 'lucide-react';

type ProjectItemProps = {
  label: string;
  checked: boolean;
  isCustom: boolean;
  disabled?: boolean;
  hasAvailableMilestones?: boolean;
  availableTasksCount?: number;
};

export default function ProjectSelectDropdownItem({
  label,
  checked,
  isCustom,
  disabled = false,
  hasAvailableMilestones = true,
  availableTasksCount = 0
}: ProjectItemProps) {
  return (
    <div
      className={`flex items-center justify-between px-4 py-3 text-sm transition rounded-md ${
        disabled
          ? 'cursor-not-allowed opacity-50 bg-gray-50'
          : 'cursor-pointer hover:bg-gray-50'
      } ${checked ? 'bg-gray-100 font-semibold' : ''}`}
    >
      <div className="flex items-center gap-3">
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
            <span className={disabled ? 'text-gray-400' : ''}>{label}</span>
          </>
        )}
      </div>

      {!isCustom && (
        <div className="flex items-center gap-2">
          {hasAvailableMilestones ? (
            <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
              {availableTasksCount} task{availableTasksCount !== 1 ? 's' : ''} ready
            </span>
          ) : (
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
              No tasks ready
            </span>
          )}
        </div>
      )}
    </div>
  );
}