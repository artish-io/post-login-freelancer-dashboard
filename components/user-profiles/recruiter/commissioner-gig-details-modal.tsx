'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { format } from 'date-fns';
import { CalendarDays, FileText, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Apply from '../../freelancer-dashboard/gigs/apply';

interface GigListing {
  id: number;
  title: string;
  category: string;
  budget: string;
  deadline: string;
  applicants: number;
  status: 'active' | 'closed' | 'in_progress';
}

interface CommissionerGigDetailsModalProps {
  gig: GigListing;
  isOpen: boolean;
  onClose: () => void;
  showApplyButton: boolean;
}

export default function CommissionerGigDetailsModal({ 
  gig, 
  isOpen, 
  onClose, 
  showApplyButton 
}: CommissionerGigDetailsModalProps) {
  const [org, setOrg] = useState<any>(null);
  const [contact, setContact] = useState<any>(null);
  const [showApply, setShowApply] = useState(false);
  const [fullGigData, setFullGigData] = useState<any>(null);

  useEffect(() => {
    const loadGigDetails = async () => {
      try {
        // Fetch full gig data from the gigs API
        const gigRes = await fetch(`/api/gigs/${gig.id}`);
        if (gigRes.ok) {
          const gigData = await gigRes.json();
          setFullGigData(gigData);

          // Fetch organization data
          if (gigData.organizationId) {
            const orgRes = await fetch(`/api/organizations/${gigData.organizationId}`);
            if (orgRes.ok) {
              const orgData = await orgRes.json();
              setOrg(orgData);

              // Fetch contact person data
              if (orgData.contactPersonId) {
                const contactRes = await fetch(`/api/users/${orgData.contactPersonId}`);
                if (contactRes.ok) {
                  const contactData = await contactRes.json();
                  setContact(contactData);
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to load gig details:', error);
      }
    };

    if (gig?.id && isOpen) {
      loadGigDetails();
    }
  }, [gig.id, isOpen]);

  if (!isOpen || !gig) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-red-100 text-red-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Available';
      case 'closed':
        return 'Closed';
      case 'in_progress':
        return 'In Progress';
      default:
        return status;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex justify-center items-center p-4 overflow-y-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={handleBackdropClick}
      >
        <motion.div
          className="bg-white rounded-2xl border border-gray-200 shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto relative"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with Close Button */}
          <div className="flex justify-between items-center p-6 pb-0">
            <div className="flex flex-col">
              <div className="flex items-center gap-3 mb-2">
                {showApplyButton && (
                  <button
                    onClick={() => setShowApply(true)}
                    className="bg-black text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors"
                  >
                    Apply
                  </button>
                )}
                <button
                  onClick={() => navigator.clipboard.writeText(window.location.href)}
                  className="bg-white border border-gray-300 hover:bg-gray-50 text-black font-medium py-2 px-4 rounded-lg text-sm"
                >
                  Copy Link
                </button>
              </div>
              <h2 className="text-4xl font-light text-pink-600">{gig.title}</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="flex flex-col md:flex-row gap-6 p-6 pt-4">
            {/* Left */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                {org?.logo && (
                  <Image src={org.logo} alt={org.name} width={48} height={48} className="rounded-md" />
                )}
                <div>
                  <h3 className="text-sm font-medium text-gray-600">{org?.name || 'Loading...'}</h3>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <span className="px-3 py-1 text-xs rounded-full bg-gray-100 text-gray-600 border border-gray-300">
                  {gig.category}
                </span>
              </div>

              <p className="text-sm text-gray-700 mb-4">
                {fullGigData?.description || 'Loading description...'}
              </p>

              {fullGigData?.toolsRequired && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-gray-500 mb-1">Required Proficiency:</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {fullGigData.toolsRequired.map((tool: string) => (
                      <span
                        key={tool}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 border border-gray-300 rounded"
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-4">
                <div className="flex items-center gap-2 text-sm text-blue-600 cursor-pointer">
                  <FileText size={16} />
                  Project Brief
                </div>
              </div>

              {fullGigData?.notes && (
                <div className="text-sm text-gray-800">
                  <p className="font-semibold text-sm text-gray-500 mb-1">Notes:</p>
                  <p>{fullGigData.notes}</p>
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between mt-6">
                <div className="flex items-center gap-2 text-sm">
                  {contact ? (
                    <>
                      {contact.avatar && (
                        <Image
                          src={contact.avatar}
                          alt={contact.name}
                          width={28}
                          height={28}
                          className="rounded-full"
                        />
                      )}
                      <span className="text-gray-700">{contact.name}</span>
                    </>
                  ) : (
                    <span className="text-gray-500">Loading contact...</span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <CalendarDays size={14} />
                  {gig.deadline ? format(new Date(gig.deadline), 'dd MMM') : ''}
                </div>
              </div>
            </div>

            {/* Right */}
            <div className="w-full md:w-64 flex-shrink-0 p-4 bg-white border border-gray-200 rounded-2xl">
              <div className="flex flex-col gap-4 text-sm">
                {/* Status */}
                <div className="flex flex-col gap-2">
                  <span className="text-[#eb1966] font-semibold">Status:</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium w-fit ${getStatusColor(gig.status)}`}>
                    {getStatusText(gig.status)}
                  </span>
                </div>

                {/* Budget */}
                <div className="flex flex-col gap-2">
                  <span className="text-[#eb1966] font-semibold">Budget:</span>
                  <span className="bg-black text-white px-3 py-1 rounded-full text-xs font-medium w-fit">
                    {gig.budget}
                  </span>
                </div>

                {/* Applicants */}
                <div className="flex flex-col gap-2">
                  <span className="text-[#eb1966] font-semibold">Applicants:</span>
                  <span className="bg-black text-white px-3 py-1 rounded-full text-xs font-medium w-fit">
                    {gig.applicants} Applied
                  </span>
                </div>

                {/* Deadline */}
                <div className="flex flex-col gap-2">
                  <span className="text-[#eb1966] font-semibold">Deadline:</span>
                  <span className="bg-black text-white px-3 py-1 rounded-full text-xs font-medium w-fit">
                    {gig.deadline}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Apply Modal */}
      {showApply && fullGigData && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6">
              <div className="flex items-center gap-3">
                {org?.logo && (
                  <Image
                    src={org.logo}
                    alt={org.name}
                    width={32}
                    height={32}
                    className="rounded-md object-contain"
                  />
                )}
                <h2 className="text-2xl font-normal" style={{ color: '#eb1966', fontWeight: '450' }}>
                  {gig.title}
                </h2>
              </div>
              <button
                onClick={() => setShowApply(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="p-6">
              <Apply gig={fullGigData} organization={org} />
            </div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
