'use client';

import { Popover } from '@headlessui/react';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '../../../../components/ui/calendar';
import { format } from 'date-fns';
import clsx from 'clsx';

type Props = {
  endDate: Date | null;
  onEndDateChange: (val: Date | null) => void;
  startDate: Date | null;
};

export default function ProjectDurationPicker({ endDate, onEndDateChange, startDate }: Props) {
  const handleSelect = (date: Date | undefined) => {
    console.log('📅 Date selected from calendar:', date);
    onEndDateChange(date ?? null);
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs text-gray-500 font-medium mb-1 block">
        SET A PROJECT END DATE</label>
      <Popover className="relative w-full">
        <Popover.Button
          className={clsx(
            'w-full rounded-xl bg-white px-4 py-2 text-sm text-left flex items-center justify-between border border-gray-300 focus:outline-none focus:ring-0 focus:border-gray-400 transition'
          )}
          style={{
            boxShadow: 'none',
          }}
        >
          <span>{endDate ? format(endDate, 'PPP') : 'Pick a date'}</span>
          <CalendarIcon className="w-5 h-5 text-gray-500" />
        </Popover.Button>

        <Popover.Panel className="absolute z-10 mt-2 bg-white rounded-xl p-2 shadow">
          <Calendar
            mode="single"
            selected={endDate ?? undefined}
            onSelect={handleSelect}
            fromDate={startDate ?? new Date()}
            className="scale-95 origin-top-left"
            initialFocus
          />
        </Popover.Panel>
      </Popover>
    </div>
  );
}