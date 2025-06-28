'use client';

import * as React from 'react';
import { DayPicker } from 'react-day-picker';
import clsx from 'clsx';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <div className={clsx('p-3 border-0', className)}>
      <DayPicker
        showOutsideDays={showOutsideDays}
        classNames={{
          months: 'flex flex-col space-y-4',
          caption: 'flex justify-center pt-1 relative items-center',
          caption_label: 'text-sm font-medium',
          nav: 'space-x-1 flex items-center',
          nav_button:
            'h-6 w-6 bg-transparent p-0 opacity-80 hover:opacity-100 flex items-center justify-center text-[#eb1966] hover:bg-[#FCD5E3]',
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
        {...props}
      />

      <style jsx global>{`
  /* Complete reset and custom styling for react-day-picker */
  .rdp {
    --rdp-cell-size: 32px;
    --rdp-accent-color: #eb1966;
    --rdp-background-color: #FCD5E3;
    --rdp-accent-color-dark: #eb1966;
    --rdp-background-color-dark: #FCD5E3;
    --rdp-outline: 2px solid #FCD5E3;
    --rdp-outline-selected: 2px solid #eb1966;
    margin: 0;
    border: none !important;
    outline: none !important;
    background: transparent !important;
    max-width: 280px;
  }

  /* Month navigation */
  .rdp-months {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .rdp-month {
    margin: 0;
  }

  .rdp-caption {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.25rem 0;
    position: relative;
  }

  .rdp-caption_label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #000;
  }

  .rdp-nav {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .rdp-nav_button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 0;
    background: transparent !important;
    border: none !important;
    cursor: pointer;
    opacity: 0.8;
    transition: opacity 0.2s;
  }

  .rdp-nav_button:hover {
    opacity: 1;
    background-color: #FCD5E3 !important;
    border-radius: 4px;
  }

  .rdp-nav_button_previous {
    position: absolute;
    left: 0.25rem;
  }

  .rdp-nav_button_next {
    position: absolute;
    right: 0.25rem;
  }

  .rdp-nav_button svg {
    width: 16px;
    height: 16px;
    fill: #eb1966 !important;
    stroke: #eb1966 !important;
    color: #eb1966 !important;
  }

  .rdp-nav_button[disabled] {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .rdp-nav_button[disabled] svg {
    fill: #bbb !important;
    stroke: #bbb !important;
  }

  /* Table styling */
  .rdp-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 0.5rem;
  }

  .rdp-head_row {
    display: flex;
  }

  .rdp-head_cell {
    width: 32px;
    font-size: 0.75rem;
    font-weight: normal;
    color: #6b7280;
    text-align: center;
    padding: 0;
  }

  .rdp-row {
    display: flex;
    width: 100%;
    margin-top: 0.5rem;
  }

  .rdp-cell {
    width: 32px;
    height: 32px;
    text-align: center;
    font-size: 0.8rem;
    padding: 0;
    position: relative;
  }

  /* Day button styling */
  .rdp-button_reset {
    appearance: none;
    background: none;
    border: none;
    font: inherit;
    margin: 0;
    padding: 0;
  }

  .rdp-button {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: none !important;
    background: transparent !important;
    color: #000;
    font-weight: normal;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .rdp-button:hover {
    background-color: #FCD5E3 !important;
    color: #eb1966 !important;
  }

  /* Selected day */
  .rdp-day_selected .rdp-button,
  .rdp-day_selected .rdp-button:hover,
  .rdp-day_selected .rdp-button:focus {
    background-color: #FCD5E3 !important;
    color: #eb1966 !important;
    font-weight: 600;
  }

  /* Today's date */
  .rdp-day_today .rdp-button {
    border: 1px solid #eb1966 !important;
    color: #eb1966 !important;
    background: transparent !important;
  }

  .rdp-day_today.rdp-day_selected .rdp-button {
    background-color: #FCD5E3 !important;
    border: 1px solid #eb1966 !important;
    color: #eb1966 !important;
  }

  /* Outside days (previous/next month) */
  .rdp-day_outside .rdp-button {
    color: #d1d5db;
    opacity: 0.5;
  }

  /* Disabled days */
  .rdp-day_disabled .rdp-button {
    color: #d1d5db;
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Focus states */
  .rdp-button:focus-visible {
    outline: 2px solid #FCD5E3 !important;
    outline-offset: 2px;
  }

  /* Remove any remaining default styles */
  .rdp * {
    box-sizing: border-box;
  }

  .rdp-day_range_start .rdp-button,
  .rdp-day_range_end .rdp-button,
  .rdp-day_range_middle .rdp-button {
    background-color: #FCD5E3 !important;
    color: #eb1966 !important;
  }
`}</style>
    </div>
  );
}

export default Calendar;