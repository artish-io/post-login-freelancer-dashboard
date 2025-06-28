'use client';

import { v4 as uuidv4 } from 'uuid';
import ProposalMilestoneItem from './proposal-milestone-item';

export type Milestone = {
  id: string;
  title: string;
  description: string;
  startDate: Date | null;
  endDate: Date | null;
  amount: string;
};

type Props = {
  milestones: Milestone[];
  onChange: (updated: Milestone[]) => void;
};

export default function ProposalMilestonesEditor({ milestones, onChange }: Props) {
  const handleAdd = () => {
    const newMilestone: Milestone = {
      id: uuidv4(),
      title: '',
      description: '',
      startDate: null,
      endDate: null,
      amount: '',
    };
    onChange([...milestones, newMilestone]);
  };

  const handleUpdate = (id: string, updatedFields: Partial<Milestone>) => {
    const updatedMilestones = milestones.map((m) =>
      m.id === id ? { ...m, ...updatedFields } : m
    );
    onChange(updatedMilestones);
  };

  const handleRemove = (id: string) => {
    const filtered = milestones.filter((m) => m.id !== id);
    onChange(filtered);
  };

  return (
    <div className="flex flex-col gap-4">
      <label className="text-sm font-medium text-black">
        Billable Project Milestones
      </label>

      {milestones.map((milestone) => (
        <ProposalMilestoneItem
          key={milestone.id}
          data={milestone}
          onUpdate={(update: Partial<Milestone>) => handleUpdate(milestone.id, update)}
          onRemove={() => handleRemove(milestone.id)}
        />
      ))}

      <button
        type="button"
        onClick={handleAdd}
        className="flex items-center gap-2 text-sm text-black font-medium px-4 py-2 border border-black rounded-full w-max hover:bg-black hover:text-white transition"
      >
        <span className="text-xl leading-none">＋</span>
        Add task / deliverables
      </button>
    </div>
  );
}