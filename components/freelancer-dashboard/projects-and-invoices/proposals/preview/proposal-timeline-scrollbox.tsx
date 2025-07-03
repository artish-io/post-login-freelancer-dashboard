'use client';

import ProposalTimeline from './proposal-timeline';

export default function ProposalTimelineScrollbox() {
  return (
    <div className="overflow-y-auto h-full px-6 md:px-12">
      <div className="max-w-[1440px] mx-auto pt-6 pb-12">
        <ProposalTimeline />
      </div>
    </div>
  );
}