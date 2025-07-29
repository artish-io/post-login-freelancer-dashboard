'use client';

import MilestoneInputRow from './milestone-input-row';

type Milestone = {
  id: number;
  title: string;
  description?: string;
  rate: number;
  taskId?: number; // Optional task ID for tracking invoiced tasks
};

type Props = {
  milestones: Milestone[];
  onUpdate: (
    id: number,
    field: 'title' | 'description' | 'rate',
    value: string | number
  ) => void;
  onRemove: (id: number) => void;
  onAdd: () => void;
  readOnly?: boolean; // 👈 NEW
};

export default function MilestoneListEditor({
  milestones,
  onUpdate,
  onRemove,
  onAdd,
  readOnly = false // 👈 default to false so existing pages keep working
}: Props) {
  const total = milestones.reduce((sum, m) => sum + Number(m.rate || 0), 0);

  return (
    <div className="flex flex-col gap-4">
      {milestones.map((milestone) => (
        <MilestoneInputRow
          key={milestone.id}
          milestone={milestone}
          onUpdate={onUpdate}
          onRemove={onRemove}
          readOnly={readOnly} // 👈 pass down to row
        />
      ))}

      {!readOnly && (
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-2 text-sm font-medium text-black mt-2"
        >
          <span className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-lg">+</span>
          Add task / deliverables
        </button>
      )}

      <div className="flex justify-between border-t pt-4 text-sm font-medium">
        <span>Total</span>
        <span>${total.toFixed(2)}</span>
      </div>
    </div>
  );
}