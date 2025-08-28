'use client';

import { useState, useRef } from 'react';
import { Upload, FileText, X, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ResumeInfo {
  fileName: string;
  storedFileName: string;
  size: number;
  type: string;
  uploadedAt: string;
}

interface ResumeUploadProps {
  currentResume?: ResumeInfo | null;
  onResumeUpdate: (resume: ResumeInfo | null) => void;
  isOwnProfile: boolean;
}

export default function ResumeUpload({ 
  currentResume, 
  onResumeUpdate, 
  isOwnProfile 
}: ResumeUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDeleteResume = async () => {
    if (!confirm('Are you sure you want to delete your resume?')) return;

    try {
      const response = await fetch('/api/freelancer/resume', {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        onResumeUpdate(null);
      } else {
        setError('Failed to delete resume');
      }
    } catch (error) {
      console.error('Delete error:', error);
      setError('Failed to delete resume. Please try again.');
    }
  };

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!isOwnProfile && !currentResume) {
    return null; // Don't show anything if not own profile and no resume
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Resume/CV</h3>
      
      {currentResume ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <FileText className="w-8 h-8 text-blue-600" />
            <div className="flex-1">
              <p className="font-medium text-gray-900">{currentResume.fileName}</p>
              <p className="text-sm text-gray-500">
                {formatFileSize(currentResume.size)} • Uploaded {formatDate(currentResume.uploadedAt)}
              </p>
            </div>
            <div className="flex gap-2">
              <a
                href={`/api/freelancer/resume/download/${currentResume.storedFileName}`}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Download resume"
              >
                <Download className="w-4 h-4" />
              </a>
              {isOwnProfile && (
                <button
                  onClick={handleDeleteResume}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete resume"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          
          {isOwnProfile && (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {isUploading ? 'Uploading...' : 'Replace Resume'}
            </button>
          )}
        </motion.div>
      ) : isOwnProfile ? (
        <div className="space-y-4">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive 
                ? 'border-blue-400 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">
              Upload your resume
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Drag and drop your resume here, or click to browse
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isUploading ? 'Uploading...' : 'Choose File'}
            </button>
            <p className="text-xs text-gray-400 mt-2">
              PDF, DOC, DOCX up to 5MB
            </p>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-2" />
          <p>No resume uploaded</p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        onChange={handleFileInputChange}
        className="hidden"
      />

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg"
          >
            <p className="text-sm text-red-600">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
