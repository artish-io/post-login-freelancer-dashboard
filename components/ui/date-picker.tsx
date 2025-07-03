'use client';

import { useState } from 'react';
import { Popover } from '@headlessui/react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

type Props = {
  selected: Date | null;
  onSelect: (date: Date | null) => void;
  label?: string;
  maxDate?: Date;
};

export default function DatePicker({ selected, onSelect, label, maxDate }: Props) {
  const today = new Date();

  return (
    <div className="flex flex-col gap-2 w-full">
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}

      <Popover className="relative w-full">
        <Popover.Button className="w-full flex justify-between items-center px-4 py-2 text-sm bg-white border border-gray-300 rounded-xl text-left">
          <span>{selected ? format(selected, 'PPP') : 'Pick a date'}</span>
          <CalendarIcon className="w-5 h-5 text-gray-500" />
        </Popover.Button>

        <Popover.Panel className="absolute z-20 mt-2 bg-white shadow-lg rounded-xl p-2">
          <DayPicker
  mode="single"
  selected={selected ?? undefined}
  onSelect={onSelect}
  fromDate={today}
  toDate={maxDate}
  required // ✅ <-- this fixes the TS error
  modifiersClassNames={{
    selected: 'bg-[#eb1966] text-white font-semibold rounded-full',
    today: 'border border-[#eb1966] text-[#eb1966] rounded-full',
    disabled: 'text-gray-300 opacity-50 cursor-not-allowed',
  }}
  classNames={{
    caption_label: 'text-sm font-medium',
    nav_button: 'text-[#eb1966] hover:bg-[#FCD5E3] rounded p-1',
    head_cell: 'text-xs text-gray-500 w-9',
    day: 'w-9 h-9 text-sm flex items-center justify-center rounded-full hover:bg-[#FCD5E3]',
  }}
/>
        </Popover.Panel>
      </Popover>
    </div>
  );
}