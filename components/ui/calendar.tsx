'use client';

import * as React from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import clsx from 'clsx';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

export function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <div className={clsx('p-3', className)}>
      <DayPicker
        showOutsideDays={showOutsideDays}
        classNames={{
          months: 'flex flex-col space-y-4',
          caption: 'flex justify-center pt-1 relative items-center',
          caption_label: 'text-sm font-medium',
          nav: 'space-x-1 flex items-center',
          nav_button:
            'h-6 w-6 bg-transparent p-0 opacity-50 hover:opacity-100 flex items-center justify-center text-[#eb1966] hover:bg-[#FCD5E3]',
          nav_button_previous: 'absolute left-1',
          nav_button_next: 'absolute right-1',
          table: 'w-full border-collapse space-y-1',
          head_row: 'flex',
          head_cell: 'text-gray-500 rounded-md w-9 font-normal text-[0.8rem]',
          row: 'flex w-full mt-2',
          cell: 'text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md',
          day: 'h-9 w-9 p-0 font-normal aria-selected:opacity-100 focus:outline-none',
          day_selected: 'bg-[#FCD5E3] text-[#eb1966] font-semibold hover:bg-[#FCD5E3]',
          day_today: 'border border-[#eb1966] text-[#eb1966] rounded-full',
          day_outside: 'text-gray-400 opacity-50',
          day_disabled: 'text-gray-300 opacity-50',
          day_range_middle: 'aria-selected:bg-accent aria-selected:text-accent-foreground',
          day_hidden: 'invisible',
        }}
        components={{}}
        {...props}
      />

      <style jsx global>{`
        .rdp-nav svg {
          fill: #eb1966;
        }
      `}</style>
    </div>
  );
}

export default Calendar;