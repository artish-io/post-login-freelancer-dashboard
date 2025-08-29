'use client';

import { useState, useRef } from 'react';
import { FileText, Upload, Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ResumeInfo {
  fileName: string;
  storedFileName: string;
  size: number;
  type: string;
  uploadedAt: string;
}

interface ResumePillProps {
  currentResume?: ResumeInfo | null;
  onResumeUpdate: (resume: ResumeInfo | null) => void;
  isOwnProfile: boolean;
}

export default function ResumePill({ 
  currentResume, 
  onResumeUpdate, 
  isOwnProfile 
}: ResumePillProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showActions, setShowActions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Only PDF, DOC, and DOCX files are allowed.');
      return;
    }

    // Validate file size (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('File too large. Maximum size is 5MB.');
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('resume', file);

      const response = await fetch('/api/freelancer/resume', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        onResumeUpdate(result.resume);
        setShowActions(false);
      } else {
        setError(result.error || 'Failed to upload resume');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setError('Failed to upload resume. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDeleteResume = async () => {
    try {
      const response = await fetch('/api/freelancer/resume', {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        onResumeUpdate(null);
        setShowActions(false);
      } else {
        setError(result.error || 'Failed to delete resume');
      }
    } catch (error) {
      console.error('Delete error:', error);
      setError('Failed to delete resume. Please try again.');
    }
  };

  const handleDownload = () => {
    if (currentResume) {
      window.open(`/api/freelancer/resume/download/${currentResume.storedFileName}`, '_blank');
    }
  };

  if (!isOwnProfile && !currentResume) {
    return null; // Don't show anything if not own profile and no resume
  }

  return (
    <div className="relative">
      {/* Main Pill Button */}
      <button
        onClick={() => {
          if (isOwnProfile) {
            if (currentResume) {
              setShowActions(!showActions);
            } else {
              fileInputRef.current?.click();
            }
          } else if (currentResume) {
            handleDownload();
          }
        }}
        disabled={isUploading}
        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
          currentResume
            ? 'bg-[#FCD5E3] text-[#eb1966] hover:bg-[#F8C2D4]'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <FileText className="w-3 h-3" />
        {isUploading ? (
          'Uploading...'
        ) : currentResume ? (
          isOwnProfile ? 'Edit Resume' : 'View Resume'
        ) : (
          'Upload Resume'
        )}
      </button>

      {/* Actions Dropdown */}
      <AnimatePresence>
        {showActions && currentResume && isOwnProfile && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[160px]"
          >
            <div className="py-1">
              <button
                onClick={handleDownload}
                className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
              <button
                onClick={() => {
                  fileInputRef.current?.click();
                  setShowActions(false);
                }}
                className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Replace
              </button>
              <button
                onClick={handleDeleteResume}
                className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Delete
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="absolute top-full left-0 mt-2 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 whitespace-nowrap z-10"
          >
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 text-red-400 hover:text-red-600"
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click outside to close actions */}
      {showActions && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowActions(false)}
        />
      )}
    </div>
  );
}
