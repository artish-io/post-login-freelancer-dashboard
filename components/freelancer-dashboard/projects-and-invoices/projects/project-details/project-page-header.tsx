'use client';

import Link from 'next/link';
import Image from 'next/image';

export type Props = {
  projectId: number;
  tags: string[];
  logoUrl: string;
  title: string;
  summary: string;
};

export default function ProjectPageHeader({
  projectId,
  tags,
  logoUrl,
  title,
  summary,
}: Props) {
  return (
    <div className="pb-6">
      {/* Back Link */}
      <Link href="/freelancer-dashboard/projects-and-invoices/project-list">
        <span className="text-sm text-gray-600 hover:text-pink-600 flex items-center gap-1">
          ← Back
        </span>
      </Link>

      {/* Project Meta Block */}
      <div className="mt-3">
        <div className="flex items-center gap-3">
          <span className="text-sm text-black font-medium">Project ID: #{projectId}</span>
        </div>

        {/* Type Tags */}
        <div className="mt-2 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="text-xs font-medium bg-[#f0f0f0] text-gray-800 rounded px-2 py-[2px]"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Logo and Title */}
        <div className="mt-4 flex items-center gap-4">
          {logoUrl && (
            <div className="w-10 h-10 relative rounded-full overflow-hidden border border-gray-300">
              <Image src={logoUrl} alt="Commissioner logo" fill className="object-cover" />
            </div>
          )}
          <h1 className="text-2xl font-semibold text-pink-700 leading-snug">
            {title}
          </h1>
        </div>

        {/* Summary */}
        <p className="mt-2 text-sm text-gray-700 max-w-2xl">{summary}</p>
      </div>
    </div>
  );
}