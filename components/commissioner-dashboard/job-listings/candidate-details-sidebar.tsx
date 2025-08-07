'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { X, Mail, ExternalLink, UserX } from 'lucide-react';
import { useSuccessToast, useErrorToast } from '../../ui/toast';

interface Application {
  id: number;
  gigId: number;
  freelancerId: number;
  pitch: string;
  sampleLinks: string[];
  skills: string[];
  tools: string[];
  submittedAt: string;
  status?: 'pending' | 'accepted' | 'rejected';
}

interface GigRequest {
  id: number;
  gigId: number;
  freelancerId: number;
  commissionerId: number;
  organizationId: number;
  title: string;
  status: string;
  createdAt?: string;
  acceptedAt?: string;
  projectId?: number;
  budget?: {
    min: number;
    max: number;
  };
  skills?: string[];
  tools?: string[];
  notes?: string;
}

interface Freelancer {
  id: number;
  userId: number;
  rating: number;
  category: string;
}

interface User {
  id: number;
  name: string;
  avatar: string;
  title: string;
}

interface Gig {
  id: number;
  title: string;
}

interface CandidateData {
  application?: Application;
  gigRequest?: GigRequest;
  freelancer: Freelancer;
  user: User;
  gig: Gig;
  type: 'public' | 'private';
}

interface CandidateDetailsSidebarProps {
  candidate: CandidateData | null;
  isOpen: boolean;
  onClose: () => void;
  onCandidateUpdate?: () => void; // Callback to refresh candidate list
}

