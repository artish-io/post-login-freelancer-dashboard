'use client';

type Props = {
  value: string;
  onChange: (val: string) => void;
};

export default function ProposalProjectScopeInput({ value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-black">
        Project Scope and Deliverables
      </label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={5}
        placeholder="Add a brief description of the project scope"
        className="border border-gray-300 rounded-2xl px-4 py-3 text-sm w-full resize-none bg-white focus:outline-none focus:ring-2 focus:ring-black transition"
      />
    </div>
  );
}