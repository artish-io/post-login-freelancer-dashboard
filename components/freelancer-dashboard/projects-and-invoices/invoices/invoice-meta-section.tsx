'use client';

import { CalendarIcon } from 'lucide-react';

export default function InvoiceMetaSection() {
  return (
    <section className="w-full border-t border-gray-300 pt-6 mt-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left column: Invoice Number, Issue Date, Execution */}
        <div className="flex flex-col gap-4">
          {/* Invoice Number */}
          <div>
            <label className="text-xs text-gray-700 mb-1 block">INVOICE NUMBER</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-md px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-pink-500"
              placeholder=""
            />
          </div>

          {/* Issue Date */}
          <div>
            <label className="text-xs text-gray-700 mb-1 block">ISSUE DATE</label>
            <div className="relative">
              <input
                type="date"
                className="w-full border border-gray-300 rounded-md px-4 py-2 text-sm pr-10 outline-none focus:ring-2 focus:ring-pink-500"
              />
              <CalendarIcon className="absolute right-3 top-2.5 w-4 h-4 text-gray-500" />
            </div>
          </div>

          {/* When to Execute */}
          <div>
            <label className="text-xs text-gray-700 mb-1 block">WHEN TO EXECUTE</label>
            <select className="w-full border border-gray-300 rounded-md px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-pink-500">
              <option value="immediately">Immediately</option>
              <option value="net7">In 7 Days</option>
              <option value="net30">In 30 Days</option>
            </select>
          </div>
        </div>

        {/* Right column: Bill To */}
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs text-gray-700 mb-1 block">BILL TO:</label>
            <input
              type="text"
              placeholder=""
              className="w-full border border-gray-300 rounded-md px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>
        </div>
      </div>
    </section>
  );
}