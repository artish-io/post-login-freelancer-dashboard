'use client';

import Image from 'next/image';
import { MapPinIcon, Building2, DollarSign } from 'lucide-react';

type Organization = {
  id: number;
  name: string;
  logo: string;
  address: string;
};

type Props = {
  name: string;
  title: string;
  avatar: string;
  organization: Organization;
  projectsCommissioned: number;
  totalBudget: number;
};

export default function RecruiterProfileHeader({
  name,
  title,
  avatar,
  organization,
  projectsCommissioned,
  totalBudget
}: Props) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <section className="flex items-start gap-6">
      <Image
        src={avatar}
        alt={`${name} avatar`}
        width={120}
        height={120}
        className="rounded-full object-cover border border-gray-300"
      />

      <div className="flex flex-col gap-3 mt-2 flex-1">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{name}</h1>
          <p className="text-lg text-gray-600">{title}</p>
        </div>

        {/* Organization Info */}
        <div className="flex items-center gap-4 p-4 bg-[#FCD5E3] rounded-lg">
          <Image
            src={organization.logo}
            alt={`${organization.name} logo`}
            width={48}
            height={48}
            className="rounded-lg object-cover"
          />
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{organization.name}</h3>
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <MapPinIcon className="w-4 h-4" />
              {organization.address}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-full">
            <Building2 className="w-4 h-4" />
            <span className="font-medium">{projectsCommissioned}</span>
            <span>Projects Commissioned</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-full">
            <DollarSign className="w-4 h-4" />
            <span className="font-medium">{formatCurrency(totalBudget)}</span>
            <span>Total Budget</span>
          </div>
        </div>
      </div>
    </section>
  );
}
