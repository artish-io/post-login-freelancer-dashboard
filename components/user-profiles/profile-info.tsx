'use client';

import { Plus, X } from 'lucide-react';
import { useState } from 'react';
import AddSkillToolModal from './add-skill-tool-modal';

interface ProfileInfoProps {
  bio?: string;
  skills: string[];
  tools: string[];
  responsibilities?: string[];
  isOwnProfile: boolean;
  userType?: 'freelancer' | 'commissioner';
  availableSkills?: string[];
  availableTools?: string[];
  onAddSkillTool?: (type: 'skill' | 'tool', value: string) => void;
  onRemoveSkillTool?: (type: 'skill' | 'tool', value: string) => void;
}

export default function ProfileInfo({
  bio,
  skills,
  tools,
  responsibilities,
  isOwnProfile,
  userType = 'freelancer',
  availableSkills = [],
  availableTools = [],
  onAddSkillTool,
  onRemoveSkillTool
}: ProfileInfoProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  // Combine skills and tools for the unified section
  const allSkillsAndTools = [
    ...skills.map(skill => ({ name: skill, type: 'skill' })),
    ...tools.map(tool => ({ name: tool, type: 'tool' }))
  ];

  return (
    <div className="space-y-8">
      {/* Bio Section */}
      {bio && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">About</h2>
          <p className="text-gray-600 leading-relaxed">{bio}</p>
        </div>
      )}

      {/* Skills and Tools Combined Section - Only for freelancers */}
      {userType === 'freelancer' && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Skills and Tools</h2>
          <div className="flex flex-wrap gap-2">
            {allSkillsAndTools.map((item, index) => (
              <span
                key={`${item.type}-${item.name}-${index}`}
                className="px-3 py-2 bg-[#FCD5E3] text-sm rounded-full text-gray-800 flex items-center gap-2 group"
              >
                {item.name}
                {isOwnProfile && onRemoveSkillTool && (
                  <button
                    onClick={() => onRemoveSkillTool(item.type as 'skill' | 'tool', item.name)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            ))}

            {/* Add button for own profile */}
            {isOwnProfile && (
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-3 py-2 border-2 border-dashed border-gray-300 text-gray-500 rounded-full text-sm hover:border-gray-400 hover:text-gray-700 transition-colors"
              >
                <div className="w-4 h-4 rounded-full bg-[#FCD5E3] flex items-center justify-center">
                  <Plus className="w-3 h-3" />
                </div>
                Add skill or tool
              </button>
            )}
          </div>
        </div>
      )}

      {/* Responsibilities Section - Only for commissioners */}
      {userType === 'commissioner' && responsibilities && responsibilities.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Responsibilities</h2>
          <ul className="space-y-2">
            {responsibilities.map((responsibility, index) => (
              <li key={index} className="text-gray-600 flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                {responsibility}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Add Skill/Tool Modal */}
      <AddSkillToolModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={(type, value) => {
          if (onAddSkillTool) {
            onAddSkillTool(type, value);
          }
          setShowAddModal(false);
        }}
        availableSkills={availableSkills}
        availableTools={availableTools}
      />
    </div>
  );
}
