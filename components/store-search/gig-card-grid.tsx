import { FC } from 'react';
import GigCard from './gig-card';
import { Gig } from '../../types/gig'; // ✅ Fixed path (was ../../../types/gig)

type GigCardGridProps = {
  gigs: Gig[];
};

const GigCardGrid: FC<GigCardGridProps> = ({ gigs }) => {
  if (!gigs || gigs.length === 0) {
    return <p className="text-gray-400 italic">No gigs match your filters.</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {gigs.map((gig) => (
        <GigCard key={gig.id} gig={gig} />
      ))}
    </div>
  );
};

export default GigCardGrid;