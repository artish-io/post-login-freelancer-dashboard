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
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-700">Set a project end date</label>
      <Popover className="relative w-full">
        <Popover.Button
          className={clsx(
            'w-full rounded-xl bg-white px-4 py-2 text-sm text-left flex items-center justify-between border border-gray-300 focus:outline-none focus:ring-0 focus:border-gray-400 transition'
          )}
          style={{
            boxShadow: 'none',      // Removes browser blue glow
          }}
        >
          <span>{endDate ? format(endDate, 'PPP') : 'Pick a date'}</span>
          <CalendarIcon className="w-5 h-5 text-gray-500" />
        </Popover.Button>
        <Popover.Panel className="absolute z-10 mt-2 bg-white rounded-xl p-2 shadow">
          <Calendar
            mode="single"
            selected={endDate ?? undefined}
            onSelect={(date) => onEndDateChange(date ?? null)}
            fromDate={startDate ?? undefined}
            initialFocus
            required
            className="scale-95 origin-top-left"
          />
        </Popover.Panel>
      </Popover>
    </div>
  );
}