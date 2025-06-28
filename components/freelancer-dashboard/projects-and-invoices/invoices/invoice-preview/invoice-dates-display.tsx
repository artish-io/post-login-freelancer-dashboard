'use client';

import { CalendarIcon } from 'lucide-react';
import { format, isValid, parseISO } from 'date-fns';

interface InvoiceDatesDisplayProps {
  invoiceDate: Date | string;
  dueDate: Date | string;
}

export default function InvoiceDatesDisplay({
  invoiceDate,
  dueDate,
}: InvoiceDatesDisplayProps) {
  const parsedInvoiceDate = typeof invoiceDate === 'string'
    ? parseISO(invoiceDate)
    : invoiceDate;

  const parsedDueDate = typeof dueDate === 'string'
    ? parseISO(dueDate)
    : dueDate;

  const formattedInvoiceDate = isValid(parsedInvoiceDate)
    ? format(parsedInvoiceDate, 'dd MMM yyyy')
    : '—';

  const formattedDueDate = isValid(parsedDueDate)
    ? format(parsedDueDate, 'dd MMM yyyy')
    : '—';

  return (
    <section className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-900">Basic Info</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Invoice Date</label>
          <div className="relative">
            <input
              type="text"
              value={formattedInvoiceDate}
              readOnly
              className="w-full rounded-md border border-gray-200 p-3 pr-10 text-sm text-gray-900 bg-white"
            />
            <CalendarIcon className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Due date</label>
          <div className="relative">
            <input
              type="text"
              value={formattedDueDate}
              readOnly
              className="w-full rounded-md border border-gray-200 p-3 pr-10 text-sm text-gray-900 bg-white"
            />
            <CalendarIcon className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
          </div>
        </div>
      </div>
    </section>
  );
}