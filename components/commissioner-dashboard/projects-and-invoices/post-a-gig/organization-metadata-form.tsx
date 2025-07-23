'use client';

import { useState } from 'react';
import { Upload, X } from 'lucide-react';
import Image from 'next/image';

interface Organization {
  id?: number;
  name: string;
  email: string;
  logo: string;
  address: string;
  contactPersonId: number;
  website?: string;
  description?: string;
}

interface OrganizationMetadataFormProps {
  organizationData: Organization;
  onOrganizationDataChange: (data: Organization) => void;
}

function OrganizationMetadataForm({
  organizationData,
  onOrganizationDataChange,
}: OrganizationMetadataFormProps) {
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>(organizationData.logo || '');

  const handleInputChange = (field: keyof Organization, value: string) => {
    onOrganizationDataChange({
      ...organizationData,
      [field]: value,
    });
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLogoFile(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setLogoPreview(result);
        handleInputChange('logo', result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview('');
    handleInputChange('logo', '');
  };

  return (
    <div className="space-y-6">
      {/* Logo Upload */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-3 block">
          Upload Logo
        </label>
        <div className="flex items-center gap-4">
          {/* Logo Preview */}
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-gray-200 relative">
            {logoPreview ? (
              <Image
                src={logoPreview}
                alt="Organization logo"
                fill
                className="object-cover"
              />
            ) : (
              <Upload size={24} className="text-gray-400" />
            )}
          </div>

          {/* Upload Button */}
          <div className="flex-1">
            <input
              type="file"
              id="logo-upload"
              onChange={handleLogoUpload}
              accept="image/*"
              className="hidden"
            />
            <label
              htmlFor="logo-upload"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition cursor-pointer text-sm font-medium"
            >
              <Upload size={16} />
              {logoPreview ? 'Change Logo' : 'Upload Logo'}
            </label>
            {logoPreview && (
              <button
                type="button"
                onClick={removeLogo}
                className="ml-2 text-gray-400 hover:text-red-500 transition"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Company Name */}
      <div>
        <input
          type="text"
          value={organizationData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          placeholder="Company Name"
          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-0 focus:border-[#eb1966] transition text-sm"
        />
      </div>

      {/* Company Website */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">
          Company Website
        </label>
        <input
          type="url"
          value={organizationData.website || ''}
          onChange={(e) => handleInputChange('website', e.target.value)}
          placeholder="https://example.com"
          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-0 focus:border-[#eb1966] transition text-sm"
        />
      </div>

      {/* Company Description */}
      <div>
        <div className="relative">
          <textarea
            value={organizationData.description || ''}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Company Description"
            rows={4}
            maxLength={600}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-0 focus:border-[#eb1966] transition text-sm resize-none"
          />
          <div className="absolute bottom-3 right-3 text-xs text-gray-500">
            {(organizationData.description || '').length}/600
          </div>
        </div>
      </div>

      {/* Role/Title */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">
          Role / Title
        </label>
        <input
          type="text"
          value={organizationData.address || ''}
          onChange={(e) => handleInputChange('address', e.target.value)}
          placeholder="Your role or title in the organization"
          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-0 focus:border-[#eb1966] transition text-sm"
        />
      </div>

      {/* Email (usually pre-filled from user data) */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">
          Contact Email
        </label>
        <input
          type="email"
          value={organizationData.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
          placeholder="contact@company.com"
          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-0 focus:border-[#eb1966] transition text-sm"
        />
      </div>

      {/* Additional Information */}
      <div className="bg-gray-50 rounded-xl p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">
          Why this information helps
        </h4>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>• Your company information helps freelancers understand who they&apos;ll be working with</li>
          <li>• A professional logo and description builds trust and credibility</li>
          <li>• Contact details ensure smooth communication throughout the project</li>
        </ul>
      </div>
    </div>
  );
}

export default OrganizationMetadataForm;
