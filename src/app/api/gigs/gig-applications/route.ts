

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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const gigId = searchParams.get('gigId');
    const freelancerId = searchParams.get('freelancerId');

    // Use hierarchical storage
    const applications = await readAllGigApplications();

    let filteredApplications = applications;

    if (gigId) {
      filteredApplications = filteredApplications.filter((app: any) =>
        app.gigId === parseInt(gigId)
      );
    }

    if (freelancerId) {
      filteredApplications = filteredApplications.filter((app: any) =>
        app.freelancerId === parseInt(freelancerId)
      );
    }

    return NextResponse.json(filteredApplications);
  } catch (error) {
    console.error('Failed to fetch applications:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      gigId,
      freelancerId,
      pitch,
      sampleLinks = [],
      skills = [],
      tools = []
    } = body;

    if (!gigId || !freelancerId || !pitch || !Array.isArray(sampleLinks)) {
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

    // Check for existing applications from this freelancer to this gig
    const existingApplications = applications.filter((app: any) =>
      app.gigId === gigId && app.freelancerId === freelancerId
    );

    if (existingApplications.length > 0) {
      const latestApplication = existingApplications[existingApplications.length - 1];

      // If there's a pending or accepted application, prevent duplicate
      if (latestApplication.status === 'pending' || latestApplication.status === 'accepted' || !latestApplication.status) {
        return NextResponse.json({
          error: 'You have already applied to this gig',
          applicationStatus: latestApplication.status || 'pending'
        }, { status: 409 });
      }

      // If the latest application was rejected, check 21-day cooldown
      if (latestApplication.status === 'rejected' && latestApplication.rejectedAt) {
        const rejectionDate = new Date(latestApplication.rejectedAt);
        const cooldownEnd = new Date(rejectionDate.getTime() + 21 * 24 * 60 * 60 * 1000); // 21 days
        const now = new Date();

        if (now < cooldownEnd) {
          const daysRemaining = Math.ceil((cooldownEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          return NextResponse.json({
            error: `You cannot re-apply to this gig yet. Please wait ${daysRemaining} more day${daysRemaining > 1 ? 's' : ''}.`,
            cooldownUntil: cooldownEnd.toISOString(),
            daysRemaining
          }, { status: 429 }); // Too Many Requests
        }
      }
    }

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