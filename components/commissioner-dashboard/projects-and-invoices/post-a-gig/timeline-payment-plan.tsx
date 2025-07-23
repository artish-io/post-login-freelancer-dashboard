'use client';

import { useState } from 'react';
import { Listbox, Popover } from '@headlessui/react';
import { ChevronDown, CalendarIcon } from 'lucide-react';
import { Calendar } from '../../../../components/ui/calendar';
import { format, differenceInWeeks, differenceInMonths } from 'date-fns';
import clsx from 'clsx';
import BudgetWithUpfront from './budget-with-upfront';

type StartType = 'Immediately' | 'Custom';
type ExecutionMethod = 'completion' | 'milestone';

interface TimelinePaymentPlanProps {
  startType: StartType;
  onStartTypeChange: (val: StartType) => void;
  customStartDate: Date | null;
  onCustomStartDateChange: (val: Date | null) => void;
  endDate: Date | null;
  onEndDateChange: (val: Date | null) => void;
  executionMethod: ExecutionMethod;
  onExecutionMethodChange: (val: ExecutionMethod) => void;
  lowerBudget: string;
  onLowerBudgetChange: (val: string) => void;
  upperBudget: string;
  onUpperBudgetChange: (val: string) => void;
}

const START_OPTIONS = [
  { value: 'Immediately', label: 'Immediately' },
  { value: 'Custom', label: 'Custom' }
] as const;

const EXECUTION_OPTIONS = [
  {
    key: 'completion',
    label: 'Completion-based Payment',
    description: 'Payment is executed based on project completion and upfront advances at start of project',
  },
  {
    key: 'milestone',
    label: 'Milestone-based Invoicing',
    description: 'Payment is executed based on preset project deliverables and milestones',
  },
] as const;

