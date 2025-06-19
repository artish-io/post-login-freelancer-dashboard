'use client';

import { useState } from 'react';
import { Popover } from '@headlessui/react';
import { ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import { format } from 'date-fns';
import { Calendar } from '../../../ui/calendar';

type Props = {
  value: string;
  onChange: (val: string) => void;
};

const OPTIONS = [
  'Execute Immediately',
  'On Project Completion',
  'Select Custom Date',
];

export default function ExecutionDropdown({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [customDate, setCustomDate] = useState<Date | null>(
    value && !OPTIONS.includes(value) ? new Date(value) : null
  );

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setCustomDate(date);
      onChange(date.toISOString());
      setOpen(false);
    }
  };

  const displayLabel = () => {
    if (OPTIONS.includes(value)) return value;
    if (
      customDate instanceof Date &&
      !isNaN(customDate.getTime())
    ) {
      return format(customDate, 'PPP');
    }
    return 'Select an option';
  };

  return (
    <div className="relative w-full">
      <Popover className="w-full">
        <Popover.Button
          onClick={() => setOpen(!open)}
          className={clsx(
            'w-full border border-gray-300 rounded-md px-4 py-2 text-sm text-left flex items-center justify-between',
            'hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500'
          )}
        >
          <span>{displayLabel()}</span>
          <ChevronDown className="w-4 h-4 text-gray-500" />
        </Popover.Button>

        {open && (
          <Popover.Panel className="absolute z-20 mt-2 w-full bg-white border border-gray-200 rounded-md shadow-md">
            <div className="flex flex-col">
              {OPTIONS.map((option) => (
                <button
                  key={option}
                  onClick={() => {
                    if (option === 'Select Custom Date') {
                      onChange(option); // trigger calendar render
                      return;
                    }
                    setCustomDate(null);
                    onChange(option);
                    setOpen(false);
                  }}
                  className={clsx(
                    'text-left px-4 py-2 text-sm hover:bg-gray-100',
                    value === option && 'bg-gray-100 font-medium'
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          </Popover.Panel>
        )}
      </Popover>

      {value === 'Select Custom Date' && (
        <div className="mt-3 border rounded-md p-3 shadow-sm bg-white z-10">
          <Calendar
            mode="single"
            selected={customDate || undefined}
            onSelect={handleDateSelect}
            initialFocus
          />
        </div>
      )}
    </div>
  );
}