

'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Briefcase, MapPin, DollarSign } from 'lucide-react';
import GigDetailsExpansion from './gig-details-expansion';

type Gig = {
  id: number;
  title: string;
  organizationId: number;
  category: string;
  hourlyRateMin: number;
  hourlyRateMax: number;
  postedDate: string;
};

type Organization = {
  id: number;
  name: string;
  logo: string;
};

type Props = {
  gig: Gig;
};

export default function GigCard({ gig }: Props) {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const fetchOrganization = async () => {
      try {
        const res = await fetch('/api/organizations/' + gig.organizationId);
        const data = await res.json();
        setOrganization(data);
      } catch (error) {
        console.error('Failed to load organization:', error);
      }
    };
    fetchOrganization();
  }, [gig.organizationId]);

  const postedAgo = getPostedTimeAgo(gig.postedDate);

  return (
    <>
      <div
        className="bg-white rounded-xl p-4 shadow flex items-center justify-between hover:shadow-md transition cursor-pointer"
        onClick={() => setShowDetails(!showDetails)}
      >
        <div className="flex items-center gap-4">
          {organization && (
            <Image
              src={organization.logo}
              alt={`${organization.name} logo`}
              width={40}
              height={40}
              className="rounded-md"
            />
          )}
          <div>
            <div className="text-pink-600 font-light text-lg">{gig.title}</div>
            <div className="text-xs text-gray-500">
              {organization?.name}
            </div>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm text-gray-600">
          <div className="flex items-center gap-1 w-20">
            <MapPin size={14} />
            Remote
          </div>
          <div className="flex items-center gap-1 w-32">
            <DollarSign size={14} />
            ${gig.hourlyRateMin}–${gig.hourlyRateMax}/hr
          </div>
          <div className="w-24">{gig.category}</div>
          <div className="text-xs text-gray-400 w-20">{postedAgo}</div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              // Handle quick apply
            }}
            className="bg-black text-white px-3 py-1.5 rounded-md text-xs font-medium"
          >
            Quick Apply
          </button>
        </div>
      </div>

      <GigDetailsExpansion
        gig={gig}
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
      />
    </>
  );
}

function getPostedTimeAgo(dateStr: string): string {
  const now = new Date();
  const posted = new Date(dateStr);
  const diff = (now.getTime() - posted.getTime()) / (1000 * 60 * 60 * 24);

  if (diff < 1) return 'Today';
  if (diff < 2) return 'Yesterday';
  if (diff < 7) return `${Math.floor(diff)} days ago`;
  if (diff < 30) return `${Math.floor(diff / 7)} weeks ago`;
  return posted.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
}