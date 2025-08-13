import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { readUser, writeUser, UserProfile } from '@/lib/storage/normalize-user';
import { getAllOrganizations } from '@/lib/storage/unified-storage-service';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Read user from hierarchical storage (with legacy fallback)
    const userId = parseInt(id);
    const user = await readUser(userId);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // If user has an organizationId, get organization details
    let organizationInfo = null;
    if (user.organizationId) {
      const organizations = await getAllOrganizations();
      const organization = organizations.find((org: any) => org.id === user.organizationId);
      if (organization) {
        organizationInfo = {
          organization: organization.name,
          organizationLogo: organization.logo,
          address: organization.address
        };
      }
    }

    // Return user with organization info
    const response = {
      ...user,
      ...organizationInfo
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error reading user data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Users can only update their own profile
    if (session.user.id !== id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updates = await request.json();

    // Read user from hierarchical storage (with legacy fallback)
    const userId = parseInt(id);
    const existingUser = await readUser(userId);

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Merge updates with existing user data
    const updatedUser: UserProfile = {
      ...existingUser,
      ...updates,
      id: userId, // Ensure ID doesn't change
      updatedAt: new Date().toISOString()
    };

    // Write to hierarchical storage
    await writeUser(updatedUser);

    return NextResponse.json({
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Error updating user data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}