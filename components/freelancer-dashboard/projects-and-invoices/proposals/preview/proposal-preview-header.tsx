'use client';

interface Props {
  projectId: string;
  tags: string[];
  isProposal?: boolean; // Optional prop to indicate if this is a proposal
}

export default function ProposalPreviewHeader({ projectId, tags, isProposal = false }: Props) {
  const idLabel = isProposal ? "Proposal ID" : "Project ID";

  return (
    <div className="bg-white z-40 pt-3 pb-1 px-1">
      <p className="text-sm text-gray-900 font-semibold">
        {idLabel}: <span className="font-bold">#{projectId}</span>
      </p>
      <div className="flex gap-2 mt-2 flex-wrap">
        {tags.map((tag, index) => (
          <span
            key={index}
            className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-full"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}