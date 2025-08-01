'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import ApplyForm from './apply-form';

interface ApplyToGigButtonProps {
  gigId: number;
}

export default function ApplyToGigButton({ gigId }: ApplyToGigButtonProps) {
  const { data: session } = useSession();
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [gigData, setGigData] = useState<any>(null);
  const [orgData, setOrgData] = useState<any>(null);

  const handleApplyClick = async () => {
    if (!session?.user?.id) {
      alert('Please log in to apply for gigs');
      return;
    }

    try {
      // Fetch gig data
      const gigRes = await fetch(`/api/gigs/${gigId}`);
      if (gigRes.ok) {
        const gig = await gigRes.json();
        setGigData(gig);

        // Fetch organization data if available
        if (gig.organizationId) {
          const orgRes = await fetch(`/api/organizations/${gig.organizationId}`);
          if (orgRes.ok) {
            const org = await orgRes.json();
            setOrgData(org);
          }
        }

        setShowApplyModal(true);
      }
    } catch (error) {
      console.error('Failed to load gig data:', error);
    }
  };

  return (
    <>
      <button
        onClick={handleApplyClick}
        className="bg-black text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors hover:bg-gray-800"
      >
        Apply
      </button>

      {/* Apply Modal */}
      {showApplyModal && gigData && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6">
              <h2 className="text-2xl font-normal" style={{ color: '#eb1966', fontWeight: '450' }}>
                Apply for {gigData.title}
              </h2>
              <button
                onClick={() => setShowApplyModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <span className="text-xl">×</span>
              </button>
            </div>
            <div className="p-6">
              <ApplyForm
                gig={gigData}
                organization={orgData}
                onSuccess={() => setShowApplyModal(false)}
                onCancel={() => setShowApplyModal(false)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
