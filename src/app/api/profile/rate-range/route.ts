import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { readJson, writeJsonAtomic } from '@/lib/fs-json';
import path from 'path';

const DATA_ROOT = process.env.DATA_ROOT || './data';

interface RateRange {
  rateMin: number;
  rateMax: number;
  rateUnit?: 'hour' | 'project' | 'day';
}

function validateRateRange(rateRange: any): rateRange is RateRange {
  return (
    typeof rateRange === 'object' &&
    typeof rateRange.rateMin === 'number' &&
    typeof rateRange.rateMax === 'number' &&
    Number.isInteger(rateRange.rateMin) &&
    Number.isInteger(rateRange.rateMax) &&
    rateRange.rateMin > 0 &&
    rateRange.rateMax > 0 &&
    rateRange.rateMin <= rateRange.rateMax &&
    (!rateRange.rateUnit || ['hour', 'project', 'day'].includes(rateRange.rateUnit))
  );
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 });
    }

    const body = await request.json();
    const { rateMin, rateMax, rateUnit = 'hour' } = body;

    // Create rate range object
    const rateRange: RateRange = {
      rateMin,
      rateMax,
      rateUnit
    };

    // Validation
    if (!validateRateRange(rateRange)) {
      const errors: string[] = [];
      
      if (typeof rateMin !== 'number' || !Number.isInteger(rateMin) || rateMin <= 0) {
        errors.push('Minimum rate must be a positive integer');
      }
      
      if (typeof rateMax !== 'number' || !Number.isInteger(rateMax) || rateMax <= 0) {
        errors.push('Maximum rate must be a positive integer');
      }
      
      if (rateMin > rateMax) {
        errors.push('Minimum rate cannot be greater than maximum rate');
      }

      if (rateUnit && !['hour', 'project', 'day'].includes(rateUnit)) {
        errors.push('Rate unit must be hour, project, or day');
      }

      return NextResponse.json({
        success: false,
        error: errors.length > 0 ? errors.join(', ') : 'Invalid rate range'
      }, { status: 400 });
    }

    // Additional business logic validation
    if (rateRange.rateMin > 10000 || rateRange.rateMax > 10000) {
      return NextResponse.json({
        success: false,
        error: 'Rate values seem unusually high. Please contact support if this is correct.'
      }, { status: 400 });
    }

    const userId = session.user.id;
    const profilePath = path.join(DATA_ROOT, 'users', userId, 'profile.json');

    // Load current profile
    let profile;
    try {
      profile = await readJson(profilePath, {});
      if (!profile || Object.keys(profile).length === 0) {
        // Create basic profile if it doesn't exist
        profile = { 
          id: userId,
          type: 'freelancer',
          createdAt: new Date().toISOString()
        };
      }
    } catch (error) {
      profile = { 
        id: userId,
        type: 'freelancer',
        createdAt: new Date().toISOString()
      };
    }

    // Update rate range
    profile.rateRange = rateRange;
    profile.updatedAt = new Date().toISOString();

    // Also update the legacy 'rate' field for backward compatibility
    profile.rate = `$${rateRange.rateMin}–${rateRange.rateMax}/${rateRange.rateUnit === 'hour' ? 'hr' : rateRange.rateUnit}`;

    // Save updated profile
    await writeJsonAtomic(profilePath, profile);

    // Also update the freelancer profile data for backward compatibility
    try {
      // Find the freelancer profile in hierarchical storage
      const freelancersPath = path.join(DATA_ROOT, 'freelancers');
      const { readAllFreelancers } = await import('@/lib/freelancer-storage');
      const freelancers = await readAllFreelancers();
      const freelancer = freelancers.find((f: any) => f.userId.toString() === userId);

      if (freelancer) {
        // Update the freelancer profile with new rate data
        const freelancerProfilePath = path.join(DATA_ROOT, 'freelancers', '2025', '08', '03', userId, 'profile.json');
        let freelancerProfile;

        try {
          freelancerProfile = await readJson(freelancerProfilePath, {});
          freelancerProfile.minRate = rateRange.rateMin;
          freelancerProfile.maxRate = rateRange.rateMax;
          freelancerProfile.rate = `${rateRange.rateMin}-${rateRange.rateMax}/${rateRange.rateUnit === 'hour' ? 'hr' : rateRange.rateUnit}`;
          freelancerProfile.updatedAt = new Date().toISOString();

          await writeJsonAtomic(freelancerProfilePath, freelancerProfile);
          console.log(`Updated freelancer profile rate data for user ${userId}`);
        } catch (error) {
          console.log(`Could not update freelancer profile for user ${userId}:`, error);
        }
      }
    } catch (error) {
      console.log(`Could not sync freelancer data for user ${userId}:`, error);
      // Don't fail the request if freelancer sync fails
    }

    return NextResponse.json({
      success: true,
      rateRange: rateRange,
      message: 'Rate range updated successfully'
    });

  } catch (error) {
    console.error('Error updating rate range:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
