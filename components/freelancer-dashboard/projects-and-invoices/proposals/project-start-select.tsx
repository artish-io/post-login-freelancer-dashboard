'use client';

import { Listbox } from '@headlessui/react';
import { ChevronDown } from 'lucide-react';
import { Calendar } from '../../../../components/ui/calendar';
import { useState } from 'react';
import { format } from 'date-fns';
import clsx from 'clsx';

type StartType = 'Immediately' | 'Select a Date';

type Props = {
  value: StartType;
  onChange: (val: StartType) => void;
  customDate: Date | null;
  onCustomDateChange: (val: Date | null) => void;
};

const START_OPTIONS: StartType[] = ['Immediately', 'Select a Date'];

export default function ProjectStartSelect({
  value,
  onChange,
  customDate,
  onCustomDateChange,
}: Props) {
  const [showCalendar, setShowCalendar] = useState(false);

  function handleDropdownChange(option: string) {
    onChange(option as StartType);
    setShowCalendar(option === 'Select a Date');
    if (option === 'Immediately') {
      onCustomDateChange(null);
    }
  }

  function handleCalendarSelect(date: Date | undefined) {
    if (date) {
      onCustomDateChange(date);
      setShowCalendar(false);
    }
  }

  // Show formatted date as label if a date is selected
  let dropdownLabel: string = value;
  if (value === 'Select a Date' && customDate) {
    dropdownLabel = format(customDate, 'PPP');
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs text-gray-500 font-medium mb-1 block">
        WHEN SHOULD THIS PROJECT START</label>
      <Listbox value={value} onChange={handleDropdownChange}>
        {({ open }) => (
          <div className="relative">
            <Listbox.Button
              className={clsx(
                "w-full rounded-xl bg-white px-4 py-2 text-sm text-left flex items-center justify-between transition border border-gray-300",
                "focus:outline-none focus:ring-0 focus:border-gray-400",
                // No conditional border colors; always gray
              )}
              // Remove native focus outline on click/focus!
              style={{ boxShadow: 'none' }}
              tabIndex={0}
            >
              <span>{dropdownLabel}</span>
              <ChevronDown className="w-5 h-5 text-gray-500 ml-2" />
            </Listbox.Button>
            <Listbox.Options
              className="absolute mt-1 w-full bg-white rounded-xl z-10 shadow border border-gray-200 outline-none focus:outline-none"
              style={{
                boxShadow: '0 2px 12px 0 rgba(16,30,54,0.08)',
                outline: 'none',
                border: '1.5px solid #E5E7EB', // Tailwind gray-200
              }}
            >
              {START_OPTIONS.map((option) => (
                <Listbox.Option
                  key={option}
                  value={option}
                  className={({ active }) =>
                    clsx(
                      "cursor-pointer px-4 py-2 text-sm rounded-xl",
                      active ? 'bg-gray-100 text-black' : 'text-gray-800'
                    )
                  }
                >
                  {option}
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </div>
        )}
      </Listbox>
      {value === 'Select a Date' && showCalendar && (
        <div className="mt-3 rounded-xl bg-white p-2">
          <Calendar
            mode="single"
            selected={customDate ?? undefined}
            onSelect={handleCalendarSelect}
            initialFocus
            required
            className="scale-95 origin-top-left"
          />
        </div>
      )}
    </div>
  );
}