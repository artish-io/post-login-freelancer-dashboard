'use client';

import * as React from 'react';
import { DayPicker } from 'react-day-picker';
import clsx from 'clsx';

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  proposalEndDate?: Date;
};

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  disabled: disabledFromProps,
  proposalEndDate,
  ...props
}: CalendarProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Local disabled logic — fallback if none provided
  const fallbackDisabled = (date: Date): boolean => {
    const afterEnd = proposalEndDate ? date > proposalEndDate : false;
    return date < today || afterEnd;
  };

  return (
    <div className={clsx('p-3 border-0', className)}>
      <DayPicker
        showOutsideDays={showOutsideDays}
        disabled={disabledFromProps ?? fallbackDisabled}
        classNames={{
          months: 'flex flex-col space-y-4',
          caption: 'flex justify-center pt-1 relative items-center',
          caption_label: 'text-sm font-medium',
          nav: 'space-x-1 flex items-center',
          nav_button:
            'h-6 w-6 bg-transparent p-0 opacity-80 hover:opacity-100 flex items-center justify-center text-[#eb1966] hover:bg-[#FCD5E3]',
          nav_button_previous: 'absolute left-1',
          nav_button_next: 'absolute right-1',
          table: 'w-full border-collapse',
          head_row: 'flex',
          head_cell: 'text-gray-500 rounded-md w-9 font-normal text-[0.8rem]',
          row: 'flex w-full mt-2',
          cell: 'text-center text-sm p-0 relative',
          day: 'h-9 w-9 p-0 font-normal focus:outline-none',
          day_outside: 'text-gray-400 opacity-50',
          day_disabled: 'text-gray-300 opacity-50 cursor-not-allowed',
        }}
        {...props}
      />
    </div>
  );
}

export default Calendar;