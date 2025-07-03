'use client';

import { Trash2, CalendarIcon } from 'lucide-react';
import { Popover } from '@headlessui/react';
import { Calendar } from '../../../../components/ui/calendar';
import { format } from 'date-fns';
import clsx from 'clsx';

// Define milestone type
type Milestone = {
  id: string;
  title: string;
  description: string;
  startDate: Date | null;
  endDate: Date | null;
};

type Props = {
  data: Milestone;
  onUpdate: (changes: Partial<Milestone>) => void;
  onRemove: () => void;
  endLimit?: Date | null;
};

export default function ProposalMilestoneItem({
  data,
  onUpdate,
  onRemove,
  endLimit,
}: Props) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const renderDatePicker = (
    label: string,
    selectedDate: Date | null,
    onChange: (val: Date | null) => void,
    minDate?: Date | null
  ) => {
    return (
      <div className="flex-1">
        <label className="text-xs font-medium text-gray-500 block mb-1">{label}</label>
        <Popover className="relative w-full">
          <Popover.Button
            className={clsx(
              'w-full rounded-xl bg-white px-4 py-2 text-sm text-left flex items-center justify-between border border-gray-300 focus:outline-none focus:ring-0 focus:border-gray-400 transition'
            )}
            style={{ boxShadow: 'none' }}
          >
            <span>{selectedDate ? format(selectedDate, 'yyyy-MM-dd') : 'yyyy-mm-dd'}</span>
            <CalendarIcon className="w-4 h-4 text-gray-500" />
          </Popover.Button>
          <Popover.Panel className="absolute z-10 mt-2 bg-white rounded-xl p-2 shadow">
            <Calendar
              mode="single"
              selected={selectedDate ?? undefined}
              onSelect={(date) => onChange(date ?? null)}
              initialFocus
              fromDate={minDate ?? today}
              toDate={endLimit ?? undefined}
              disabled={(date) => {
                if (date < today) return true;
                if (endLimit && date > endLimit) return true;
                if (minDate && date < minDate) return true;
                return false;
              }}
              className="scale-95 origin-top-left"
            />
          </Popover.Panel>
        </Popover>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-3 border border-gray-300 rounded-2xl p-5 bg-white relative">
      {/* DELETE BUTTON */}
      <div className="flex justify-end -mt-2 -mr-2">
        <button
          type="button"
          onClick={onRemove}
          className="text-gray-400 hover:text-red-500 transition"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {/* TITLE + DESCRIPTION */}
      <div className="flex flex-col gap-1">
        <input
          type="text"
          value={data.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Task / Deliverable Title"
          className="text-sm font-medium px-4 py-2 border border-gray-300 rounded-xl w-full bg-white focus:outline-none focus:ring-2 focus:ring-black"
        />
        <textarea
          value={data.description}
          onChange={(e) => onUpdate({ description: e.target.value })}
          placeholder="Write a short and clear description of a project deliverable"
          rows={2}
          className="text-sm px-4 py-2 border border-gray-300 rounded-xl w-full bg-white focus:outline-none focus:ring-2 focus:ring-black resize-none"
        />
      </div>

      {/* DATES */}
      <div className="flex flex-col md:flex-row gap-3">
        {renderDatePicker('Start date', data.startDate, (val) =>
          onUpdate({ startDate: val })
        )}
        {renderDatePicker('End date', data.endDate, (val) =>
          onUpdate({ endDate: val }),
          data.startDate
        )}
      </div>
    </div>
  );
}