'use client';

import { useState, useEffect } from 'react';
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
  rejectedAt?: string;
  rejectionReason?: string;
  acceptedAt?: string;
  projectId?: string;
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
  const [isDownloadingResume, setIsDownloadingResume] = useState(false);
  const [freelancerHasResume, setFreelancerHasResume] = useState(false);
  const [checkingResume, setCheckingResume] = useState(false);
  const showSuccessToast = useSuccessToast();
  const showErrorToast = useErrorToast();

  // Check if freelancer has uploaded a resume
  useEffect(() => {
    const checkFreelancerResume = async () => {
      if (!candidate?.application?.freelancerId) {
        setFreelancerHasResume(false);
        return;
      }

      setCheckingResume(true);
      try {
        const response = await fetch(`/api/freelancer/resume/info/${candidate.application.freelancerId}`);
        if (response.ok) {
          const data = await response.json();
          setFreelancerHasResume(!!data.resume);
        } else {
          setFreelancerHasResume(false);
        }
      } catch (error) {
        console.error('Error checking freelancer resume:', error);
        setFreelancerHasResume(false);
      } finally {
        setCheckingResume(false);
      }
    };

    if (isOpen && candidate) {
      checkFreelancerResume();
    }
  }, [candidate, isOpen]);

  const handleMatchWithFreelancer = async () => {
    console.log('🚀 [ATOMIC] handleMatchWithFreelancer TRIGGERED');
    console.log('📊 [ATOMIC] Initial state check:', {
      candidateExists: !!candidate,
      candidateType: candidate?.type,
      applicationId: candidate?.application?.id,
      gigId: candidate?.application?.gigId,
      freelancerId: candidate?.application?.freelancerId,
      currentStatus: candidate?.application?.status,
      isMatching: isMatching,
      isRejecting: isRejecting
    });

    if (!candidate) {
      console.log('❌ [ATOMIC] EARLY EXIT: No candidate provided');
      return;
    }

    const isPublicApplication = candidate.type === 'public';
    console.log('🔍 [ATOMIC] Application type check:', {
      candidateType: candidate.type,
      isPublicApplication: isPublicApplication
    });

    if (!isPublicApplication) {
      console.log('❌ [ATOMIC] EARLY EXIT: Not a public application');
      showErrorToast('Action Not Available', 'Matching is only available for public gig applications.');
      return;
    }

    console.log('🔍 [ATOMIC] Application data check:', {
      applicationExists: !!candidate.application,
      applicationData: candidate.application
    });

    if (!candidate.application) {
      console.log('❌ [ATOMIC] EARLY EXIT: Application data is missing');
      showErrorToast('Invalid Data', 'Application data is missing.');
      return;
    }

    // 🚫 REJECTION GUARD: Prevent matching with rejected applications
    if (candidate.application.status === 'rejected') {
      console.log('❌ [ATOMIC] EARLY EXIT: Application is rejected');
      showErrorToast('Cannot Match', 'This application has been rejected and cannot be matched.');
      return;
    }

    // 🚫 ACCEPTED GUARD: Prevent matching with already accepted applications
    if (candidate.application.status === 'accepted') {
      console.log('❌ [ATOMIC] EARLY EXIT: Application is already accepted');
      showErrorToast('Already Matched', 'This application has already been matched with a freelancer.');
      return;
    }

    console.log('⏳ [ATOMIC] Setting isMatching to TRUE');
    setIsMatching(true);

    try {
      console.log('🔧 [ATOMIC] Preparing match request:', {
        applicationId: candidate.application.id,
        gigId: candidate.application.gigId,
        freelancerId: candidate.application.freelancerId,
      });

      const requestPayload = {
        applicationId: candidate.application.id,
        gigId: candidate.application.gigId,
        freelancerId: candidate.application.freelancerId,
      };
      console.log('📦 [ATOMIC] Request payload:', requestPayload);

      console.log('🌐 [ATOMIC] Sending fetch request to /api/gigs/match-freelancer...');
      const response = await fetch('/api/gigs/match-freelancer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      });

      console.log('📨 [ATOMIC] Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        url: response.url,
        headers: Object.fromEntries(response.headers.entries())
      });

      console.log('📄 [ATOMIC] Parsing response JSON...');
      const result = await response.json();
      console.log('� [ATOMIC] Parsed response data:', {
        success: result.success,
        ok: result.ok,
        message: result.message,
        hasEntities: !!result.entities,
        projectData: result.entities?.project,
        tasksData: result.entities?.tasks,
        fullResult: result
      });

      console.log('🔍 [ATOMIC] Checking response success:', {
        responseOk: response.ok,
        resultOk: result.ok,
        bothOk: response.ok && result.ok
      });

      if (response.ok && result.ok) {
        console.log('✅ [ATOMIC] Response indicates success, starting guard verification...');

        // 🛡️ GIG APPLICATION GUARD: Verify project and tasks were created
        console.log('🛡️ [ATOMIC] Frontend guard: Verifying project and task creation...');

        console.log('🔍 [ATOMIC] Checking project data:', {
          hasEntities: !!result.entities,
          hasProject: !!result.entities?.project,
          projectData: result.entities?.project
        });

        if (!result.entities?.project) {
          console.error('❌ [ATOMIC] Frontend guard failed: No project data in response');
          throw new Error('Matching failed: Project was not created. Please try again.');
        }

        console.log('🔍 [ATOMIC] Checking tasks data:', {
          hasTasks: !!result.entities?.tasks,
          isArray: Array.isArray(result.entities?.tasks),
          taskCount: result.entities?.tasks?.length || 0,
          tasksData: result.entities?.tasks
        });

        if (!result.entities?.tasks || !Array.isArray(result.entities.tasks) || result.entities.tasks.length === 0) {
          console.error('❌ [ATOMIC] Frontend guard failed: No task data in response');
          throw new Error('Matching failed: Project tasks were not created. Please try again.');
        }

        console.log(`✅ [ATOMIC] Frontend guard passed: Project ${result.entities.project.projectId} with ${result.entities.tasks.length} tasks created`);

        const freelancerName = candidate.user?.name || 'Freelancer';
        const successMessage = `You've matched with ${freelancerName}! Project #${result.entities.project.projectId} has been activated with ${result.entities.tasks.length} tasks.`;

        console.log('🎉 [ATOMIC] Showing success toast:', successMessage);
        showSuccessToast(successMessage);

        console.log('🚪 [ATOMIC] Closing sidebar...');
        onClose();

        console.log('🔄 [ATOMIC] Triggering candidate list refresh...');
        if (onCandidateUpdate) {
          onCandidateUpdate();
        } else {
          console.log('⚠️ [ATOMIC] onCandidateUpdate callback not available');
        }

        console.log('✅ [ATOMIC] Match process completed successfully');
      } else {
        console.log('❌ [ATOMIC] Response indicates failure:', {
          responseOk: response.ok,
          resultOk: result.ok,
          responseStatus: response.status,
          resultMessage: result.message
        });

        const errorMessage = result.message || 'Failed to match with freelancer';
        console.log('❌ [ATOMIC] Throwing error:', errorMessage);
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('💥 [ATOMIC] Error in match process:', {
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : 'No stack trace',
        fullError: error
      });

      console.log('🚨 [ATOMIC] Showing error toast...');
      const errorMessage = error instanceof Error ? error.message : 'Failed to match with freelancer';
      const fallbackMessage = 'Please try again or contact support if the issue persists.';
      showErrorToast('Failed to match with freelancer', errorMessage || fallbackMessage);
    } finally {
      console.log('🔄 [ATOMIC] Finally block: Setting isMatching to FALSE');
      setIsMatching(false);
      console.log('🏁 [ATOMIC] handleMatchWithFreelancer COMPLETED');
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

  const handleDownloadResume = async (freelancerId: number) => {
    if (!freelancerId) return;

    setIsDownloadingResume(true);
    try {
      const response = await fetch(`/api/freelancer/resume/download/${freelancerId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to download resume');
      }

      // Get filename from response headers or use default
      const contentDisposition = response.headers.get('content-disposition');
      let filename = 'resume.pdf';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showSuccessToast('Resume downloaded successfully');
    } catch (error) {
      console.error('Error downloading resume:', error);
      showErrorToast('Failed to download resume', error instanceof Error ? error.message : 'Please try again');
    } finally {
      setIsDownloadingResume(false);
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
                const isRejectedApplication = candidate?.application?.status === 'rejected';



                return (
                  <>
                    {/* 🚫 REJECTION STATUS BANNER: Show rejection status for rejected applications */}
                    {isPublicApplication && isRejectedApplication && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <UserX className="w-4 h-4 text-red-600" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-red-900 mb-1">Application Rejected</h4>
                            <p className="text-sm text-red-700">
                              This application was rejected on {candidate.application?.rejectedAt ?
                                new Date(candidate.application.rejectedAt).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                }) : 'an unknown date'}.
                            </p>
                            {candidate.application?.rejectionReason && (
                              <p className="text-xs text-red-600 mt-1">
                                <strong>Reason:</strong> {candidate.application.rejectionReason}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

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
                            {/* CV for public applications - only show if freelancer has uploaded a resume */}
                            {freelancerHasResume && (
                              <button
                                onClick={() => candidate.application?.freelancerId && handleDownloadResume(candidate.application.freelancerId)}
                                disabled={isDownloadingResume || !candidate.application?.freelancerId}
                                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                {isDownloadingResume ? 'Downloading...' : 'Download CV'}
                              </button>
                            )}
                            {checkingResume && (
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Checking for CV...
                              </div>
                            )}
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
                          {/* Reject Button - Only for pending public applications */}
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

                          {/* Match Button - Only for pending public applications */}
                          {(!candidate.application?.status || candidate.application?.status === 'pending') && (
                            <button
                              onClick={() => {
                                console.log('🖱️ [ATOMIC] MATCH BUTTON CLICKED');
                                console.log('🔍 [ATOMIC] Button state check:', {
                                  isMatching,
                                  isRejecting,
                                  applicationStatus: candidate.application?.status,
                                  buttonDisabled: isMatching || isRejecting
                                });
                                handleMatchWithFreelancer();
                              }}
                              disabled={isMatching || isRejecting}
                              className="w-full bg-black hover:bg-gray-800 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                            >
                              {isMatching ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                  Matching...
                                </>
                              ) : (
                                'Match With Freelancer →'
                              )}
                            </button>
                          )}

                          {/* Status Display for Non-Pending Applications */}
                          {candidate.application?.status === 'accepted' && (
                            <div className="w-full bg-green-100 text-green-800 px-6 py-3 rounded-lg font-medium text-center">
                              ✅ Application Accepted
                              {candidate.application.projectId && (
                                <div className="text-sm mt-1">
                                  Project #{candidate.application.projectId} created
                                </div>
                              )}
                            </div>
                          )}

                          {candidate.application?.status === 'rejected' && (
                            <div className="w-full bg-red-100 text-red-800 px-6 py-3 rounded-lg font-medium text-center">
                              ❌ Application Rejected
                              <div className="text-sm mt-1">
                                This application cannot be matched
                              </div>
                            </div>
                          )}
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
