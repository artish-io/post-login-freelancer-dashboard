import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const freelancerId = searchParams.get('freelancerId');
    const tab = searchParams.get('tab') || 'all';

    if (!freelancerId) {
      return NextResponse.json(
        { error: 'Freelancer ID is required' },
        { status: 400 }
      );
    }

    // Read freelancer notifications data and users data
    const freelancerNotificationsPath = path.join(process.cwd(), 'data', 'notifications', 'freelancers.json');
    const usersPath = path.join(process.cwd(), 'data', 'users.json');

    let freelancerNotificationsData = [];
    let usersData = [];

    try {
      freelancerNotificationsData = JSON.parse(fs.readFileSync(freelancerNotificationsPath, 'utf8'));
      usersData = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
    } catch (error) {
      // If file doesn't exist or is empty, return empty array
      console.log('Freelancer notifications file not found or empty, returning empty notifications');
    }

    // Find notifications for this freelancer
    const freelancerNotifications = freelancerNotificationsData.find((f: any) => 
      f.freelancerId === parseInt(freelancerId)
    );

    let notifications = [];
    if (freelancerNotifications && freelancerNotifications.notifications) {
      notifications = freelancerNotifications.notifications;
    }

    // Add sample notifications for new types (for demonstration)
    const sampleNotifications = [
      // Gig request from commissioner
      {
        id: 'gig-request-1',
        type: 'gig_request',
        title: 'New gig request from Lagos State Parks Services',
        message: 'You have been invited to apply for Interactive Park Map Web App',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        isRead: false,
        organization: {
          id: 1,
          name: 'Lagos State Parks Services',
          logo: '/organization-logos/lagos-parks.png'
        },
        gig: {
          id: 1,
          title: 'Interactive Park Map Web App'
        }
      },
      // Invoice paid notification
      {
        id: 'invoice-paid-freelancer-1',
        type: 'invoice_paid',
        title: 'Payment received',
        message: 'Your invoice for milestone 2 has been paid',
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        isRead: false,
        project: {
          id: 1,
          title: 'Interactive Park Map Web App'
        }
      }
    ];

    notifications.push(...sampleNotifications);

    // Enrich notifications with user data if they have userId but no user object
    const enrichedNotifications = notifications.map((notification: any) => {
      if (notification.userId && !notification.user) {
        const user = usersData.find((u: any) => u.id === notification.userId);
        if (user) {
          return {
            ...notification,
            user: {
              id: user.id,
              name: user.name,
              avatar: user.avatar,
              title: user.title
            }
          };
        }
      }
      return notification;
    });

    // Filter notifications based on tab
    let filteredNotifications = enrichedNotifications;
    if (tab === 'projects') {
      filteredNotifications = enrichedNotifications.filter((notif: any) =>
        ['task_completed', 'task_rejected', 'task_comment', 'project_pause', 'project_pause_accepted', 'project_accepted', 'invoice_paid'].includes(notif.type)
      );
    } else if (tab === 'gigs') {
      filteredNotifications = enrichedNotifications.filter((notif: any) =>
        ['gig_request', 'gig_request_accepted', 'new_gig_request', 'proposal_sent'].includes(notif.type)
      );
    }

    // Calculate counts for each tab
    const allCount = enrichedNotifications.length;
    const projectsCount = enrichedNotifications.filter((notif: any) =>
      ['task_completed', 'task_rejected', 'task_comment', 'project_pause', 'project_pause_accepted', 'project_accepted', 'invoice_paid'].includes(notif.type)
    ).length;
    const gigsCount = enrichedNotifications.filter((notif: any) =>
      ['gig_request', 'gig_request_accepted', 'new_gig_request', 'proposal_sent'].includes(notif.type)
    ).length;

    // Sort notifications by timestamp (newest first)
    filteredNotifications.sort((a: any, b: any) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return NextResponse.json({
      notifications: filteredNotifications,
      counts: {
        all: allCount,
        projects: projectsCount,
        gigs: gigsCount
      }
    });

  } catch (error) {
    console.error('Error fetching freelancer notifications:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
