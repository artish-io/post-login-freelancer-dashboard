import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';
import { readAllProjects } from '@/lib/projects-utils';
import { readAllTasks, convertHierarchicalToLegacy } from '@/lib/project-tasks/hierarchical-storage';
import { readAllGigs } from '@/lib/gigs/hierarchical-storage';
import { getAllInvoices } from '@/lib/invoice-storage';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const commissionerId = searchParams.get('commissionerId');
    const tab = searchParams.get('tab') || 'all';

    if (!commissionerId) {
      return NextResponse.json(
        { error: 'Commissioner ID is required' },
        { status: 400 }
      );
    }

    // Read data files
    const gigApplicationsPath = path.join(process.cwd(), 'data', 'gigs', 'gig-applications.json');
    const usersPath = path.join(process.cwd(), 'data', 'users.json');
    const freelancersPath = path.join(process.cwd(), 'data', 'freelancers.json');
    const contactsPath = path.join(process.cwd(), 'data', 'contacts.json');
    const organizationsPath = path.join(process.cwd(), 'data', 'organizations.json');
    const commissionerNotificationsPath = path.join(process.cwd(), 'data', 'notifications', 'commissioners.json');

    // Load data from hierarchical storage and flat files
    const [projectsData, hierarchicalTasks, gigsData, gigApplicationsData, usersData, freelancersData, contactsData, organizationsData, commissionerNotificationsData, invoicesData] = await Promise.all([
      readAllProjects(), // Use hierarchical storage for projects
      readAllTasks(), // Use hierarchical storage for project tasks
      readAllGigs(), // Use hierarchical storage for gigs
      fs.promises.readFile(gigApplicationsPath, 'utf8').then(data => JSON.parse(data)),
      fs.promises.readFile(usersPath, 'utf8').then(data => JSON.parse(data)),
      fs.promises.readFile(freelancersPath, 'utf8').then(data => JSON.parse(data)),
      fs.promises.readFile(contactsPath, 'utf8').then(data => JSON.parse(data)),
      fs.promises.readFile(organizationsPath, 'utf8').then(data => JSON.parse(data)),
      fs.promises.readFile(commissionerNotificationsPath, 'utf8').then(data => JSON.parse(data)),
      getAllInvoices() // Use hierarchical storage for invoices
    ]);

    // Convert hierarchical tasks to legacy format for compatibility
    const projectTasksData = convertHierarchicalToLegacy(hierarchicalTasks);

    // Find commissioner's organization
    const organization = organizationsData.find((org: any) => 
      org.contactPersonId === parseInt(commissionerId)
    );

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found for this commissioner' },
        { status: 404 }
      );
    }

    // Get commissioner's network
    const commissionerContacts = contactsData.find((contact: any) =>
      contact.userId === parseInt(commissionerId)
    );
    const networkFreelancerIds = commissionerContacts?.contacts || [];

    // Generate notifications
    const notifications: any[] = [];

    // 1. Task submissions (from project tasks)
    const organizationProjects = projectsData.filter((project: any) => 
      project.organizationId === organization.id
    );
    const organizationProjectIds = organizationProjects.map((p: any) => p.projectId);
    
    organizationProjectIds.forEach((projectId: number) => {
      const projectTasks = projectTasksData.find((pt: any) => pt.projectId === projectId);
      const project = organizationProjects.find((p: any) => p.projectId === projectId);

      if (projectTasks?.tasks && project) {
        projectTasks.tasks
          .filter((task: any) => task.status === 'In review')
          .forEach((task: any) => {
            const freelancer = freelancersData.find((f: any) => f.id === project.freelancerId);
            const user = usersData.find((u: any) => u.id === freelancer?.userId);
            const isFromNetwork = networkFreelancerIds.includes(project.freelancerId);

            notifications.push({
              id: `task-${task.id}-${projectId}`,
              type: 'task_submission',
              title: `${user?.name || 'A freelancer'} submitted a task`,
              message: `"${task.title}" is awaiting your review`,
              timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
              isRead: Math.random() > 0.3,
              user: user ? {
                id: user.id,
                name: user.name,
                avatar: user.avatar,
                title: freelancer?.title
              } : undefined,
              project: {
                id: projectId,
                title: project.title
              },
              isFromNetwork
            });
          });
      }
    });

    // 2. Gig applications
    const commissionerGigs = gigsData.filter((gig: any) =>
      gig.organizationId === organization.id
    );
    const commissionerGigIds = commissionerGigs.map((gig: any) => gig.id);

    // Get applications for commissioner's gigs from gig-applications.json
    const commissionerGigApplications = gigApplicationsData.filter((application: any) =>
      commissionerGigIds.includes(application.gigId)
    );

    // Group applications by gig for summary notifications
    const applicationsByGig = new Map();
    commissionerGigApplications.forEach((application: any) => {
      const gigId = application.gigId;
      if (!applicationsByGig.has(gigId)) {
        applicationsByGig.set(gigId, []);
      }
      applicationsByGig.get(gigId).push(application);
    });

    // Create grouped notifications for each gig
    applicationsByGig.forEach((applications: any[], gigId: number) => {
      const gig = commissionerGigs.find((g: any) => g.id === gigId);
      if (!gig) return;

      if (applications.length === 1) {
        // Single application - show individual notification
        const application = applications[0];
        const freelancer = freelancersData.find((f: any) => f.id === application.freelancerId);
        const user = usersData.find((u: any) => u.id === freelancer?.userId);
        const isFromNetwork = networkFreelancerIds.includes(application.freelancerId);

        notifications.push({
          id: `gig-app-${application.id}`,
          type: 'gig_application',
          title: `${user?.name || 'A freelancer'} applied for ${gig.title}`,
          message: `New application for "${gig.title}"`,
          timestamp: application.submittedAt,
          isRead: Math.random() > 0.4,
          user: user ? {
            id: user.id,
            name: user.name,
            avatar: user.avatar,
            title: freelancer?.title
          } : undefined,
          gig: {
            id: gig.id,
            title: gig.title
          },
          isFromNetwork
        });
      } else {
        // Multiple applications - create separate notifications for network vs non-network
        const networkApplications = applications.filter((app: any) =>
          networkFreelancerIds.includes(app.freelancerId)
        );
        const nonNetworkApplications = applications.filter((app: any) =>
          !networkFreelancerIds.includes(app.freelancerId)
        );

        // Create network notification if there are network applications
        if (networkApplications.length > 0) {
          const sortedNetworkApps = networkApplications.sort((a: any, b: any) =>
            new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
          );
          const latestNetworkApp = sortedNetworkApps[0];
          const firstNetworkApplicant = freelancersData.find((f: any) => f.id === latestNetworkApp.freelancerId);
          const firstNetworkUser = usersData.find((u: any) => u.id === firstNetworkApplicant?.userId);

          const networkTitle = networkApplications.length === 1
            ? `${firstNetworkUser?.name || 'Someone'} applied for ${gig.title}`
            : `${firstNetworkUser?.name || 'Someone'} and ${networkApplications.length - 1} other${networkApplications.length > 2 ? 's' : ''} applied for ${gig.title}`;

          notifications.push({
            id: `gig-app-network-${gigId}`,
            type: 'gig_application',
            title: networkTitle,
            message: `${networkApplications.length} network application${networkApplications.length > 1 ? 's' : ''} for "${gig.title}"`,
            timestamp: latestNetworkApp.submittedAt,
            isRead: Math.random() > 0.4,
            user: firstNetworkUser ? {
              id: firstNetworkUser.id,
              name: firstNetworkUser.name,
              avatar: firstNetworkUser.avatar,
              title: firstNetworkApplicant?.title
            } : undefined,
            gig: {
              id: gig.id,
              title: gig.title
            },
            isFromNetwork: true
          });
        }

        // Create non-network notification if there are non-network applications
        if (nonNetworkApplications.length > 0) {
          const sortedNonNetworkApps = nonNetworkApplications.sort((a: any, b: any) =>
            new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
          );
          const latestNonNetworkApp = sortedNonNetworkApps[0];
          const firstNonNetworkApplicant = freelancersData.find((f: any) => f.id === latestNonNetworkApp.freelancerId);
          const firstNonNetworkUser = usersData.find((u: any) => u.id === firstNonNetworkApplicant?.userId);

          const nonNetworkTitle = nonNetworkApplications.length === 1
            ? `${firstNonNetworkUser?.name || 'Someone'} applied for ${gig.title}`
            : `${firstNonNetworkUser?.name || 'Someone'} and ${nonNetworkApplications.length - 1} other${nonNetworkApplications.length > 2 ? 's' : ''} applied for ${gig.title}`;

          notifications.push({
            id: `gig-app-public-${gigId}`,
            type: 'gig_application',
            title: nonNetworkTitle,
            message: `${nonNetworkApplications.length} application${nonNetworkApplications.length > 1 ? 's' : ''} for "${gig.title}"`,
            timestamp: latestNonNetworkApp.submittedAt,
            isRead: Math.random() > 0.4,
            user: firstNonNetworkUser ? {
              id: firstNonNetworkUser.id,
              name: firstNonNetworkUser.name,
              avatar: firstNonNetworkUser.avatar,
              title: firstNonNetworkApplicant?.title
            } : undefined,
            gig: {
              id: gig.id,
              title: gig.title
            },
            isFromNetwork: false
          });
        }
      }
    });

    // 3. Generate additional notifications from network contacts
    const additionalNotifications: any[] = [];

    if (commissionerContacts?.contacts) {
      // Project pause notification from network contacts
      const pauseContacts = commissionerContacts.contacts.filter((c: any) => c.freelancerId);
      if (pauseContacts.length > 0) {
        // Get the first contact for pause notification
        const pauseContact = pauseContacts[0];
        const pauseUser = usersData.find((u: any) => u.id === pauseContact.freelancerId);
        if (pauseUser) {
          // Find a project involving this freelancer and commissioner
          const relatedProject = projectsData.find((p: any) =>
            p.freelancerId === pauseContact.freelancerId &&
            p.commissionerId === parseInt(commissionerId)
          );

          if (relatedProject) {
            additionalNotifications.push({
              id: 'project-pause-1',
              type: 'project_pause',
              title: `${pauseUser.name} requested a pause for your ${relatedProject.title} project`,
              message: 'Project needs temporary pause',
              timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
              isRead: false,
              user: {
                id: pauseUser.id,
                name: pauseUser.name,
                avatar: pauseUser.avatar,
                title: pauseContact.title
              },
              project: {
                id: relatedProject.projectId,
                title: relatedProject.title
              },
              isFromNetwork: true
            });
          }
        }
      }

      // Project accepted notification from network contacts
      const acceptContacts = commissionerContacts.contacts.filter((c: any) => c.freelancerId);
      if (acceptContacts.length > 1) {
        // Get the second contact for accept notification
        const acceptContact = acceptContacts[1];
        const acceptUser = usersData.find((u: any) => u.id === acceptContact.freelancerId);
        if (acceptUser) {
          // Find a project involving this freelancer and commissioner
          const relatedProject = projectsData.find((p: any) =>
            p.freelancerId === acceptContact.freelancerId &&
            p.commissionerId === parseInt(commissionerId)
          );

          if (relatedProject) {
            additionalNotifications.push({
              id: 'project-accepted-1',
              type: 'project_accepted',
              title: `${acceptUser.name} accepted your project`,
              message: `${relatedProject.title} project has been accepted and will start soon`,
              timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
              isRead: false,
              user: {
                id: acceptUser.id,
                name: acceptUser.name,
                avatar: acceptUser.avatar,
                title: acceptContact.title
              },
              project: {
                id: relatedProject.projectId,
                title: relatedProject.title
              },
              isFromNetwork: true
            });
          }
        }
      }

      // Proposal notification from network contacts
      const proposalContacts = commissionerContacts.contacts.filter((c: any) => c.freelancerId);
      if (proposalContacts.length > 2) {
        // Get the third contact for proposal notification
        const proposalContact = proposalContacts[2];
        const proposalUser = usersData.find((u: any) => u.id === proposalContact.freelancerId);
        if (proposalUser) {
          additionalNotifications.push({
            id: 'proposal-1',
            type: 'proposal_sent',
            title: `${proposalUser.name} sent you a proposal`,
            message: 'New project proposal for video production services',
            timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            isRead: false,
            user: {
              id: proposalUser.id,
              name: proposalUser.name,
              avatar: proposalUser.avatar,
              title: proposalContact.title
            },
            isFromNetwork: true
          });
        }
      }

      // Invoice notification from network contacts
      const invoiceContacts = commissionerContacts.contacts.filter((c: any) => c.freelancerId);
      if (invoiceContacts.length > 0) {
        // Get the first contact with an invoice
        const contactWithInvoice = invoiceContacts.find((contact: any) => {
          return invoicesData.some((inv: any) => inv.freelancerId === contact.freelancerId);
        });

        if (contactWithInvoice) {
          const freelancerUser = usersData.find((u: any) => u.id === contactWithInvoice.freelancerId);
          if (freelancerUser) {
            // Find an invoice from this freelancer
            const freelancerInvoice = invoicesData.find((inv: any) => inv.freelancerId === contactWithInvoice.freelancerId);
            if (freelancerInvoice) {
              additionalNotifications.push({
                id: 'invoice-1',
                type: 'invoice_sent',
                title: `${freelancerUser.name} sent you a new invoice`,
                message: `Invoice ${freelancerInvoice.invoiceNumber} for ${freelancerInvoice.projectTitle}`,
                timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
                isRead: false,
                user: {
                  id: freelancerUser.id,
                  name: freelancerUser.name,
                  avatar: freelancerUser.avatar,
                  title: contactWithInvoice.title
                },
                invoice: {
                  number: freelancerInvoice.invoiceNumber,
                  amount: freelancerInvoice.totalAmount,
                  projectTitle: freelancerInvoice.projectTitle
                },
                isFromNetwork: true
              });
            }
          }
        }
      }

      // Add sample notifications for new types
      const sampleNotifications = [
        // Invoice paid notification
        {
          id: 'invoice-paid-1',
          type: 'invoice_paid',
          title: 'Invoice payment processed',
          message: 'Payment for milestone 2 has been processed successfully',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          isRead: false,
          project: {
            id: 1,
            title: 'Interactive Park Map Web App'
          },
          isFromNetwork: false
        },
        // Project pause accepted notification
        {
          id: 'project-pause-accepted-1',
          type: 'project_pause_accepted',
          title: 'Project pause request approved',
          message: 'Your request to pause the Interactive Park Map project has been approved',
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          isRead: false,
          project: {
            id: 1,
            title: 'Interactive Park Map Web App'
          },
          isFromNetwork: false
        },
        // Storefront purchase notification
        {
          id: 'storefront-purchase-1',
          type: 'storefront_purchase',
          title: 'Marsgate Fletcher just purchased Poetry Slam Live tickets',
          message: 'New sale on your storefront',
          timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          isRead: false,
          isFromNetwork: false
        }
      ];

      additionalNotifications.push(...sampleNotifications);

      // Add additional notifications to main notifications array
      notifications.push(...additionalNotifications);
    }

    // Get existing persistent notifications for this commissioner
    let commissionerNotifications = commissionerNotificationsData.find((cn: any) =>
      cn.commissionerId === parseInt(commissionerId)
    );

    if (!commissionerNotifications) {
      // Create new commissioner entry if doesn't exist
      commissionerNotifications = {
        commissionerId: parseInt(commissionerId),
        notifications: []
      };
      commissionerNotificationsData.push(commissionerNotifications);
    }

    // Merge generated notifications with persistent ones (avoid duplicates)
    const existingIds = new Set(commissionerNotifications.notifications.map((n: any) => n.id));
    const newNotifications = notifications.filter(n => !existingIds.has(n.id));

    // Add new notifications to persistent storage
    if (newNotifications.length > 0) {
      commissionerNotifications.notifications.push(...newNotifications);

      // Write back to file
      fs.writeFileSync(commissionerNotificationsPath, JSON.stringify(commissionerNotificationsData, null, 2));
    }

    // Combine all notifications and enrich with user data
    const allNotifications = [...commissionerNotifications.notifications];

    // Enrich notifications with user data if they have userId but no user object
    const enrichedNotifications = allNotifications.map((notification: any) => {
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

    // Filter based on tab
    let filteredNotifications = enrichedNotifications;
    if (tab === 'network') {
      filteredNotifications = enrichedNotifications.filter((n: any) => n.isFromNetwork);
    }

    // Sort by timestamp (newest first)
    filteredNotifications.sort((a: any, b: any) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return NextResponse.json({
      notifications: filteredNotifications,
      counts: {
        all: allNotifications.length,
        network: allNotifications.filter((n: any) => n.isFromNetwork).length
      }
    });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { notificationId, commissionerId } = await request.json();

    if (!notificationId || !commissionerId) {
      return NextResponse.json(
        { error: 'Notification ID and Commissioner ID are required' },
        { status: 400 }
      );
    }

    // Read commissioner notifications
    const commissionerNotificationsPath = path.join(process.cwd(), 'data', 'notifications', 'commissioners.json');
    const commissionerNotificationsData = JSON.parse(fs.readFileSync(commissionerNotificationsPath, 'utf8'));

    // Find commissioner's notifications
    const commissionerEntry = commissionerNotificationsData.find((entry: any) =>
      entry.commissionerId === parseInt(commissionerId)
    );

    if (!commissionerEntry) {
      return NextResponse.json(
        { error: 'Commissioner not found' },
        { status: 404 }
      );
    }

    // Find and mark notification as read
    const notificationIndex = commissionerEntry.notifications.findIndex((notif: any) =>
      notif.id === notificationId
    );

    if (notificationIndex === -1) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }

    // Mark as read
    commissionerEntry.notifications[notificationIndex].isRead = true;

    // Save updated data
    fs.writeFileSync(commissionerNotificationsPath, JSON.stringify(commissionerNotificationsData, null, 2));

    return NextResponse.json({
      success: true,
      message: 'Notification marked as read'
    });

  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark notification as read' },
      { status: 500 }
    );
  }
}
