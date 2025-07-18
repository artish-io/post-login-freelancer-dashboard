// components/freelancer-dashboard/projects-and-invoices/proposals/proposal-milestones-fixed.tsx

'use client';

import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Calendar } from '../../../ui/calendar';
import { Popover } from '@headlessui/react';
import { CalendarIcon, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';
import type { Milestone } from './proposal-milestones-editor';

interface Props {
  milestones: Milestone[];
  onChange: (updated: Milestone[]) => void;
  totalBid: number;
  projectEndDate: Date | null; // ✅ newly added
  executionMethod?: 'completion' | 'milestone';
}

export default function ProposalMilestonesFixed({
  milestones,
  onChange,
  totalBid,
  projectEndDate, // ✅ ensure passed from parent
  executionMethod = 'milestone',
}: Props) {
  const [error, setError] = useState<string | null>(null);

  const totalAllocated = milestones.reduce((sum, m) => sum + Number(m.amount || 0), 0);

  useEffect(() => {
    if (totalAllocated > totalBid) {
      setError(`Milestone total exceeds bid by $${(totalAllocated - totalBid).toLocaleString()}`);
    } else {
      setError(null);
    }
  }, [totalAllocated, totalBid]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const handleAdd = () => {
    const newMilestone: Milestone = {
      id: uuidv4(),
      title: '',
      description: '',
      startDate: null,
      endDate: null,
      amount: 0,
    };
    const updatedMilestones = [...milestones, newMilestone];

    // Auto-calculate amounts for milestone-based projects
    if (executionMethod === 'milestone' && totalBid > 0) {
      const amountPerMilestone = Math.round(totalBid / updatedMilestones.length);
      const milestonesWithAmounts = updatedMilestones.map(m => ({
        ...m,
        amount: amountPerMilestone
      }));
      onChange(milestonesWithAmounts);
    } else {
      onChange(updatedMilestones);
    }
  };

  const handleUpdate = (id: string, updatedFields: Partial<Milestone>) => {
    const updatedMilestones = milestones.map((m) =>
      m.id === id ? { ...m, ...updatedFields } : m
    );
    onChange(updatedMilestones);
  };

  const handleRemove = (id: string) => {
    const filtered = milestones.filter((m) => m.id !== id);

    // Auto-recalculate amounts for milestone-based projects
    if (executionMethod === 'milestone' && totalBid > 0 && filtered.length > 0) {
      const amountPerMilestone = Math.round(totalBid / filtered.length);
      const milestonesWithAmounts = filtered.map(m => ({
        ...m,
        amount: amountPerMilestone
      }));
      onChange(milestonesWithAmounts);
    } else {
      onChange(filtered);
    }
  };

  const renderDatePicker = (
    label: string,
    selectedDate: Date | null,
    onChange: (val: Date | null) => void,
    fromDate?: Date | null
  ) => (
    <div className="flex-1 min-w-[160px]">
      <label className="text-xs font-medium text-gray-500 block mb-1">{label}</label>
      <Popover className="relative w-full">
        <Popover.Button
          className={clsx(
            'w-full rounded-xl bg-white px-4 py-2 text-sm text-left flex items-center justify-between border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black transition'
          )}
        >
          <span>{selectedDate ? format(selectedDate, 'yyyy-MM-dd') : 'Pick a date'}</span>
          <CalendarIcon className="w-4 h-4 text-gray-500" />
        </Popover.Button>
        <Popover.Panel className="absolute z-10 mt-2 bg-white rounded-xl p-2 shadow">
          <Calendar
            mode="single"
            selected={selectedDate ?? undefined}
            onSelect={(date) => onChange(date ?? null)}
            fromDate={fromDate ?? today}
            toDate={projectEndDate ?? undefined} // ✅ project-level end constraint
            disabled={(date) => {
              const beforeToday = date < today;
              const afterProject = projectEndDate ? date > projectEndDate : false;
              const beforeStart = fromDate ? date < fromDate : false;
              return beforeToday || afterProject || beforeStart;
            }}
            className="scale-95 origin-top-left"
          />
        </Popover.Panel>
      </Popover>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      {milestones.map((milestone) => (
        <div
          key={milestone.id}
          className="flex flex-col gap-3 border border-gray-300 rounded-2xl p-5 bg-white relative"
        >
          <div className="flex justify-end -mt-2 -mr-2">
            <button
              type="button"
              onClick={() => handleRemove(milestone.id)}
              className="text-gray-400 hover:text-red-500 transition"
            >
              <Trash2 size={18} />
            </button>
          </div>

          <div className="flex flex-col gap-1">
            <input
              type="text"
              value={milestone.title}
              onChange={(e) => handleUpdate(milestone.id, { title: e.target.value })}
              placeholder="Deliverable title"
              className="text-sm font-medium px-4 py-2 border border-gray-300 rounded-xl w-full bg-white focus:outline-none focus:ring-2 focus:ring-black"
            />
            <textarea
              value={milestone.description}
              onChange={(e) => handleUpdate(milestone.id, { description: e.target.value })}
              placeholder="Optional description"
              rows={2}
              className="text-sm px-4 py-2 border border-gray-300 rounded-xl w-full bg-white focus:outline-none focus:ring-2 focus:ring-black resize-none"
            />
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            {renderDatePicker(
              'Start date',
              milestone.startDate,
              (val) => handleUpdate(milestone.id, { startDate: val }),
              today
            )}
            {renderDatePicker(
              'End date',
              milestone.endDate,
              (val) => handleUpdate(milestone.id, { endDate: val }),
              milestone.startDate ?? today
            )}
            <div className="flex-1 min-w-[160px]">
              <label className="text-xs font-medium text-gray-500 block mb-1">
                {executionMethod === 'milestone' ? 'Payment (Auto-calculated)' : 'Amount'}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-500 text-sm">$</span>
                <input
                  type="number"
                  value={milestone.amount}
                  onChange={(e) =>
                    executionMethod !== 'milestone' && handleUpdate(milestone.id, {
                      amount: parseFloat(e.target.value) || 0,
                    })
                  }
                  readOnly={executionMethod === 'milestone'}
                  className={`w-full pl-6 pr-3 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-black ${
                    executionMethod === 'milestone'
                      ? 'bg-gray-50 cursor-not-allowed'
                      : 'bg-white'
                  }`}
                />
              </div>
              {executionMethod === 'milestone' && (
                <div className="text-xs text-gray-500 mt-1">
                  Automatically calculated: ${Math.round(totalBid / milestones.length).toLocaleString()} per milestone
                </div>
              )}
            </div>
          </div>
        </div>
      ))}

      {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

      <button
        type="button"
        onClick={handleAdd}
        className="flex items-center gap-2 text-sm text-black font-medium px-4 py-2 border border-black rounded-full w-max hover:bg-black hover:text-white transition"
      >
        <span className="text-xl leading-none">＋</span>
        Add deliverable
      </button>
    </div>
  );
}