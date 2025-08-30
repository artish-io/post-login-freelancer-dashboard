import { NextRequest, NextResponse } from 'next/server';
import { writeUser, UserProfile } from '@/lib/storage/normalize-user';
import { writeOrganization, OrganizationProfile } from '@/lib/storage/normalize-organization';
import { loadUsersIndex } from '@/lib/storage/users-index';
import { loadOrganizationsIndex } from '@/lib/storage/organizations-index';

// DEV-ONLY: Simple signup endpoint for local development
// TODO: Replace with production authentication service (Firebase/Cognito) later

/**
 * Migrate proposals and projects when a user joins an existing organization
 */
async function migrateUserProposalsAndProjects(userId: number, newOrganizationId: number) {
  try {
    console.log(`🔄 MIGRATION: Starting migration for user ${userId} to organization ${newOrganizationId}`);

    // Import required functions
    const { readAllProposals, updateProposal } = await import('@/lib/proposals/proposal-storage');
    const { UnifiedStorageService } = await import('@/lib/storage/unified-storage-service');

    // Find proposals where this user is the commissioner
    const proposals = await readAllProposals();
    const userProposals = proposals.filter((p: any) => p.commissionerId === userId);

    console.log(`🔍 MIGRATION: Found ${userProposals.length} proposals for user ${userId}`);

    // Update proposals with new organization ID
    for (const proposal of userProposals) {
      if (proposal.organizationId !== newOrganizationId) {
        console.log(`🔄 MIGRATION: Updating proposal ${proposal.id} organizationId: ${proposal.organizationId} → ${newOrganizationId}`);
        await updateProposal(proposal.id, { organizationId: newOrganizationId } as any);
      }
    }

    // Find projects where this user is the commissioner
    const projects = await UnifiedStorageService.listProjects();
    const userProjects = projects.filter((p: any) => p.commissionerId === userId);

    console.log(`🔍 MIGRATION: Found ${userProjects.length} projects for user ${userId}`);

    // Update projects with new organization ID
    for (const project of userProjects) {
      if (project.organizationId !== newOrganizationId) {
        console.log(`🔄 MIGRATION: Updating project ${project.projectId} organizationId: ${project.organizationId} → ${newOrganizationId}`);

        // Update project data
        const updatedProject = {
          ...project,
          organizationId: newOrganizationId,
          updatedAt: new Date().toISOString()
        };

        await UnifiedStorageService.writeProject(updatedProject);
      }
    }

    console.log(`✅ MIGRATION: Completed migration for user ${userId}`);
  } catch (error) {
    console.error(`❌ MIGRATION: Failed to migrate data for user ${userId}:`, error);
    // Don't throw - this is a best-effort migration
  }
}

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const role = url.searchParams.get('role');
    
    if (!role || !['freelancer', 'commissioner'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be "freelancer" or "commissioner"' },
        { status: 400 }
      );
    }

    const payload = await request.json();
    const { 
      firstName, 
      lastName, 
      email, 
      bio, 
      avatar, 
      skills = [], 
      tools = [], 
      links = {},
      organization 
    } = payload;

    // Validate required fields
    if (!firstName || !lastName || !email || !bio) {
      return NextResponse.json(
        { error: 'Missing required fields: firstName, lastName, email, bio' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const usersIndex = await loadUsersIndex();
    const existingUsers = Object.keys(usersIndex);
    
    // We need to check all existing users for email conflicts
    // This is a simplified check - in production, use proper database constraints
    for (const userId of existingUsers) {
      try {
        const { readUser } = await import('@/lib/storage/normalize-user');
        const existingUser = await readUser(parseInt(userId));
        if (existingUser.email?.toLowerCase() === email.toLowerCase()) {
          return NextResponse.json(
            { error: 'Email already exists' },
            { status: 409 }
          );
        }
      } catch (error) {
        // Skip users that can't be read
        continue;
      }
    }

    // Generate new user ID (deterministic allocation)
    const maxUserId = existingUsers.length > 0 
      ? Math.max(...existingUsers.map(id => parseInt(id))) 
      : 0;
    const newUserId = maxUserId + 1;

    const now = new Date().toISOString();
    
    // Create user profile
    const userProfile: UserProfile = {
      id: newUserId,
      name: `${firstName} ${lastName}`,
      title: role === 'freelancer' ? 'Freelancer' : 'Commissioner', // Can be updated later
      email: email.toLowerCase(),
      type: role,
      avatar: avatar || `/avatars/default-${role}.png`,
      bio,
      skills: role === 'freelancer' ? skills : [],
      tools: role === 'freelancer' ? tools : [],
      links,
      createdAt: now,
      updatedAt: now
    };

    let organizationId: number | null = null;

    // Handle organization for commissioners
    if (role === 'commissioner') {
      const { organization, joinOrganizationId } = body;

      if (joinOrganizationId) {
        // Join existing organization
        organizationId = joinOrganizationId;

        // Get existing organization and add user to associatedCommissioners
        const { readOrganization, writeOrganization } = await import('@/lib/storage/normalize-organization');
        const existingOrg = await readOrganization(organizationId);

        if (existingOrg) {
          // Add user to associatedCommissioners if not already there
          if (!existingOrg.associatedCommissioners.includes(newUserId)) {
            existingOrg.associatedCommissioners.push(newUserId);
            existingOrg.updatedAt = now;
            await writeOrganization(existingOrg);
          }

          // Add organization reference to user
          userProfile.organizationId = organizationId;

          // 🔄 MIGRATION: Check for any proposals/projects that need to be migrated
          await migrateUserProposalsAndProjects(newUserId, organizationId);
        } else {
          throw new Error('Selected organization not found');
        }
      } else if (organization?.name) {
        // Create new organization
        const { name: orgName, website, bio: orgBio, logo } = organization;

        // Generate organization ID
        const orgsIndex = await loadOrganizationsIndex();
        const existingOrgIds = Object.keys(orgsIndex);
        const maxOrgId = existingOrgIds.length > 0
          ? Math.max(...existingOrgIds.map(id => parseInt(id)))
          : 0;
        organizationId = maxOrgId + 1;

        const orgProfile: OrganizationProfile = {
          id: organizationId,
          name: orgName,
          bio: orgBio || '',
          website: website || '',
          logo: logo || '/logos/default-org.png',
          firstCommissionerId: newUserId,
          associatedCommissioners: [newUserId],
          createdAt: now,
          updatedAt: now
        };

        // Save organization
        await writeOrganization(orgProfile);

        // Add organization reference to user
        userProfile.organizationId = organizationId;
      }
    }

    // Save user profile
    await writeUser(userProfile);

    console.log(`✅ [DEV SIGNUP] Created ${role} user:`, {
      id: newUserId,
      name: userProfile.name,
      email: userProfile.email,
      organizationId
    });

    return NextResponse.json({
      success: true,
      user: {
        id: newUserId,
        name: userProfile.name,
        email: userProfile.email,
        type: role,
        organizationId
      }
    });

  } catch (error) {
    console.error('🔥 Signup error:', error);
    
    // Handle file size errors for avatar uploads
    if (error instanceof Error && error.message.includes('too large')) {
      return NextResponse.json(
        { error: 'Avatar file too large. Maximum size is 2MB.' },
        { status: 413 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error during signup' },
      { status: 500 }
    );
  }
}
