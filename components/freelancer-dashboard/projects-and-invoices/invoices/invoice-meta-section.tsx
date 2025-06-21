'use client';

import { useEffect, useState } from 'react';
import { CalendarIcon } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import { Popover } from '@headlessui/react';
import clsx from 'clsx';

import { Calendar } from '../../../../components/ui/calendar';
import ExecutionDropdown from './execution-dropdown';
import BillToInput from './bill-to-input';

export type InvoiceMetaSectionProps = {
  invoiceNumber: string;
  onInvoiceNumberChange: (value: string) => void;
  issueDate: string;
  onIssueDateChange: (value: string) => void;
  executionTiming: string;
  onExecutionTimingChange: (value: string) => void;
  billTo: string;
  onBillToChange: (value: string) => void;
};

export default function InvoiceMetaSection({
  invoiceNumber,
  onInvoiceNumberChange,
  issueDate,
  onIssueDateChange,
  executionTiming,
  onExecutionTimingChange,
  billTo,
  onBillToChange,
}: InvoiceMetaSectionProps) {
  const { data: session } = useSession();
  const [from, setFrom] = useState<{ name: string; email: string }>({ name: '', email: '' });
  const [dateObj, setDateObj] = useState<Date | undefined>(
    issueDate ? new Date(issueDate) : new Date()
  );

  useEffect(() => {
    if (!session?.user?.id) return;

    const fetchFreelancer = async () => {
      try {
        const res = await fetch(`/api/user/profile/${session.user.id}`);
        const data = await res.json();
        setFrom({ name: data.name, email: data.email });
      } catch (err) {
        console.error('Failed to fetch freelancer profile:', err);
      }
    };

    fetchFreelancer();
  }, [session?.user?.id]);

  return (
    <section className="w-full border-t border-gray-300 pt-6 mt-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="flex flex-col gap-4">
          {/* Invoice Number */}
          <div>
            <label className="text-xs text-gray-700 mb-1 block">INVOICE NUMBER</label>
            <input
              type="text"
              value={invoiceNumber}
              onChange={(e) => onInvoiceNumberChange(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-pink-500"
              placeholder="Enter invoice number"
            />
          </div>

          {/* Issue Date */}
          <div>
            <label className="text-xs text-gray-700 mb-1 block">ISSUE DATE</label>
            <Popover className="relative">
              <Popover.Button
                className={clsx(
                  'w-full border border-gray-300 rounded-md px-4 py-2 text-sm text-left flex items-center justify-between',
                  'focus:outline-none focus:ring-2 focus:ring-pink-500'
                )}
              >
                <span>{dateObj ? format(dateObj, 'PPP') : 'Pick a date'}</span>
                <CalendarIcon className="w-4 h-4 text-gray-500" />
              </Popover.Button>
              <Popover.Panel className="absolute z-10 mt-2 bg-white border rounded-md shadow-md">
                <Calendar
                  mode="single"
                  selected={dateObj}
                  onSelect={(date: Date | undefined) => {
                    if (date) {
                      setDateObj(date);
                      onIssueDateChange(date.toISOString());
                    }
                  }}
                  initialFocus
                />
              </Popover.Panel>
            </Popover>
          </div>

          {/* Execution Timing */}
          <div>
            <label className="text-xs text-gray-700 mb-1 block">WHEN TO EXECUTE</label>
            <ExecutionDropdown value={executionTiming} onChange={onExecutionTimingChange} />
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          {/* From */}
          <div>
            <label className="text-xs text-gray-700 mb-1 block">FROM</label>
            <div className="text-sm font-semibold text-gray-900">{from.name}</div>
            <div className="text-sm text-gray-700">{from.email}</div>
          </div>

          {/* Bill To */}
          <div>
            <label className="text-xs text-gray-700 mb-1 block">BILL TO:</label>
            {session?.user?.id && (
              <BillToInput
                freelancerId={Number(session.user.id)}
                value={billTo}
                onChange={onBillToChange}
                onSelect={(contact) => onBillToChange(contact.email)}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}