export default function CandidateDetailsSidebar({
  candidate,
  isOpen,
  onClose,
  onCandidateUpdate
}: CandidateDetailsSidebarProps) {
  const [isMatching, setIsMatching] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const showSuccessToast = useSuccessToast();
  const showErrorToast = useErrorToast();

  const handleMatchWithFreelancer = async () => {
    if (!candidate) return;

    const isPublicApplication = candidate.type === 'public';

    if (!isPublicApplication) {
      showErrorToast('Action Not Available', 'Matching is only available for public gig applications.');
      return;
    }

    if (!candidate.application) {
      showErrorToast('Invalid Data', 'Application data is missing.');
      return;
    }

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
        const result = await response.json();
        const freelancerName = candidate.application.freelancer?.name || 'Freelancer';
        showSuccessToast(`You've matched with ${freelancerName}! The project has now been activated.`);
        onClose();
        // Refresh candidate list to remove matched candidate
        if (onCandidateUpdate) {
          onCandidateUpdate();
        }
      } else {
        throw new Error('Failed to match with freelancer');
      }
    } catch (error) {
      console.error('Error matching with freelancer:', error);
      showErrorToast('Failed to match with freelancer', 'Please try again or contact support if the issue persists.');
    } finally {
      setIsMatching(false);
    }
  };

  const handleRejectApplication = async () => {
    if (!candidate) return;

    const isPublicApplication = candidate.type === 'public';

    if (!isPublicApplication) {
      showErrorToast('Action Not Available', 'Rejection is only available for public gig applications.');
      return;
    }

    if (!candidate.application) {
      showErrorToast('Invalid Data', 'Application data is missing.');
      return;
    }

    setIsRejecting(true);
    try {
      const response = await fetch('/api/gigs/reject-application', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          applicationId: candidate.application.id,
        }),
      });

      if (response.ok) {
        showSuccessToast('Application rejected', 'The freelancer has been notified and removed from your candidate list.');
        onClose();
        // Refresh candidate list to remove rejected candidate
        if (onCandidateUpdate) {
          onCandidateUpdate();
        }
      } else {
        throw new Error('Failed to reject application');
      }
    } catch (error) {
      console.error('Error rejecting application:', error);
      showErrorToast('Failed to reject application', 'Please try again or contact support if the issue persists.');
    } finally {
      setIsRejecting(false);
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
            <div className="sticky top-0 z-50 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
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
              {/* Type Guards */}
              {(() => {
                const isGigRequest = candidate?.type === 'private';
                const isPublicApplication = candidate?.type === 'public';

                return (
                  <>
                    {/* Freelancer Profile */}
                    <div className="text-center">
                      <div className="relative mx-auto w-20 h-20 mb-4 z-10">
                        <Image
                          src={candidate.user?.avatar || '/default-avatar.png'}
                          alt={candidate.user?.name || 'Freelancer'}
                          fill
                          className="rounded-full object-cover"
                        />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">{candidate.user?.name || 'Unknown'}</h3>
                      <p className="text-sm text-gray-600 mb-2">{candidate.user?.title || 'Freelancer'}</p>
                      {renderStars(candidate.freelancer?.rating || 0)}

                      {/* Type Badge */}
                      <div className="mt-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          isPublicApplication
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {isPublicApplication ? 'Public Application' : 'Private Request'}
                        </span>
                      </div>

                      {/* Message Button */}
                      <button className="mt-4 flex items-center justify-center gap-2 w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors">
                        <Mail className="w-4 h-4" />
                        Message
                      </button>
                    </div>

                    {/* Pitch/Project Scope Section */}
                    {isPublicApplication && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">Freelancer Pitch</h4>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {candidate.application?.pitch || 'No pitch provided'}
                        </p>
                      </div>
                    )}

                    {isGigRequest && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">Project Scope</h4>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {candidate.gigRequest?.notes || 'No project note provided'}
                        </p>
                      </div>
                    )}

                    {/* Skills */}
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">Skills</h4>
                      <div className="flex flex-wrap gap-2">
                        {(() => {
                          const skills = isPublicApplication
                            ? candidate.application?.skills || []
                            : candidate.gigRequest?.skills || [];

                          if (skills.length === 0) {
                            return <p className="text-sm text-gray-500">No skills listed</p>;
                          }

                          return skills.map((skill, index) => (
                            <span
                              key={index}
                              className="bg-[#FCD5E3] text-gray-800 px-3 py-1 rounded-full text-xs font-medium"
                            >
                              {skill}
                            </span>
                          ));
                        })()}
                      </div>
                    </div>

                    {/* Tools */}
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">Tools</h4>
                      <div className="space-y-2">
                        {(() => {
                          const tools = isPublicApplication
                            ? candidate.application?.tools || []
                            : candidate.gigRequest?.tools || [];

                          if (tools.length === 0) {
                            return <p className="text-sm text-gray-500">No tools listed</p>;
                          }

                          return tools.map((tool, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-[#eb1966] rounded-full"></div>
                              <span className="text-sm text-gray-700">{tool}</span>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>

                    {/* Attachments/Work Samples */}
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">
                        {isPublicApplication ? 'Attachments' : 'Work Samples'}
                      </h4>
                      <div className="space-y-2">
                        {isPublicApplication && (
                          <>
                            {/* CV for public applications */}
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              CV.pdf
                            </div>
                            {/* Sample links for public applications */}
                            {candidate.application?.sampleLinks?.map((link, index) => (
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
                            )) || <p className="text-sm text-gray-500">No sample links provided</p>}
                          </>
                        )}

                        {isGigRequest && (
                          <div className="text-sm text-gray-600">
                            <p className="mb-2">Work samples are available in the freelancer's portfolio.</p>
                            <div className="bg-gray-50 p-3 rounded-lg">
                              <p className="text-xs text-gray-500">
                                Note: For private gig requests, detailed work samples can be viewed
                                in the freelancer's full profile or discussed during project planning.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-4 border-t border-gray-200 space-y-3">
                      {isPublicApplication && (
                        <>
                          {/* Reject Button - Only for public applications */}
                          {(!candidate.application?.status || candidate.application?.status === 'pending') && (
                            <button
                              onClick={handleRejectApplication}
                              disabled={isRejecting || isMatching}
                              className="w-full bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                            >
                              {isRejecting ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                  Rejecting...
                                </>
                              ) : (
                                <>
                                  <UserX className="w-4 h-4" />
                                  Reject Application
                                </>
                              )}
                            </button>
                          )}

                          {/* Match Button - Only for public applications */}
                          <button
                            onClick={handleMatchWithFreelancer}
                            disabled={isMatching || isRejecting || candidate.application?.status === 'accepted' || candidate.application?.status === 'rejected'}
                            className="w-full bg-black hover:bg-gray-800 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                          >
                            {isMatching ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Matching...
                              </>
                            ) : candidate.application?.status === 'accepted' ? (
                              'Already Matched'
                            ) : candidate.application?.status === 'rejected' ? (
                              'Application Rejected'
                            ) : (
                              'Match With Freelancer →'
                            )}
                          </button>
                        </>
                      )}

                      {isGigRequest && (
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <h5 className="font-medium text-blue-900 mb-2">Private Gig Request</h5>
                          <p className="text-sm text-blue-700 mb-3">
                            This is a private gig request. Status: {candidate.gigRequest?.status || 'Pending'}
                          </p>
                          {candidate.gigRequest?.projectId && (
                            <a
                              href={`/commissioner-dashboard/projects-and-invoices/project-details/${candidate.gigRequest.projectId}`}
                              className="inline-flex items-center gap-2 text-sm text-[#eb1966] hover:underline"
                            >
                              <ExternalLink className="w-4 h-4" />
                              View Project #{candidate.gigRequest.projectId}
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
