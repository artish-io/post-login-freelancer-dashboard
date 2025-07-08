'use client';

import React, { useState } from 'react';
import GigRequestHeader from './gig-request-header';
import GigRequestBody from './gig-request-body';
import GigRequestMetaPanel from './gig-request-meta-panel';
import ApplyModal from '../apply';

type GigRequest = {
  id: number;
  skills: string[];
  tools: string[];
  title: string;
  subtitle: string;
  organizationLogo?: string;
  createdAt: string;
  description: string;
  toolIconUrl: string;
  briefUrl: string;
  notes: string;
  postedByName: string;
  postedByAvatar: string;
  status: 'Available' | 'Pending' | 'Accepted' | 'Rejected';
  estimatedDelivery: string;
  hoursOfWork: string;
  maxRate: string;
  minRate: string;
};

type Props = {
  request: GigRequest;
};

const GigRequestDetails: React.FC<Props> = ({ request }) => {
  const [showApplyModal, setShowApplyModal] = useState(false);

  const handleAcceptOffer = () => {
    setShowApplyModal(true);
  };

  return (
    <>
    <div className="flex gap-x-8">
      <div className="w-2/3">
        <GigRequestHeader
          skills={request.skills}
          title={request.title}
          subtitle={request.subtitle}
          organizationLogo={request.organizationLogo}
          createdAt={request.createdAt}
        />
        <GigRequestBody
          description={request.description}
          skills={request.skills}
          tools={request.tools}
          toolIconUrl={request.toolIconUrl}
          briefUrl={request.briefUrl}
          notes={request.notes}
          createdAt={request.createdAt}
          postedByName={request.postedByName}
          postedByAvatar={request.postedByAvatar}
        />
      </div>
      <div className="w-1/3">
        <GigRequestMetaPanel
          status={request.status}
          estimatedDelivery={request.estimatedDelivery}
          hoursOfWork={request.hoursOfWork}
          maxRate={request.maxRate}
          minRate={request.minRate}
          onAccept={handleAcceptOffer}
        />
      </div>
    </div>

    {/* Apply Modal */}
    {showApplyModal && (
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex justify-center items-start pt-8 md:pt-24 px-2 md:px-4 overflow-y-auto">
        <div className="bg-white rounded-2xl w-full max-w-4xl shadow-lg">
          {/* Header matching gig-details-expansion */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              {request.organizationLogo && (
                <img
                  src={request.organizationLogo}
                  alt={request.subtitle}
                  className="w-8 h-8 rounded object-cover"
                />
              )}
              <div>
                <h2 className="text-2xl font-normal" style={{ color: '#eb1966', fontWeight: '450' }}>
                  {request.title}
                </h2>
              </div>
            </div>
            <button
              onClick={() => setShowApplyModal(false)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Apply Form Content */}
          <div className="p-6">
            <ApplyModal
              gig={{
                id: request.id,
                title: request.title,
                description: request.description,
                tags: [...request.skills, ...request.tools],
                toolsRequired: request.tools,
                status: request.status
              }}
              organization={{
                name: request.subtitle,
                logo: request.organizationLogo
              }}
            />
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default GigRequestDetails;
