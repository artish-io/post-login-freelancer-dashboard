'use client';

import { FC } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

type GigRequestHeaderProps = {
  skills: string[];
  title: string;
  subtitle: string;
  organizationLogo?: string;
  createdAt: string;
  status?: 'Available' | 'Pending' | 'Accepted' | 'Rejected';
  projectId?: number;
};

const GigRequestHeader: FC<GigRequestHeaderProps> = ({
  skills,
  title,
  subtitle,
  organizationLogo,
  createdAt,
  status,
  projectId,
}) => {
  const router = useRouter();

  const handleTitleClick = () => {
    if (status === 'Accepted' && projectId && projectId > 0) {
      router.push(`/freelancer-dashboard/projects-and-invoices/project-tracking/${projectId}`);
    }
  };
  return (
    <div className="flex flex-col gap-3 relative border border-transparent rounded-xl px-4 pt-4 pb-2 bg-white">
      <div className="absolute left-0 top-4 h-[calc(100%-2rem)] w-[4px] bg-pink-500 rounded-r-full" />

      <div className="flex items-center gap-2">
        {skills.map((skill, index) => (
          <span
            key={index}
            className={`text-xs font-medium px-2 py-1 rounded-md ${
              index === 0
                ? 'bg-pink-100 text-pink-800'
                : 'bg-gray-200 text-gray-800'
            }`}
          >
            {skill}
          </span>
        ))}
      </div>

      {/* Title - clickable if accepted and has valid projectId */}
      {status === 'Accepted' && projectId && projectId > 0 ? (
        <button
          onClick={handleTitleClick}
          className="text-[20px] font-semibold leading-snug hover:underline transition-colors text-left"
          style={{ color: '#eb1966' }}
        >
          {title}
        </button>
      ) : (
        <h2 className="text-[20px] font-semibold text-gray-900 leading-snug">{title}</h2>
      )}

      {/* Organization Info */}
      <div className="flex items-center gap-2 mt-2">
        {organizationLogo && (
          <Image
            src={organizationLogo}
            alt="Organization Logo"
            width={20}
            height={20}
            className="rounded"
          />
        )}
        <p className="text-sm text-gray-500 leading-tight">{subtitle}</p>
      </div>

      <div className="flex justify-end text-xs text-gray-400 font-medium mt-1">
        Created {createdAt}
      </div>
    </div>
  );
};

export default GigRequestHeader;