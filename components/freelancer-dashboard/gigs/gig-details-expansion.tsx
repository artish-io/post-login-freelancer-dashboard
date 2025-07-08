'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { format } from 'date-fns';
import { CalendarDays, FileText, Share2, CheckCircle2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Apply from './apply';

// Removed server-side imports - using API calls instead

type Props = {
  gig: any;
  isOpen: boolean;
  onClose: () => void;
};

export default function GigDetailsExpansion({ gig, isOpen, onClose }: Props) {
  const [org, setOrg] = useState<any>(null);
  const [contact, setContact] = useState<any>(null);
  const [showApply, setShowApply] = useState(false);

  useEffect(() => {
    const loadOrg = async () => {
      try {
        console.log('🏢 Fetching organization for ID:', gig.organizationId);
        // Fetch organization data via API
        const orgRes = await fetch(`/api/organizations/${gig.organizationId}`);
        const o = await orgRes.json();
        console.log('🏢 Organization data:', o);
        setOrg(o);

        if (o?.contactPersonId) {
          console.log('👤 Fetching contact person for ID:', o.contactPersonId);
          // Fetch contact person data via API
          const contactRes = await fetch(`/api/users/${o.contactPersonId}`);
          const c = await contactRes.json();
          console.log('👤 Contact data:', c);
          setContact(c);
        } else {
          console.log('❌ No contactPersonId found in organization');
        }
      } catch (error) {
        console.error('❌ Failed to load organization or contact:', error);
      }
    };

    if (gig?.organizationId) {
      loadOrg();
    }
  }, [gig.organizationId]);

  if (!gig || !org) return null;

  const {
    title,
    tags,
    description,
    notes,
    status,
    deliveryTimeWeeks,
    estimatedHours,
    hourlyRateMin,
    hourlyRateMax,
    toolsRequired,
    postedDate,
  } = gig;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
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
                  <button
                    onClick={() => setShowApply(true)}
                    className="bg-black text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors"
                  >
                    Apply
                  </button>
                  <button
                    onClick={() => navigator.clipboard.writeText(window.location.href)}
                    className="bg-white border border-gray-300 hover:bg-gray-50 text-black font-medium py-2 px-4 rounded-lg text-sm"
                  >
                    Copy Link
                  </button>
                </div>
                <h2 className="text-4xl font-light text-pink-600">{title}</h2>
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
                {org.logo && (
                  <Image src={org.logo} alt={org.name} width={48} height={48} className="rounded-md" />
                )}
                <div>
                  <h3 className="text-sm font-medium text-gray-600">{org.name}</h3>
                </div>
              </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {tags.map((tag: string) => (
            <span
              key={tag}
              className="px-3 py-1 text-xs rounded-full bg-gray-100 text-gray-600 border border-gray-300"
            >
              {tag}
            </span>
          ))}
        </div>

        <p className="text-sm text-gray-700 mb-4">{description}</p>

        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-500 mb-1">Required Proficiency:</p>
          <div className="flex flex-wrap items-center gap-2">
            {toolsRequired.map((tool: string) => (
              <span
                key={tool}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 border border-gray-300 rounded"
              >
                {/* Optionally include tool icons */}
                {tool}
              </span>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <div className="flex items-center gap-2 text-sm text-blue-600 cursor-pointer">
            <FileText size={16} />
            Project Brief
          </div>
        </div>

        <div className="text-sm text-gray-800">
          <p className="font-semibold text-sm text-gray-500 mb-1">Notes:</p>
          <p>{notes}</p>
        </div>

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
            {postedDate ? format(new Date(postedDate), 'dd MMM') : ''}
          </div>
        </div>
      </div>

      {/* Right */}
      <div className="w-full md:w-64 flex-shrink-0 p-4 bg-white border border-gray-200 rounded-2xl">
        <div className="flex flex-col gap-3 text-sm">
          <div className="flex justify-between">
            <span className="text-[#eb1966] font-semibold">Status:</span>
            <span className="flex items-center gap-2 text-green-600 font-semibold">
              <span className="w-3 h-3 rounded-full bg-green-600 inline-block" />
              Available
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#eb1966] font-semibold">Estimated Delivery Time:</span>
            <span className="text-gray-800">{deliveryTimeWeeks} Weeks</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#eb1966] font-semibold">Hours of Work:</span>
            <span className="text-gray-800">{estimatedHours} Hours</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#eb1966] font-semibold">Max Rate:</span>
            <span className="text-gray-800">${hourlyRateMax * estimatedHours}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#eb1966] font-semibold">Min Rate:</span>
            <span className="text-gray-800">${hourlyRateMin * estimatedHours}</span>
          </div>
        </div>
      </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Apply Modal */}
      {showApply && (
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
                <h2 className="text-xl font-thin" style={{ color: '#eb1966' }}>{title}</h2>
              </div>
              <button
                onClick={() => setShowApply(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="p-6">
              <Apply gig={gig} organization={org} />
            </div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}