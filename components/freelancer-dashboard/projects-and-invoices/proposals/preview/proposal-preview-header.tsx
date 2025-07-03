'use client';

interface Props {
  projectId: string;
  tags: string[];
}

export default function ProposalPreviewHeader({ projectId, tags }: Props) {
  return (
    <div className="bg-white z-40 pt-3 pb-1 px-1">
      <p className="text-sm text-gray-900 font-semibold">
        Project ID: <span className="font-bold">#{projectId}</span>
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