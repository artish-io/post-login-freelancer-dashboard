'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Edit3, Check, X } from 'lucide-react';

type Props = {
  about: string;
  isOwnProfile?: boolean;
  onUpdateAbout?: (newAbout: string) => void;
};

export default function AboutSection({ 
  about, 
  isOwnProfile = false, 
  onUpdateAbout 
}: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedAbout, setEditedAbout] = useState(about);

  const handleSave = () => {
    if (onUpdateAbout && editedAbout.trim() !== about) {
      onUpdateAbout(editedAbout.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedAbout(about);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel();
    }
    // Allow Ctrl/Cmd + Enter to save
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      handleSave();
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">About</h3>
        {isOwnProfile && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <Edit3 className="w-4 h-4" />
            Edit
          </button>
        )}
      </div>

      {isEditing ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <textarea
            value={editedAbout}
            onChange={(e) => setEditedAbout(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tell others about yourself, your experience, and what makes you unique..."
            className="w-full min-h-[120px] p-4 border border-gray-300 rounded-lg text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-[#eb1966] focus:border-transparent"
            autoFocus
          />
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-[#eb1966] text-white rounded-lg text-sm hover:bg-[#d1175a] transition-colors"
            >
              <Check className="w-4 h-4" />
              Save
            </button>
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg text-sm transition-colors"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
          
          <p className="text-xs text-gray-500">
            Tip: Use Ctrl+Enter (Cmd+Enter on Mac) to save quickly
          </p>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="prose prose-sm max-w-none"
        >
          {about ? (
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
              {about}
            </p>
          ) : (
            <div className="text-gray-500 italic">
              {isOwnProfile ? (
                <span>
                  Click &quot;Edit&quot; to add information about yourself, your experience, and skills.
                </span>
              ) : (
                <span>No about information available.</span>
              )}
            </div>
          )}
        </motion.div>
      )}
    </section>
  );
}
