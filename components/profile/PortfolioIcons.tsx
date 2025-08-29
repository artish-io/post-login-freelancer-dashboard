'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import Image from 'next/image';
import OutlinksModal from './OutlinksModal';

export type Outlink = {
  id: string;
  platform: string;
  url: string;
  label?: string;
  order: number;
  createdAt?: string;
};

interface PortfolioIconsProps {
  outlinks: Outlink[];
  isEditMode: boolean;
  onUpdateOutlinks: (outlinks: Outlink[]) => void;
}

const platformIconPaths: Record<string, string> = {
  linkedin: '/icons/outlinks/linkedin.png',
  github: '/icons/outlinks/github.png',
  behance: '/icons/outlinks/social.png', // 
  dribbble: '/icons/outlinks/dribble.png', //
  notion: '/icons/outlinks/notion.png',
  googledocs: '/icons/outlinks/document.png',
  airtable: '/icons/outlinks/airtable.png',
  website: '/icons/outlinks/personal-website.png',
  other: '/icons/outlinks/personal-website.png',
};

export default function PortfolioIcons({ outlinks, isEditMode, onUpdateOutlinks }: PortfolioIconsProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenModal = () => {
    if (isEditMode) {
      setIsModalOpen(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isEditMode && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      setIsModalOpen(true);
    }
  };

  const handleUpdateOutlinks = (updatedOutlinks: Outlink[]) => {
    onUpdateOutlinks(updatedOutlinks);
    setIsModalOpen(false);
  };

  const renderIcon = (outlink: Outlink) => {
    const iconPath = platformIconPaths[outlink.platform] || platformIconPaths.other;
    return (
      <a
        key={outlink.id}
        href={outlink.url}
        target="_blank"
        rel="noopener noreferrer"
        className="w-8 h-8 p-1.5 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
        aria-label={`Visit ${outlink.label || outlink.platform}`}
        onClick={(e) => {
          if (isEditMode) {
            e.preventDefault();
            handleOpenModal();
          }
        }}
      >
        <Image
          src={iconPath}
          alt={outlink.platform}
          width={20}
          height={20}
          className="w-full h-full object-contain"
        />
      </a>
    );
  };

  const renderEditModeContainer = () => {
    if (!isEditMode) {
      return (
        <div className="flex items-center gap-2">
          {outlinks.map(renderIcon)}
        </div>
      );
    }

    return (
      <div
        role="button"
        tabIndex={0}
        onClick={handleOpenModal}
        onKeyDown={handleKeyDown}
        className="flex items-center gap-2 p-2 -m-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#eb1966] focus:ring-offset-2"
        aria-label="Edit portfolio links"
      >
        {outlinks.length > 0 ? (
          <>
            {outlinks.map((outlink) => {
              const iconPath = platformIconPaths[outlink.platform] || platformIconPaths.other;
              return (
                <div
                  key={outlink.id}
                  className="w-8 h-8 p-1.5 bg-gray-100 rounded-full"
                >
                  <Image
                    src={iconPath}
                    alt={outlink.platform}
                    width={20}
                    height={20}
                    className="w-full h-full object-contain"
                  />
                </div>
              );
            })}
            {outlinks.length < 3 && (
              <div className="w-8 h-8 p-1.5 bg-gray-100 rounded-full border-2 border-dashed border-gray-300">
                <Plus className="w-full h-full text-gray-400" />
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="w-8 h-8 p-1.5 bg-gray-100 rounded-full border-2 border-dashed border-gray-300">
              <Plus className="w-full h-full text-gray-400" />
            </div>
            <span>Add portfolio links</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {renderEditModeContainer()}
      
      {isModalOpen && (
        <OutlinksModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          outlinks={outlinks}
          onSave={handleUpdateOutlinks}
        />
      )}
    </>
  );
}
