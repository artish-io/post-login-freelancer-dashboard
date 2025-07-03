// components/freelancer-dashboard/projects-and-invoices/proposals/proposal-milestones-editor.tsx

'use client';

import { v4 as uuidv4 } from 'uuid';
import ProposalMilestoneItem from './proposal-milestone-item';
import ProposalMilestonesFixed from './proposal-milestones-fixed';

export type Milestone = {
  id: string;
  title: string;
  description: string;
  startDate: Date | null;
  endDate: Date | null;
  amount: string | number;
};

type Props = {
  milestones: Milestone[];
  onChange: (updated: Milestone[]) => void;
  paymentCycle: 'Fixed Amount' | 'Hourly Rate';
  totalBid: number;
  projectEndDate: Date | null;
};

export default function ProposalMilestonesEditor({
  milestones,
  onChange,
  paymentCycle,
  totalBid,
  projectEndDate,
}: Props) {
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

      {paymentCycle === 'Hourly Rate' ? (
        <>
          {milestones.map((milestone) => (
            <ProposalMilestoneItem
              key={milestone.id}
              data={milestone}
              onUpdate={(update: Partial<Milestone>) =>
                handleUpdate(milestone.id, update)
              }
              onRemove={() => handleRemove(milestone.id)}
              endLimit={projectEndDate} // ✅ constrain hourly milestones
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
        </>
      ) : (
        <ProposalMilestonesFixed
          milestones={milestones}
          onChange={onChange}
          totalBid={totalBid}
          projectEndDate={projectEndDate} // ✅ FIXED: pass to calendar
        />
      )}
    </div>
  );
}