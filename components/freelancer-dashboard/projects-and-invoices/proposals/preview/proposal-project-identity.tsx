// components/freelancer-dashboard/projects-and-invoices/proposals/preview/proposal-project-identity.tsx

'use client';

import Image from 'next/image';

interface Props {
  logoUrl?: string;
  title: string;
  summary: string;
  typeTags?: string[];
}

export default function ProposalProjectIdentity({ logoUrl, title, summary, typeTags = [] }: Props) {
  return (
    <div className="bg-white z-40 pt-2 pb-3 px-1">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full border border-gray-300 bg-white overflow-hidden">
          <Image
            src={logoUrl || '/icons/default-logo.png'}
            alt="Project Logo"
            width={48}
            height={48}
            className="object-contain"
          />
        </div>
        <h1 className="text-2xl font-semibold text-pink-600 leading-snug">{title}</h1>
      </div>

      <p className="text-sm text-gray-700 leading-relaxed mt-2 max-w-full md:max-w-2xl">
        {summary}
      </p>

      {typeTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {typeTags.map((tag) => (
            <span
              key={tag}
              className="bg-gray-100 text-gray-800 text-xs font-medium px-3 py-1 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}