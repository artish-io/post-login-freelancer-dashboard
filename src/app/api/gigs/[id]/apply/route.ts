

import { NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';
import { readGig } from '@/lib/gigs/hierarchical-storage';
import { NotificationStorage } from '@/lib/notifications/notification-storage';
import {
  readAllGigApplications,
  writeGigApplication,
  GigApplication
} from '@/lib/gigs/gig-applications-storage';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const gigId = Number(id);

  try {
    const body = await req.json();

    const {
      freelancerId,
      pitch,
      sampleLinks = [],
      skills = [],
      tools = []
    } = body;

    if (!freelancerId || !pitch || !Array.isArray(sampleLinks)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Check if gig is still available for applications
    const gig = await readGig(gigId);
    if (!gig) {
      return NextResponse.json({ error: 'Gig not found' }, { status: 404 });
    }

    if (gig.status !== 'Available') {
      return NextResponse.json({
        error: 'This gig is no longer accepting applications',
        gigStatus: gig.status
      }, { status: 409 });
    }

    // Use hierarchical storage
    const applications = await readAllGigApplications();

    // Generate new application ID
    const maxId = applications.length > 0 ? Math.max(...applications.map((app: any) => app.id)) : 0;

    const newApplication: GigApplication = {
      id: maxId + 1,
      gigId,
      freelancerId,
      pitch,
      sampleLinks,
      skills,
      tools,
      submittedAt: new Date().toISOString(),
      status: 'pending'
    };

    // Write to hierarchical storage
    await writeGigApplication(newApplication);

    // Create notification for the commissioner
    try {
      // Get freelancer data for the notification
      const usersResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/users`);
      const users = await usersResponse.json();
      const freelancer = users.find((u: any) => u.id === freelancerId);

      if (freelancer && gig.commissionerId) {
        const notificationEvent = {
          id: `gig_applied_${gigId}_${freelancerId}_${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'gig_applied',
          notificationType: 60, // Using the same type as existing gig_applied notifications
          actorId: freelancerId,
          targetId: gig.commissionerId,
          entityType: 3, // GIG entity type
          entityId: gigId.toString(),
          metadata: {
            gigTitle: gig.title,
            applicationMessage: 'Application submitted',
            freelancerName: freelancer.name
          },
          context: {
            gigId: gigId,
            applicationId: newApplication.id
          }
        };

        NotificationStorage.addEvent(notificationEvent);
        console.log(`✅ Created gig application notification for commissioner ${gig.commissionerId}`);
      }
    } catch (error) {
      console.error('Failed to create notification:', error);
      // Don't fail the application submission if notification fails
    }

    return NextResponse.json({ success: true, applicationId: newApplication.id });
  } catch (error) {
    console.error('Failed to submit application:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}