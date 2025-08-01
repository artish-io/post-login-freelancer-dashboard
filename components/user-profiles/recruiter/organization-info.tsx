'use client';

import Image from 'next/image';

interface Organization {
  id: number;
  name: string;
  logo: string;
  address: string;
  bio?: string;
}

interface OrganizationInfoProps {
  organization: Organization;
  showBio?: boolean;
}

export default function OrganizationInfo({ organization, showBio = false }: OrganizationInfoProps) {
  const { name, logo, address, bio } = organization;

  return (
    <div className="mb-8">
      {/* Organization Header */}
      <div className="flex items-start gap-4 mb-4">
        {/* Organization Logo */}
        <div className="flex-shrink-0">
          <Image
            src={logo}
            alt={`${name} logo`}
            width={64}
            height={64}
            className="rounded-lg object-contain border border-gray-200"
          />
        </div>

        {/* Organization Name */}
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-[#eb1966] mb-1">
            {name}
          </h2>
        </div>
      </div>

      {/* Organization Description */}
      <div className="mb-6">
        <p className="text-sm text-gray-600 leading-relaxed">
          {showBio && bio ? bio : getOrganizationDescription(name, address)}
        </p>
      </div>
    </div>
  );
}

// Helper function to generate organization descriptions based on name and address
function getOrganizationDescription(name: string, address: string): string {
  // Extract location from address for context
  const location = address.split(',').slice(-2).join(',').trim();
  
  // Generate contextual descriptions based on organization name
  if (name.toLowerCase().includes('parks')) {
    return `${name} is responsible for the creation, maintenance, and regulation of public green spaces across ${location}. Its mission is to promote environmental sustainability, improve urban aesthetics, and enhance quality of life for residents.`;
  } else if (name.toLowerCase().includes('wellness')) {
    return `${name} is a health and wellness organization based in ${location}, dedicated to promoting holistic well-being through innovative programs and services that support physical, mental, and emotional health.`;
  } else if (name.toLowerCase().includes('studios') || name.toLowerCase().includes('media')) {
    return `${name} is a creative media production company located in ${location}, specializing in content creation, digital media, and innovative storytelling across multiple platforms.`;
  } else if (name.toLowerCase().includes('tech') || name.toLowerCase().includes('digital')) {
    return `${name} is a technology company based in ${location}, focused on developing cutting-edge digital solutions and innovative software products for modern businesses.`;
  } else {
    return `${name} is a professional organization based in ${location}, committed to delivering high-quality services and innovative solutions to meet the evolving needs of its clients and community.`;
  }
}
