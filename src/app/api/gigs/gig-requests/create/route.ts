import { NextResponse } from 'next/server';
import { writeFile, mkdir, readFile } from 'fs/promises';
import path from 'path';
import { NotificationStorage } from '@/lib/notifications/notification-storage';
import { NOTIFICATION_TYPES } from '@/lib/events/event-logger';

interface GigRequestPayload {
  freelancerId: number;
  commissionerId: number;
  gigId?: number;
  organizationId?: number;
  title: string;
  skills: string[];
  tools: string[];
  notes: string;
  budget?: {
    min: number;
    max: number;
    currency: string;
  };
  hourlyRateMin?: number;
  hourlyRateMax?: number;
  deliveryTimeWeeks?: number;
}

export async function POST(req: Request) {
  try {
    const payload: GigRequestPayload = await req.json();
    
    // Validate required fields
    if (!payload.freelancerId || !payload.commissionerId || !payload.title) {
      return NextResponse.json(
        { error: 'Missing required fields: freelancerId, commissionerId, title' },
        { status: 400 }
      );
    }

    // Generate current date paths
    const now = new Date();
    const year = now.getFullYear();
    const month = now.toLocaleString('default', { month: 'long' });
    const day = now.getDate().toString().padStart(2, '0');
    
    // Create directory structure
    const dirPath = path.join(process.cwd(), 'data/gigs/gig-requests', year.toString(), month, day);
    await mkdir(dirPath, { recursive: true });
    
    // Generate unique ID based on timestamp
    const id = Date.now();
    
    // Create gig request object
    const gigRequest = {
      id,
      freelancerId: payload.freelancerId,
      commissionerId: payload.commissionerId,
      gigId: payload.gigId || null,
      organizationId: payload.organizationId || null,
      title: payload.title,
      skills: payload.skills || [],
      tools: payload.tools || [],
      notes: payload.notes || '',
      budget: payload.budget || null,
      hourlyRateMin: payload.hourlyRateMin || null,
      hourlyRateMax: payload.hourlyRateMax || null,
      deliveryTimeWeeks: payload.deliveryTimeWeeks || null,
      status: 'Available',
      createdAt: now.toISOString(),
      responses: []
    };
    
    // Write to file named by freelancerId
    const filePath = path.join(dirPath, `${payload.freelancerId}.json`);
    
    // Check if file exists and read existing data
    let existingRequests = [];
    try {
      const existingData = await readFile(filePath, 'utf-8');
      existingRequests = JSON.parse(existingData);
    } catch (error) {
      // File doesn't exist, start with empty array
      existingRequests = [];
    }
    
    // Add new request to existing data
    existingRequests.push(gigRequest);
    
    // Write updated data back to file
    await writeFile(filePath, JSON.stringify(existingRequests, null, 2));

    // Create notification for the freelancer
    try {
      // Get organization and commissioner data for the notification
      const [organizationsData, usersData] = await Promise.all([
        import('@/lib/storage/unified-storage-service').then(m => m.getAllOrganizations()),
        import('@/lib/storage/unified-storage-service').then(m => m.getAllUsers())
      ]);

      const commissioner = usersData.find((user: any) => user.id === payload.commissionerId);
      const organization = organizationsData.find((org: any) => org.id === payload.organizationId || org.contactPersonId === payload.commissionerId);

      if (commissioner && organization) {
        const notificationEvent = {
          id: `gig_request_sent_${id}_${Date.now()}`,
          timestamp: now.toISOString(),
          type: 'gig_request_sent',
          notificationType: NOTIFICATION_TYPES.GIG_REQUEST_SENT,
          actorId: payload.commissionerId,
          targetId: payload.freelancerId,
          entityType: 3, // GIG entity type
          entityId: id.toString(),
          metadata: {
            gigTitle: payload.title,
            organizationName: organization.name,
            organizationLogo: organization.logo,
            budgetMin: payload.budget?.min,
            budgetMax: payload.budget?.max
          },
          context: {
            gigId: payload.gigId || null,
            organizationId: organization.id,
            requestId: id
          }
        };

        NotificationStorage.addEvent(notificationEvent as any);
        console.log(`✅ Created gig request notification for freelancer ${payload.freelancerId}`);
      }
    } catch (notificationError) {
      console.error('Failed to create gig request notification:', notificationError);
      // Don't fail the main operation if notification fails
    }

    return NextResponse.json({
      success: true,
      gigRequest,
      message: 'Gig request created successfully'
    });
    
  } catch (error) {
    console.error('Error creating gig request:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
