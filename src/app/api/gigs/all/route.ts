import { NextResponse } from 'next/server';
import { readAllGigs } from '@/lib/gigs/hierarchical-storage';
import { ok, err, ErrorCodes, withErrorHandling } from '@/lib/http/envelope';

async function handleGetAllGigs() {
  // Get all gigs regardless of status (for internal use)
  const gigs = await readAllGigs();

  return NextResponse.json(
    ok({
      entities: { gigs },
      message: 'All gigs retrieved successfully'
    })
  );
}

// Wrap the handler with error handling
export const GET = withErrorHandling(handleGetAllGigs);
