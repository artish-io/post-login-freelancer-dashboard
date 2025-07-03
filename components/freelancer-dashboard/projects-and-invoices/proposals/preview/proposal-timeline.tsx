'use client';

import { useEffect, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { format } from 'date-fns';

interface Milestone {
  id: string;
  title: string;
  description: string;
  startDate: string | Date | null;
  endDate: string | Date | null;
}

export default function ProposalTimeline() {
  const [milestones, setMilestones] = useState<Milestone[]>([]);

  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        const res = await fetch('/api/proposals/preview-cache');
        const json = await res.json();
        if (Array.isArray(json.milestones)) {
          setMilestones(json.milestones);
        }
      } catch (error) {
        console.error('Error loading timeline:', error);
      }
    };

    fetchTimeline();
  }, []);

  if (!milestones.length) {
    return (
      <p className="text-sm text-gray-500 italic mt-2">No milestones available</p>
    );
  }

  return (
    <div className="relative px-8 pb-10"> {/* ⛔ pt-6 removed */}
      <ul className="space-y-10 relative">
        {/* Vertical line behind bullets */}
        <div className="absolute top-3 left-4 w-[2px] bg-gray-300 h-full z-0" />

        {milestones.map((milestone) => {
          const start = milestone.startDate
            ? format(new Date(milestone.startDate), 'MMM d')
            : null;
          const end = milestone.endDate
            ? format(new Date(milestone.endDate), 'MMM d')
            : null;

          return (
            <li key={milestone.id} className="relative flex items-start gap-6">
              {/* Dot */}
              <div className="relative z-10 mt-1.5">
                <div className="w-8 h-8 rounded-full border-2 border-gray-400 bg-white flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-gray-400" />
                </div>
              </div>

              {/* Content */}
              <div className="text-sm max-w-full">
                {(start || end) && (
                  <p className="text-xs italic text-gray-500 mb-1">
                    {start}{start && end ? ' – ' : ''}{end}
                  </p>
                )}
                <h3 className="text-[1.125rem] font-normal text-gray-900 leading-tight mb-1">
                  {milestone.title}
                </h3>
                {milestone.description && (
                  <p className="text-gray-700 text-[0.95rem] leading-snug max-w-prose">
                    {milestone.description}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}