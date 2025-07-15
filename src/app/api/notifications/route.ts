import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';

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
    const projectsPath = path.join(process.cwd(), 'data', 'projects.json');
    const projectTasksPath = path.join(process.cwd(), 'data', 'project-tasks.json');
    const gigsPath = path.join(process.cwd(), 'data', 'gigs', 'gigs.json');
    const gigApplicationsPath = path.join(process.cwd(), 'data', 'gigs', 'gig-applications.json');
    const usersPath = path.join(process.cwd(), 'data', 'users.json');
    const freelancersPath = path.join(process.cwd(), 'data', 'freelancers.json');
    const commissionerContactsPath = path.join(process.cwd(), 'data', 'commissioner-contacts.json');
    const organizationsPath = path.join(process.cwd(), 'data', 'organizations.json');
    const commissionerNotificationsPath = path.join(process.cwd(), 'data', 'notifications', 'commissioners.json');
    const invoicesPath = path.join(process.cwd(), 'data', 'invoices.json');

    const projectsData = JSON.parse(fs.readFileSync(projectsPath, 'utf8'));
    const projectTasksData = JSON.parse(fs.readFileSync(projectTasksPath, 'utf8'));
    const gigsData = JSON.parse(fs.readFileSync(gigsPath, 'utf8'));
    const gigApplicationsData = JSON.parse(fs.readFileSync(gigApplicationsPath, 'utf8'));
    const usersData = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
    const freelancersData = JSON.parse(fs.readFileSync(freelancersPath, 'utf8'));
    const commissionerContactsData = JSON.parse(fs.readFileSync(commissionerContactsPath, 'utf8'));
    const organizationsData = JSON.parse(fs.readFileSync(organizationsPath, 'utf8'));
    const commissionerNotificationsData = JSON.parse(fs.readFileSync(commissionerNotificationsPath, 'utf8'));
    const invoicesData = JSON.parse(fs.readFileSync(invoicesPath, 'utf8'));

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
    const commissionerContacts = commissionerContactsData.find((contact: any) => 
      contact.commissionerId === parseInt(commissionerId)
    );
    const networkFreelancerIds = commissionerContacts?.contacts?.map((c: any) => c.freelancerId) || [];

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
      
      if (projectTasks?.tasks) {
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
      // Project pause notification from network contact
      const pauseContact = commissionerContacts.contacts.find((c: any) => c.freelancerId === 28); // Billy Parker
      if (pauseContact) {
        const billyUser = usersData.find((u: any) => u.id === 28);
        if (billyUser) {
          additionalNotifications.push({
            id: 'project-pause-1',
            type: 'project_pause',
            title: `${billyUser.name} requested a pause for your Brand Animation Package project`,
            message: 'Motion graphics project needs temporary pause',
            timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            isRead: false,
            user: {
              id: billyUser.id,
              name: billyUser.name,
              avatar: billyUser.avatar,
              title: pauseContact.title
            },
            project: {
              id: 301,
              title: pauseContact.lastProject
            },
            isFromNetwork: true
          });
        }
      }

      // Project accepted notification from network contact
      const acceptContact = commissionerContacts.contacts.find((c: any) => c.freelancerId === 26); // Stella Maxwell
      if (acceptContact) {
        const stellaUser = usersData.find((u: any) => u.id === 26);
        if (stellaUser) {
          additionalNotifications.push({
            id: 'project-accepted-1',
            type: 'project_accepted',
            title: `${stellaUser.name} accepted your project`,
            message: 'UI component library project has been accepted and will start soon',
            timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            isRead: false,
            user: {
              id: stellaUser.id,
              name: stellaUser.name,
              avatar: stellaUser.avatar,
              title: acceptContact.title
            },
            project: {
              id: 302,
              title: acceptContact.lastProject
            },
            isFromNetwork: true
          });
        }
      }

      // Proposal notification from network contact
      const proposalContact = commissionerContacts.contacts.find((c: any) => c.freelancerId === 25); // Didi Adeleke
      if (proposalContact) {
        const didiUser = usersData.find((u: any) => u.id === 25);
        if (didiUser) {
          additionalNotifications.push({
            id: 'proposal-1',
            type: 'proposal_sent',
            title: `${didiUser.name} sent you a proposal`,
            message: 'New project proposal for video production services',
            timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            isRead: false,
            user: {
              id: didiUser.id,
              name: didiUser.name,
              avatar: didiUser.avatar,
              title: proposalContact.title
            },
            isFromNetwork: true
          });
        }
      }

      // Invoice notification from network contact
      const invoiceContact = commissionerContacts.contacts.find((c: any) => c.freelancerId === 31); // Margsate Flether
      if (invoiceContact) {
        const margsateUser = usersData.find((u: any) => u.id === 31);
        if (margsateUser) {
          // Find an invoice from this freelancer
          const freelancerInvoice = invoicesData.find((inv: any) => inv.freelancerId === 31);
          if (freelancerInvoice) {
            additionalNotifications.push({
              id: 'invoice-1',
              type: 'invoice_sent',
              title: `${margsateUser.name} sent you a new invoice`,
              message: `Invoice ${freelancerInvoice.invoiceNumber} for ${freelancerInvoice.projectTitle}`,
              timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
              isRead: false,
              user: {
                id: margsateUser.id,
                name: margsateUser.name,
                avatar: margsateUser.avatar,
                title: invoiceContact.title
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

    notifications.push(...additionalNotifications);

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

    // Combine all notifications
    const allNotifications = [...commissionerNotifications.notifications];

    // Filter based on tab
    let filteredNotifications = allNotifications;
    if (tab === 'network') {
      filteredNotifications = allNotifications.filter((n: any) => n.isFromNetwork);
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