export default function TimelinePaymentPlan({
  startType,
  onStartTypeChange,
  customStartDate,
  onCustomStartDateChange,
  endDate,
  onEndDateChange,
  executionMethod,
  onExecutionMethodChange,
  lowerBudget,
  onLowerBudgetChange,
  upperBudget,
  onUpperBudgetChange,
}: TimelinePaymentPlanProps) {
  const [showStartCalendar, setShowStartCalendar] = useState(false);

  const handleStartTypeChange = (option: string) => {
    const newStartType = option as StartType;
    onStartTypeChange(newStartType);
    setShowStartCalendar(newStartType === 'Custom');
    if (newStartType === 'Immediately') {
      onCustomStartDateChange(null);
    }
  };

  const handleStartCalendarSelect = (date: Date | undefined) => {
    if (date) {
      onCustomStartDateChange(date);
      setShowStartCalendar(false);
    }
  };

  const handleEndDateSelect = (date: Date | undefined) => {
    onEndDateChange(date ?? null);
  };

  // Calculate duration label
  const getDurationLabel = () => {
    if (!endDate) return 'Pick a date';
    
    const startDate = startType === 'Immediately' ? new Date() : customStartDate;
    if (!startDate) return format(endDate, 'PPP');

    const weeks = differenceInWeeks(endDate, startDate);
    const months = differenceInMonths(endDate, startDate);

    if (months >= 1) {
      return `${months} month${months > 1 ? 's' : ''}`;
    } else if (weeks >= 1) {
      return `${weeks} week${weeks > 1 ? 's' : ''}`;
    } else {
      return 'Less than 1 week';
    }
  };

  // Show formatted date as label if a date is selected
  let startDropdownLabel: string = startType;
  if (startType === 'Custom' && customStartDate) {
    startDropdownLabel = format(customStartDate, 'PPP');
  }

  return (
    <div className="space-y-8">
      {/* Project Start Date */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700 mb-2">
            How soon will this project begin?
          </label>
          <Listbox value={startType} onChange={handleStartTypeChange}>
            {({ open }) => (
              <div className="relative">
                <Listbox.Button
                  className={clsx(
                    "w-full rounded-xl bg-white px-4 py-3 text-sm text-left flex items-center justify-between transition border border-gray-300",
                    "focus:outline-none focus:ring-0 focus:border-[#eb1966]",
                  )}
                  style={{ boxShadow: 'none' }}
                >
                  <span className="text-gray-900">{startDropdownLabel}</span>
                  <ChevronDown className="w-5 h-5 text-gray-500 ml-2" />
                </Listbox.Button>
                <Listbox.Options
                  className="absolute mt-1 w-full bg-white rounded-xl z-10 shadow-lg border border-gray-200 outline-none focus:outline-none"
                  style={{
                    boxShadow: '0 4px 20px 0 rgba(0,0,0,0.1)',
                    outline: 'none',
                  }}
                >
                  {START_OPTIONS.map((option) => (
                    <Listbox.Option
                      key={option.value}
                      value={option.value}
                      className={({ active }) =>
                        clsx(
                          "cursor-pointer px-4 py-3 text-sm first:rounded-t-xl last:rounded-b-xl",
                          active ? 'bg-[#FCD5E3] text-[#eb1966]' : 'text-gray-800'
                        )
                      }
                    >
                      {option.label}
                    </Listbox.Option>
                  ))}
                </Listbox.Options>
              </div>
            )}
          </Listbox>
          {startType === 'Custom' && showStartCalendar && (
            <div className="mt-3 rounded-xl bg-white p-4 border border-gray-200 shadow-sm">
              <Calendar
                mode="single"
                selected={customStartDate ?? undefined}
                onSelect={handleStartCalendarSelect}
                fromDate={new Date()}
                initialFocus
                required
                className="scale-95 origin-top-left"
              />
            </div>
          )}
        </div>

        {/* Project Duration */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700 mb-2">
            What&apos;s the duration for this project?
          </label>
          <Popover className="relative w-full">
            <Popover.Button
              className={clsx(
                'w-full rounded-xl bg-white px-4 py-3 text-sm text-left flex items-center justify-between border border-gray-300 focus:outline-none focus:ring-0 focus:border-[#eb1966] transition'
              )}
              style={{ boxShadow: 'none' }}
            >
              <span className="text-gray-900">{getDurationLabel()}</span>
              <CalendarIcon className="w-5 h-5 text-gray-500" />
            </Popover.Button>

            <Popover.Panel className="absolute z-10 mt-2 bg-white rounded-xl p-4 shadow-lg border border-gray-200">
              <Calendar
                mode="single"
                selected={endDate ?? undefined}
                onSelect={handleEndDateSelect}
                fromDate={startType === 'Immediately' ? new Date() : customStartDate ?? new Date()}
                className="scale-95 origin-top-left"
                initialFocus
              />
            </Popover.Panel>
          </Popover>
        </div>
      </div>

      {/* Invoice Execution Method */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-4 block">
          Choose invoice execution method
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {EXECUTION_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              className={`
                relative p-6 rounded-2xl border-2 transition-all duration-200 hover:scale-105
                text-center min-h-[140px] flex flex-col justify-center
                ${executionMethod === option.key
                  ? 'bg-[#FCD5E3] border-[#eb1966] text-[#eb1966]'
                  : 'bg-[#FCD5E3] border-[#FCD5E3] text-gray-700 hover:border-[#eb1966]'
                }
              `}
              onClick={() => onExecutionMethodChange(option.key)}
            >
              <div>
                <h3 className="text-lg font-semibold mb-2 text-center">
                  {option.label}
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed text-center">
                  {option.description}
                </p>
              </div>
              
              {/* Selection indicator */}
              {executionMethod === option.key && (
                <div className="absolute top-4 right-4 w-6 h-6 bg-[#eb1966] rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Budget Range with Upfront Commitment */}
      <BudgetWithUpfront
        executionMethod={executionMethod}
        lowerBudget={lowerBudget}
        onLowerBudgetChange={onLowerBudgetChange}
        upperBudget={upperBudget}
        onUpperBudgetChange={onUpperBudgetChange}
      />
    </div>
  );
}
