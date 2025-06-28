'use client';

type ExecutionMethod = 'completion' | 'milestone';

interface Props {
  value: ExecutionMethod;
  onChange: (val: ExecutionMethod) => void;
}

const OPTIONS = [
  {
    key: 'completion',
    label: 'Completion-based Payment',
    description: 'Payment on project completion or advances at start',
  },
  {
    key: 'milestone',
    label: 'Milestone-based Invoicing',
    description: 'Payment on preset deliverables and milestones',
  },
] as const;

export default function ProposalExecutionMethod({ value, onChange }: Props) {
  return (
    <div className="w-full mt-2 mb-2">
      <div className="grid grid-cols-2 gap-2">
        {OPTIONS.map((option) => (
          <button
            key={option.key}
            type="button"
            className={`
              w-full flex flex-col items-center rounded-lg md:rounded-2xl shadow-sm md:shadow p-1.5 md:p-6 transition
              ${value === option.key
                ? 'bg-black text-white'
                : 'bg-gray-400 bg-opacity-60 text-white'}
              focus:outline-none
            `}
            onClick={() => onChange(option.key)}
          >
            <span className="text-xs md:text-lg font-bold mb-1 md:mb-2 leading-tight text-center">{option.label}</span>
            <span className="text-[10px] md:text-sm opacity-80 text-center leading-tight">{option.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}