import { NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { NotificationStorage } from '@/lib/notifications/notification-storage';

const APPLICATIONS_PATH = path.join(process.cwd(), 'data/gigs/gig-applications.json');

export async function POST(req: Request) {
  try {
    const { applicationId } = await req.json();

    if (!applicationId) {
      return NextResponse.json(
        { error: 'Missing applicationId' },
        { status: 400 }
      );
    }

    // Read applications data
    const applicationsData = await readFile(APPLICATIONS_PATH, 'utf-8');
    const applications = JSON.parse(applicationsData);

    // Find and update the application
    const applicationIndex = applications.findIndex((app: any) => app.id === applicationId);
    
    if (applicationIndex === -1) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    const application = applications[applicationIndex];

    // Update application status to rejected with timestamp
    applications[applicationIndex].status = 'rejected';
    applications[applicationIndex].rejectedAt = new Date().toISOString();

    // Save updated applications
    await writeFile(APPLICATIONS_PATH, JSON.stringify(applications, null, 2));

    // Send rejection notification to freelancer
    try {
      // Get gig and organization data for notification
      const gigsResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3001'}/api/gigs/all`);
      const gigs = await gigsResponse.json();
      const gig = gigs.find((g: any) => g.id === application.gigId);

      if (gig) {
        // Get organization data
        const orgsResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3001'}/api/organizations`);
        const organizations = await orgsResponse.json();
        const organization = organizations.find((org: any) => org.id === gig.organizationId);

        // Create rejection notification
        const rejectionEvent = {
          id: `gig_rejected_${application.id}_${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'gig_rejected',
          notificationType: 61, // New notification type for rejections
          actorId: gig.commissionerId,
          targetId: application.freelancerId,
          entityType: 3, // Gig entity
          entityId: String(application.gigId),
          metadata: {
            gigTitle: gig.title,
            organizationName: organization?.name || 'Organization',
            rejectionMessage: `${organization?.name || 'Organization'} has rejected your application for "${gig.title}". You will be able to re-apply if this gig listing is still active after 21 days.`,
            cooldownUntil: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString() // 21 days from now
          },
          context: {
            gigId: application.gigId,
            applicationId: application.id,
            organizationId: gig.organizationId
          }
        };

        NotificationStorage.addEvent(rejectionEvent);
      }
    } catch (notificationError) {
      console.error('Failed to send rejection notification:', notificationError);
      // Don't fail the main operation if notification fails
    }

    return NextResponse.json({
      success: true,
      message: 'Application rejected successfully',
      rejectedAt: applications[applicationIndex].rejectedAt
    });

  } catch (error) {
    console.error('Error rejecting application:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
