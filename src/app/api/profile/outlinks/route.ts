import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
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

function validateOutlink(outlink: any): outlink is Outlink {
  return (
    typeof outlink === 'object' &&
    typeof outlink.platform === 'string' &&
    typeof outlink.url === 'string' &&
    typeof outlink.order === 'number'
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

    const { outlinks } = await request.json();

    // Validation
    if (!Array.isArray(outlinks)) {
      return NextResponse.json({
        success: false,
        error: 'Outlinks must be an array'
      }, { status: 400 });
    }

    if (outlinks.length > 3) {
      return NextResponse.json({
        success: false,
        error: 'Maximum 3 outlinks allowed'
      }, { status: 400 });
    }

    // Validate each outlink
    const urls = new Set<string>();
    for (const outlink of outlinks) {
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

      if (!outlink.platform?.trim()) {
        return NextResponse.json({
          success: false,
          error: 'Platform is required for each outlink'
        }, { status: 400 });
      }
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

    // Normalize and update outlinks
    const normalizedOutlinks = normalizeOutlinks(outlinks);
    profile.outlinks = normalizedOutlinks;
    profile.updatedAt = new Date().toISOString();

    // Save updated profile
    await writeJsonAtomic(profilePath, profile);

    // Also update the freelancer profile socialLinks for backward compatibility
    try {
      const freelancerProfilePath = path.join(DATA_ROOT, 'freelancers', '2025', '08', '03', userId, 'profile.json');
      let freelancerProfile;

      try {
        freelancerProfile = await readJson(freelancerProfilePath, {});

        // Convert outlinks to socialLinks format for backward compatibility
        const socialLinks = normalizedOutlinks.map(outlink => ({
          platform: outlink.platform,
          url: outlink.url
        }));

        freelancerProfile.socialLinks = socialLinks;
        freelancerProfile.updatedAt = new Date().toISOString();

        await writeJsonAtomic(freelancerProfilePath, freelancerProfile);
        console.log(`Updated freelancer profile social links for user ${userId}`);
      } catch (error) {
        console.log(`Could not update freelancer profile for user ${userId}:`, error);
      }
    } catch (error) {
      console.log(`Could not sync freelancer data for user ${userId}:`, error);
      // Don't fail the request if freelancer sync fails
    }

    return NextResponse.json({
      success: true,
      outlinks: normalizedOutlinks,
      message: 'Outlinks updated successfully'
    });

  } catch (error) {
    console.error('Error updating outlinks:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
