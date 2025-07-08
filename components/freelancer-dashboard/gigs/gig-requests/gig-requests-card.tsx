

'use client';

import Image from 'next/image';

type GigRequestCardProps = {
  organizationLogo: string;
  organizationName: string;
  organizationVerified: boolean;
  projectCommissioner: string;
  requiredSkill: string;
  rateRange: string;
  onClick?: () => void;
};

export default function GigRequestsCard({
  organizationLogo,
  organizationName,
  organizationVerified,
  projectCommissioner,
  requiredSkill,
  rateRange,
  onClick,
}: GigRequestCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-4 py-3 bg-white rounded-2xl shadow-sm hover:shadow-md transition-all border border-gray-200"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100">
          <Image src={organizationLogo} alt={organizationName} width={40} height={40} />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1">
            <span className="text-sm font-semibold text-pink-600">{organizationName}</span>
            {organizationVerified && (
              <Image src="/icons/verified.webp" alt="Verified" width={14} height={14} />
            )}
          </div>
          <span className="text-sm text-gray-700">{projectCommissioner}</span>
        </div>
      </div>
      <div className="flex items-center gap-10">
        <div className="text-sm font-medium text-gray-900">{requiredSkill}</div>
        <div className="text-sm text-gray-700">{rateRange}</div>
      </div>
    </button>
  );
}