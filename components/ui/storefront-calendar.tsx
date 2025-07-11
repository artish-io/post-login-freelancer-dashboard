'use client';

import * as React from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

export type StorefrontCalendarProps = React.ComponentProps<typeof DayPicker>;

export function StorefrontCalendar({
  className,
  showOutsideDays = true,
  ...props
}: StorefrontCalendarProps) {
  // No date restrictions - allow all dates to be selectable
  return (
    <div className="p-3 md:p-6">
      <div className="storefront-calendar-mobile md:storefront-calendar-desktop">
        <DayPicker
          showOutsideDays={showOutsideDays}
          className={className}
          {...props}
        />
      </div>
      <style jsx global>{`
        .storefront-calendar-mobile .rdp {
          font-size: 0.75rem;
        }
        .storefront-calendar-mobile .rdp-day {
          font-size: 0.75rem;
          width: 1.75rem;
          height: 1.75rem;
          min-width: 1.75rem;
          min-height: 1.75rem;
        }
        .storefront-calendar-mobile .rdp-head_cell {
          font-size: 0.75rem;
          padding: 0.25rem;
        }
        .storefront-calendar-mobile .rdp-caption {
          font-size: 0.875rem;
        }
        .storefront-calendar-mobile .rdp-table {
          max-width: 280px;
        }

        @media (min-width: 768px) {
          .storefront-calendar-desktop .rdp {
            font-size: 0.875rem;
          }
          .storefront-calendar-desktop .rdp-day {
            font-size: 0.875rem;
            width: 2.5rem;
            height: 2.5rem;
            min-width: 2.5rem;
            min-height: 2.5rem;
          }
          .storefront-calendar-desktop .rdp-head_cell {
            font-size: 0.875rem;
            padding: 0.5rem;
          }
          .storefront-calendar-desktop .rdp-caption {
            font-size: 1rem;
          }
        }
      `}</style>
    </div>
  );
}

export default StorefrontCalendar;
