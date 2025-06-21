'use client';

import { useState } from 'react';
import { Popover } from '@headlessui/react';
import { ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import { format, isValid } from 'date-fns';
import { Calendar } from '../../../ui/calendar';

type Props = {
  value: string;
  onChange: (val: string) => void;
};

const OPTIONS = ['Execute Immediately', 'On Project Completion', 'Custom Date'];

export default function ExecutionDropdown({ value, onChange }: Props) {
  const [customDate, setCustomDate] = useState<Date | null>(
    value && !OPTIONS.includes(value) ? new Date(value) : null
  );
  const [showCalendar, setShowCalendar] = useState(false);

  const handleOptionSelect = (option: string) => {
    setShowCalendar(false);

    if (option === 'Execute Immediately') {
      onChange(new Date().toISOString());
    } else if (option === 'On Project Completion') {
      onChange('on-completion');
    } else if (option === 'Custom Date') {
      setShowCalendar(true);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date && isValid(date)) {
      setCustomDate(date);
      onChange(date.toISOString());
      setShowCalendar(false);
    }
  };

  const displayLabel = () => {
    if (value === 'on-completion') return 'On Project Completion';
    if (isValid(new Date(value))) return format(new Date(value), 'PPP');
    return 'Execute Immediately';
  };

  return (
    <div className="relative w-full">
      <Popover className="w-full">
        {({ open }) => (
          <>
            <Popover.Button
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
                      type="button"
                      onClick={() => handleOptionSelect(option)}
                      className={clsx(
                        'text-left px-4 py-2 text-sm hover:bg-gray-100 w-full',
                        (value === 'on-completion' && option === 'On Project Completion') ||
                        (option === 'Execute Immediately' && !isValid(new Date(value))) ||
                        (option === 'Custom Date' && isValid(new Date(value))) &&
                          'bg-gray-100 font-medium'
                      )}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </Popover.Panel>
            )}
          </>
        )}
      </Popover>

      {showCalendar && (
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