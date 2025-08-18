'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';

interface CommissionerProfileInfoProps {
  bio: string;
  responsibilities: string[];
  isOwnProfile: boolean;
  viewerUserType?: 'commissioner' | 'freelancer';
}

export default function CommissionerProfileInfo({
  bio,
  responsibilities,
  isOwnProfile,
  viewerUserType = 'commissioner'
}: CommissionerProfileInfoProps) {
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [editedBio, setEditedBio] = useState(bio);
  const [localResponsibilities, setLocalResponsibilities] = useState(responsibilities);
  const [newResponsibility, setNewResponsibility] = useState('');
  const [showAddResponsibility, setShowAddResponsibility] = useState(false);

  // Only allow editing if it's own profile and viewer is a commissioner
  const canEdit = isOwnProfile && viewerUserType === 'commissioner';

  const handleSaveBio = () => {
    // TODO: Implement API call to save bio
    setIsEditingBio(false);
  };

  const handleAddResponsibility = () => {
    if (newResponsibility.trim()) {
      setLocalResponsibilities([...localResponsibilities, newResponsibility.trim()]);
      setNewResponsibility('');
      setShowAddResponsibility(false);
      // TODO: Implement API call to save responsibility
    }
  };

  const handleRemoveResponsibility = (responsibility: string) => {
    setLocalResponsibilities(localResponsibilities.filter(r => r !== responsibility));
    // TODO: Implement API call to remove responsibility
  };

  return (
    <div className="space-y-8">
      {/* About Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900">About</h3>
          {canEdit && !isEditingBio && (
            <button
              onClick={() => setIsEditingBio(true)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Edit
            </button>
          )}
        </div>
        
        {isEditingBio ? (
          <div className="space-y-3">
            <textarea
              value={editedBio}
              onChange={(e) => setEditedBio(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={6}
              placeholder="Tell us about yourself..."
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveBio}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setIsEditingBio(false);
                  setEditedBio(bio);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="text-gray-700 leading-relaxed">
            {bio || 'No bio available.'}
          </p>
        )}
      </div>

      {/* Responsibilities Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900">Responsibilities</h3>
          {canEdit && !showAddResponsibility && (
            <button
              onClick={() => setShowAddResponsibility(true)}
              className="inline-flex items-center justify-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 border-2 border-dashed border-gray-300 text-gray-500 rounded-full text-sm sm:text-base hover:border-gray-400 hover:text-gray-700 transition-colors min-w-fit"
            >
              <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-[#FCD5E3] flex items-center justify-center">
                <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
              </div>
              <span className="text-center font-medium">Add</span>
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 sm:gap-3">
          {localResponsibilities.map((responsibility, index) => (
            <div
              key={index}
              className="group inline-flex items-center justify-center px-3 py-2 sm:px-4 sm:py-2.5 rounded-full border border-white/20 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:scale-[1.02]"
              style={{
                backgroundColor: '#FCD5E3',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08), 0 1px 4px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
              }}
            >
              <span className="text-sm sm:text-base font-medium text-gray-800 whitespace-nowrap">
                {responsibility}
              </span>
              {canEdit && (
                <button
                  onClick={() => handleRemoveResponsibility(responsibility)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-600 flex items-center justify-center ml-2"
                >
                  <X className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>
              )}
            </div>
          ))}

          {showAddResponsibility && (
            <div className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-gray-100 rounded-full border border-white/20 backdrop-blur-sm min-w-fit">
              <input
                type="text"
                value={newResponsibility}
                onChange={(e) => setNewResponsibility(e.target.value)}
                placeholder="Add responsibility..."
                className="bg-transparent text-sm sm:text-base outline-none min-w-[120px] sm:min-w-[140px] text-center font-medium"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddResponsibility();
                  } else if (e.key === 'Escape') {
                    setShowAddResponsibility(false);
                    setNewResponsibility('');
                  }
                }}
                autoFocus
              />
              <button
                onClick={handleAddResponsibility}
                className="text-green-600 hover:text-green-700 transition-colors flex items-center justify-center"
              >
                <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
              </button>
              <button
                onClick={() => {
                  setShowAddResponsibility(false);
                  setNewResponsibility('');
                }}
                className="text-gray-600 hover:text-red-600 transition-colors flex items-center justify-center"
              >
                <X className="w-3 h-3 sm:w-4 sm:h-4" />
              </button>
            </div>
          )}
        </div>

        {localResponsibilities.length === 0 && !showAddResponsibility && (
          <p className="text-gray-500 text-sm">No responsibilities listed.</p>
        )}
      </div>
    </div>
  );
}
