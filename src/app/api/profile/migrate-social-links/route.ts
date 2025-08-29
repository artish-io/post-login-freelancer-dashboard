import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { readJson, writeJsonAtomic } from '@/lib/fs-json';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const DATA_ROOT = process.env.DATA_ROOT || './data';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 });
    }

    const userId = session.user.id;
    
    // Load freelancer profile to get socialLinks
    const freelancerProfilePath = path.join(DATA_ROOT, 'freelancers', '2025', '08', '03', userId, 'profile.json');
    let freelancerProfile;
    
    try {
      freelancerProfile = await readJson(freelancerProfilePath, {});
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: 'Freelancer profile not found'
      }, { status: 404 });
    }

    // Check if socialLinks exist
    if (!freelancerProfile.socialLinks || freelancerProfile.socialLinks.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No social links to migrate',
        outlinks: []
      });
    }

    // Load or create user profile
    const userProfilePath = path.join(DATA_ROOT, 'users', userId, 'profile.json');
    let userProfile;
    
    try {
      userProfile = await readJson(userProfilePath, {});
      if (!userProfile || Object.keys(userProfile).length === 0) {
        userProfile = { 
          id: userId,
          type: 'freelancer',
          createdAt: new Date().toISOString()
        };
      }
    } catch (error) {
      userProfile = { 
        id: userId,
        type: 'freelancer',
        createdAt: new Date().toISOString()
      };
    }

    // Check if outlinks already exist
    if (userProfile.outlinks && userProfile.outlinks.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Outlinks already exist, no migration needed',
        outlinks: userProfile.outlinks
      });
    }

    // Convert socialLinks to outlinks format
    const outlinks = freelancerProfile.socialLinks.map((link: any, index: number) => ({
      id: `migrated_${uuidv4()}`,
      platform: link.platform,
      url: link.url,
      label: link.platform.charAt(0).toUpperCase() + link.platform.slice(1),
      order: index,
      createdAt: new Date().toISOString()
    }));

    // Update user profile with outlinks
    userProfile.outlinks = outlinks;
    userProfile.updatedAt = new Date().toISOString();

    // Save updated user profile
    await writeJsonAtomic(userProfilePath, userProfile);

    return NextResponse.json({
      success: true,
      message: `Migrated ${outlinks.length} social links to outlinks`,
      outlinks: outlinks
    });

  } catch (error) {
    console.error('Error migrating social links:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
