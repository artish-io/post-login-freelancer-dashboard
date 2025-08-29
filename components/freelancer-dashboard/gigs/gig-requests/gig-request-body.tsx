

'use client';

import Image from 'next/image';
import { Calendar } from 'lucide-react';

type Milestone = {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
};

type Props = {
  description: string;
  skills: string[];
  tools: string[];
  toolIconUrl: string;
  briefUrl: string;
  notes: string;
  milestones?: Milestone[];
  createdAt: string;
  postedByName: string;
  postedByAvatar: string;
};

export default function GigRequestBody({
  description,
  skills,
  tools,
  toolIconUrl,
  briefUrl,
  notes,
  milestones = [],
  createdAt,
  postedByName,
  postedByAvatar,
}: Props) {
  return (
    <div className="w-full bg-white rounded-2xl border border-gray-200 p-6 relative">
      {/* Project Description */}
      <p className="text-sm text-gray-600 mb-4">{description}</p>

      {/* Tools Section */}
      <div className="flex gap-2 mb-6">
        {tools.map((tool, idx) => (
          <span
            key={idx}
            className="px-3 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700"
          >
            {tool}
          </span>
        ))}
      </div>

      {/* Tool Icon and Brief */}
      <div className="flex items-center gap-2 mb-6">
        <Image src={toolIconUrl} alt="Tool Icon" width={20} height={20} />
        <a
          href={briefUrl}
          className="text-sm text-gray-800 underline hover:text-pink-500"
          target="_blank"
        >
          Brief
        </a>
      </div>

      {/* Project Milestones Section */}
      <div className="mb-6">
        <p className="text-xs text-gray-400 font-semibold mb-3">Project Milestones:</p>
        {milestones && milestones.length > 0 ? (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {milestones.map((milestone, index) => (
              <div key={milestone.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-900">
                    {index + 1}. {milestone.title}
                  </h4>
                  <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-md border">
                    Milestone {index + 1}
                  </span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed mb-3">
                  {milestone.description}
                </p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>Start: {new Date(milestone.startDate).toLocaleDateString()}</span>
                  <span>•</span>
                  <span>End: {new Date(milestone.endDate).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic">No milestones defined for this project.</p>
        )}
      </div>

      {/* Footer with Avatar and Date */}
      <div className="border-t pt-4 flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center gap-2">
          <Image
            src={postedByAvatar}
            alt="Avatar"
            width={24}
            height={24}
            className="rounded-full"
          />
          <span className="text-sm text-gray-800">{postedByName}</span>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <Calendar className="w-4 h-4" />
          <span>{createdAt}</span>
        </div>
      </div>
    </div>
  );
}