'use client';

import { Trash2 } from 'lucide-react';

type Props = {
  milestone: {
    id: number;
    title: string;
    description?: string;
    rate: number;
  };
  onUpdate: (
    id: number,
    field: 'title' | 'description' | 'rate',
    value: string | number
  ) => void;
  onRemove: (id: number) => void;
  readOnly?: boolean;
};

export default function MilestoneInputRow({
  milestone,
  onUpdate,
  onRemove,
  readOnly = false
}: Props) {
  return (
    <div className="flex flex-col gap-2 w-full border border-gray-300 rounded-xl p-4">
      {/* Title & Rate Row */}
      <div className="flex items-start gap-4 w-full">
        <div className="flex-1">
          <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">
            Task / Deliverable Title
          </label>
          <input
            type="text"
            placeholder="e.g. Develop colour palette"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
            value={milestone.title}
            onChange={(e) => onUpdate(milestone.id, 'title', e.target.value)}
            disabled={readOnly}
          />
        </div>

        <div className="w-28">
          <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">
            Rate
          </label>
          <input
            type="number"
            min={0}
            step="0.01"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-pink-500"
            value={isNaN(milestone.rate) ? '' : milestone.rate}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              onUpdate(milestone.id, 'rate', isNaN(val) ? 0 : val);
            }}
            disabled={readOnly}
          />
        </div>

        {!readOnly && (
          <button
            type="button"
            onClick={() => onRemove(milestone.id)}
            className="mt-6 text-gray-400 hover:text-red-600"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Optional Description */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">
          Description <span className="text-gray-400">(Optional)</span>
        </label>
        <textarea
          rows={2}
          placeholder="Add supporting context or clarifications..."
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
          value={milestone.description || ''}
          onChange={(e) => onUpdate(milestone.id, 'description', e.target.value)}
          disabled={readOnly}
        />
      </div>
    </div>
  );
}