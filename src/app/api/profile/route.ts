import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import { readJson, writeJsonAtomic } from '@/lib/fs-json';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const DATA_ROOT = process.env.DATA_ROOT || './data';

interface Outlink {
  id: string;
  platform: string;
  url: string;
  label?: string;
  order: number;
  createdAt?: string;
}

interface RateRange {
  rateMin: number;
  rateMax: number;
  rateUnit?: 'hour' | 'project' | 'day';
}

interface ProfileUpdatePayload {
  outlinks?: Outlink[];
  rateRange?: RateRange;
  [key: string]: any;
}

function validateOutlink(outlink: any): outlink is Outlink {
  return (
    typeof outlink === 'object' &&
    typeof outlink.platform === 'string' &&
    typeof outlink.url === 'string' &&
    typeof outlink.order === 'number'
  );
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

function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

function normalizeOutlinks(outlinks: any[]): Outlink[] {
  return outlinks
    .filter(validateOutlink)
    .map((outlink, index) => ({
      ...outlink,
      id: outlink.id || `ol_${uuidv4()}`,
      order: index,
      createdAt: outlink.createdAt || new Date().toISOString(),
    }))
    .sort((a, b) => a.order - b.order);
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

    const payload: ProfileUpdatePayload = await request.json();
    const userId = session.user.id;
    const profilePath = path.join(DATA_ROOT, 'users', userId, 'profile.json');

    // Load current profile
    let profile;
    try {
      profile = await readJson(profilePath, {});
      if (!profile || Object.keys(profile).length === 0) {
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

    const updates: any = {};

    // Handle outlinks update
    if (payload.outlinks !== undefined) {
      if (!Array.isArray(payload.outlinks)) {
        return NextResponse.json({
          success: false,
          error: 'Outlinks must be an array'
        }, { status: 400 });
      }

      if (payload.outlinks.length > 3) {
        return NextResponse.json({
          success: false,
          error: 'Maximum 3 outlinks allowed'
        }, { status: 400 });
      }

      // Validate outlinks
      const urls = new Set<string>();
      for (const outlink of payload.outlinks) {
        if (!validateOutlink(outlink)) {
          return NextResponse.json({
            success: false,
            error: 'Invalid outlink format'
          }, { status: 400 });
        }

        if (!isValidUrl(outlink.url)) {
          return NextResponse.json({
            success: false,
            error: `Invalid URL: ${outlink.url}`
          }, { status: 400 });
        }

        if (urls.has(outlink.url)) {
          return NextResponse.json({
            success: false,
            error: 'Duplicate URLs are not allowed'
          }, { status: 400 });
        }
        urls.add(outlink.url);
      }

      updates.outlinks = normalizeOutlinks(payload.outlinks);
    }

    // Handle rate range update
    if (payload.rateRange !== undefined) {
      if (!validateRateRange(payload.rateRange)) {
        return NextResponse.json({
          success: false,
          error: 'Invalid rate range format'
        }, { status: 400 });
      }

      updates.rateRange = payload.rateRange;
      // Update legacy rate field for backward compatibility
      updates.rate = `$${payload.rateRange.rateMin}–${payload.rateRange.rateMax}/${payload.rateRange.rateUnit === 'hour' ? 'hr' : payload.rateRange.rateUnit}`;
    }

    // Apply updates to profile
    Object.assign(profile, updates);
    profile.updatedAt = new Date().toISOString();

    // Save updated profile
    await writeJsonAtomic(profilePath, profile);

    return NextResponse.json({
      success: true,
      data: updates,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
