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
  isEditMode?: boolean;
  onUpdateBio?: (newBio: string) => void;
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
  onRemoveSkillTool,
  isEditMode = false,
  onUpdateBio
}: ProfileInfoProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editedBio, setEditedBio] = useState(bio || '');
  // Combine skills and tools for the unified section
  const allSkillsAndTools = [
    ...skills.map(skill => ({ name: skill, type: 'skill' })),
    ...tools.map(tool => ({ name: tool, type: 'tool' }))
  ];

  return (
    <div className="space-y-8">
      {/* Bio Section */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">About</h2>
        {isEditMode && isOwnProfile ? (
          <div className="space-y-3">
            <textarea
              value={editedBio}
              onChange={(e) => setEditedBio(e.target.value)}
              onBlur={() => onUpdateBio?.(editedBio)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-0 focus:border-[#eb1966] transition-colors bg-gray-50 focus:bg-white resize-none"
              rows={4}
              placeholder="Tell us about yourself..."
            />
            <p className="text-xs text-gray-500">Changes are saved automatically</p>
          </div>
        ) : (
          <p className="text-gray-600 leading-relaxed">
            {bio || 'No bio available.'}
          </p>
        )}
      </div>

      {/* Skills and Tools Combined Section - Only for freelancers */}
      {userType === 'freelancer' && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Skills and Tools</h2>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {allSkillsAndTools.map((item, index) => (
              <span
                key={`${item.type}-${item.name}-${index}`}
                className="inline-flex items-center justify-center px-3 py-2 sm:px-4 sm:py-2.5 text-sm sm:text-base rounded-full text-gray-800 group border border-white/20 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:scale-[1.02]"
                style={{
                  backgroundColor: '#FCD5E3',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08), 0 1px 4px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                }}
              >
                <span className="font-medium whitespace-nowrap">{item.name}</span>
                {isOwnProfile && onRemoveSkillTool && (
                  <button
                    onClick={() => onRemoveSkillTool(item.type as 'skill' | 'tool', item.name)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-600 flex items-center justify-center ml-2"
                  >
                    <X className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                )}
              </span>
            ))}

            {/* Add button for own profile */}
            {isOwnProfile && (
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center justify-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 border-2 border-dashed border-gray-300 text-gray-500 rounded-full text-sm sm:text-base hover:border-gray-400 hover:text-gray-700 transition-colors min-w-fit"
              >
                <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-[#FCD5E3] flex items-center justify-center">
                  <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                </div>
                <span className="text-center font-medium">Add skill or tool</span>
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
