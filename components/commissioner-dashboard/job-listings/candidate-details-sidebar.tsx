'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { X, Mail, ExternalLink } from 'lucide-react';

interface CandidateData {
  application: {
    id: number;
    gigId: number;
    freelancerId: number;
    pitch: string;
    sampleLinks: string[];
    skills: string[];
    tools: string[];
    submittedAt: string;
    status?: 'pending' | 'accepted' | 'rejected';
  };
  freelancer: {
    id: number;
    userId: number;
    rating: number;
    category: string;
  };
  user: {
    id: number;
    name: string;
    avatar: string;
    title: string;
  };
  gig: {
    id: number;
    title: string;
  };
}

interface CandidateDetailsSidebarProps {
  candidate: CandidateData | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function CandidateDetailsSidebar({
  candidate,
  isOpen,
  onClose
}: CandidateDetailsSidebarProps) {
  const [isMatching, setIsMatching] = useState(false);

  const handleMatchWithFreelancer = async () => {
    if (!candidate) return;

    setIsMatching(true);
    try {
      const response = await fetch('/api/gigs/match-freelancer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          applicationId: candidate.application.id,
          gigId: candidate.application.gigId,
          freelancerId: candidate.application.freelancerId,
        }),
      });

      if (response.ok) {
        alert('Successfully matched with freelancer! Project has been created.');
        onClose();
        // Refresh the page to show updated data
        window.location.reload();
      } else {
        throw new Error('Failed to match with freelancer');
      }
    } catch (error) {
      console.error('Error matching with freelancer:', error);
      alert('Failed to match with freelancer. Please try again.');
    } finally {
      setIsMatching(false);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-4 h-4 ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
        <span className="ml-1 text-sm text-gray-600">{rating.toFixed(1)}</span>
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && candidate && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-96 bg-white shadow-xl z-50 overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Candidate Details</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Freelancer Profile */}
              <div className="text-center">
                <div className="relative mx-auto w-20 h-20 mb-4">
                  <Image
                    src={candidate.user.avatar || '/default-avatar.png'}
                    alt={candidate.user.name}
                    fill
                    className="rounded-full object-cover"
                  />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{candidate.user.name}</h3>
                <p className="text-sm text-gray-600 mb-2">{candidate.user.title}</p>
                {renderStars(candidate.freelancer.rating)}
                
                {/* Message Button */}
                <button className="mt-4 flex items-center justify-center gap-2 w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors">
                  <Mail className="w-4 h-4" />
                  Message
                </button>
              </div>

              {/* Freelancer Pitch */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Freelancer Pitch</h4>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {candidate.application.pitch}
                </p>
              </div>

              {/* Skills */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {candidate.application.skills.map((skill, index) => (
                    <span
                      key={index}
                      className="bg-[#FCD5E3] text-gray-800 px-3 py-1 rounded-full text-xs font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Tools */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Tools</h4>
                <div className="space-y-2">
                  {candidate.application.tools.map((tool, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-[#eb1966] rounded-full"></div>
                      <span className="text-sm text-gray-700">{tool}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Attachments */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Attachments</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    CV.pdf
                  </div>
                  {candidate.application.sampleLinks.map((link, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <ExternalLink className="w-4 h-4 text-gray-400" />
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-[#eb1966] hover:underline truncate"
                      >
                        Sample Project {index + 1}
                      </a>
                    </div>
                  ))}
                </div>
              </div>

              {/* Match Button */}
              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={handleMatchWithFreelancer}
                  disabled={isMatching || candidate.application.status === 'accepted'}
                  className="w-full bg-black hover:bg-gray-800 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {isMatching ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Matching...
                    </>
                  ) : candidate.application.status === 'accepted' ? (
                    'Already Matched'
                  ) : (
                    'Match With Freelancer →'
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
