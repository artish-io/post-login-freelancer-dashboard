/**
 * Generate historical events from existing data for test accounts (users 31 and 32)
 * This script analyzes existing data files and creates event logs
 */

const fs = require('fs');
const path = require('path');

console.log('🔄 Generating historical events for test accounts...\n');

// Load all data files
const dataDir = path.join(__dirname, '..', 'data');
const users = JSON.parse(fs.readFileSync(path.join(dataDir, 'users.json'), 'utf-8'));
const projects = JSON.parse(fs.readFileSync(path.join(dataDir, 'projects.json'), 'utf-8'));
const projectTasks = JSON.parse(fs.readFileSync(path.join(dataDir, 'project-tasks.json'), 'utf-8'));
const messages = JSON.parse(fs.readFileSync(path.join(dataDir, 'messages.json'), 'utf-8'));
const gigs = JSON.parse(fs.readFileSync(path.join(dataDir, 'gigs', 'gigs.json'), 'utf-8'));
const gigApplications = JSON.parse(fs.readFileSync(path.join(dataDir, 'gigs', 'gig-applications.json'), 'utf-8'));
const organizations = JSON.parse(fs.readFileSync(path.join(dataDir, 'organizations.json'), 'utf-8'));
const storefrontPurchases = JSON.parse(fs.readFileSync(path.join(dataDir, 'storefront', 'purchases.json'), 'utf-8'));
const storefrontProducts = JSON.parse(fs.readFileSync(path.join(dataDir, 'storefront', 'products.json'), 'utf-8'));

// Target users for event generation
const TARGET_USERS = [31, 32];

let events = [];
let eventIdCounter = 1;

function generateEventId() {
  return `evt_${Date.now()}_${eventIdCounter++}`;
}

// Number-based type mappings
const NOTIFICATION_TYPES = {
  TASK_SUBMITTED: 1,
  TASK_APPROVED: 2,
  TASK_REJECTED: 3,
  TASK_ASSIGNED: 6,
  PROJECT_CREATED: 20,
  PROJECT_STARTED: 21,
  PROJECT_PAUSE_REQUESTED: 22,
  PROJECT_PAUSE_ACCEPTED: 23,
  INVOICE_SENT: 40,
  INVOICE_PAID: 41,
  GIG_APPLICATION_RECEIVED: 60,
  PRODUCT_PURCHASED: 100
};

const ENTITY_TYPES = {
  TASK: 1,
  PROJECT: 2,
  GIG: 3,
  INVOICE: 5,
  PRODUCT: 6
};

// Helper function to map event types to notification types
function getNotificationTypeNumber(eventType) {
  const mapping = {
    // Only meaningful events that users should be notified about
    'task_submitted': NOTIFICATION_TYPES.TASK_SUBMITTED,
    'task_approved': NOTIFICATION_TYPES.TASK_APPROVED,
    'task_rejected': NOTIFICATION_TYPES.TASK_REJECTED,
    'project_pause_requested': NOTIFICATION_TYPES.PROJECT_PAUSE_REQUESTED,
    'project_pause_accepted': NOTIFICATION_TYPES.PROJECT_PAUSE_ACCEPTED,
    'invoice_sent': NOTIFICATION_TYPES.INVOICE_SENT,
    'invoice_paid': NOTIFICATION_TYPES.INVOICE_PAID,
    'gig_applied': NOTIFICATION_TYPES.GIG_APPLICATION_RECEIVED,
    'gig_request_sent': NOTIFICATION_TYPES.GIG_REQUEST_SENT, // When commissioner sends targeted request
    'product_purchased': NOTIFICATION_TYPES.PRODUCT_PURCHASED
  };
  return mapping[eventType] || 0;
}

// Helper function to get entity type number
function getEntityTypeNumber(entityType) {
  const mapping = {
    'task': ENTITY_TYPES.TASK,
    'project': ENTITY_TYPES.PROJECT,
    'gig': ENTITY_TYPES.GIG,
    'invoice': ENTITY_TYPES.INVOICE,
    'product': ENTITY_TYPES.PRODUCT
  };
  return mapping[entityType] || 0;
}

function createEvent(type, actorId, targetId, entityType, entityId, metadata, context, timestamp) {
  return {
    id: generateEventId(),
    timestamp: timestamp || new Date().toISOString(),
    type,
    notificationType: getNotificationTypeNumber(type),
    actorId,
    targetId: targetId || undefined,
    entityType: getEntityTypeNumber(entityType),
    entityId,
    metadata: metadata || {},
    context: context || {}
  };
}

// 1. Generate project-related events
console.log('📋 Generating project events...');
const userProjects = projects.filter(p => 
  TARGET_USERS.includes(p.commissionerId) || TARGET_USERS.includes(p.freelancerId)
);

userProjects.forEach(project => {
  // Skip generic project creation and start events - these don't provide value to users
  // Only generate meaningful project events like pause requests

  // Project pause events for paused projects
  if (project.status === 'Paused') {
    const projectStartDate = new Date('2025-06-01');
    const pauseDate = new Date(projectStartDate.getTime() + 8 * 24 * 60 * 60 * 1000); // 8 days after project start
    
    events.push(createEvent(
      'project_pause_requested',
      project.freelancerId,
      project.commissionerId,
      'project',
      project.projectId,
      {
        projectTitle: project.title,
        pauseReason: 'Need to address some technical challenges before proceeding'
      },
      {
        projectId: project.projectId
      },
      pauseDate.toISOString()
    ));

    const pauseAcceptedDate = new Date(pauseDate.getTime() + 2 * 60 * 60 * 1000);
    events.push(createEvent(
      'project_pause_accepted',
      project.commissionerId,
      project.freelancerId,
      'project',
      project.projectId,
      {
        projectTitle: project.title
      },
      {
        projectId: project.projectId
      },
      pauseAcceptedDate.toISOString()
    ));
  }
});

// 2. Generate task-related events
console.log('📝 Generating task events...');
const userProjectTasks = projectTasks.filter(pt => 
  userProjects.some(p => p.projectId === pt.projectId)
);

userProjectTasks.forEach(projectTask => {
  const project = userProjects.find(p => p.projectId === projectTask.projectId);
  if (!project) return;

  projectTask.tasks.forEach((task, index) => {
    const taskCreatedDate = new Date('2025-06-02');
    taskCreatedDate.setDate(taskCreatedDate.getDate() + index);

    // Skip generic task creation events - these don't provide value to users
    // Only generate meaningful task events like submissions, approvals, rejections

    // Task submitted (for submitted/approved/rejected tasks)
    if (['Submitted', 'Approved', 'Rejected', 'In review'].includes(task.status)) {
      const submittedDate = new Date(taskCreatedDate.getTime() + 2 * 24 * 60 * 60 * 1000);
      
      events.push(createEvent(
        'task_submitted',
        project.freelancerId,
        project.commissionerId,
        'task',
        task.id,
        {
          taskTitle: task.title,
          projectTitle: projectTask.title,
          link: task.link,
          version: task.version
        },
        {
          projectId: projectTask.projectId,
          taskId: task.id
        },
        submittedDate.toISOString()
      ));

      // Task approved/rejected
      if (task.status === 'Approved') {
        const approvedDate = new Date(submittedDate.getTime() + 24 * 60 * 60 * 1000);
        events.push(createEvent(
          'task_approved',
          project.commissionerId,
          project.freelancerId,
          'task',
          task.id,
          {
            taskTitle: task.title,
            projectTitle: projectTask.title
          },
          {
            projectId: projectTask.projectId,
            taskId: task.id
          },
          approvedDate.toISOString()
        ));
      } else if (task.status === 'Rejected') {
        const rejectedDate = new Date(submittedDate.getTime() + 24 * 60 * 60 * 1000);
        events.push(createEvent(
          'task_rejected',
          project.commissionerId,
          project.freelancerId,
          'task',
          task.id,
          {
            taskTitle: task.title,
            projectTitle: projectTask.title,
            feedback: 'Please revise the design to better align with brand guidelines'
          },
          {
            projectId: projectTask.projectId,
            taskId: task.id
          },
          rejectedDate.toISOString()
        ));
      }
    }
  });
});

// 3. Generate gig-related events
console.log('💼 Generating gig events...');
const userGigs = gigs.filter(g => TARGET_USERS.includes(g.commissionerId));

userGigs.forEach(gig => {
  const gigPostedDate = new Date('2025-06-15');
  
  // Skip gig posting events - these are visible in explore-gigs page, not notifications
  // Only generate gig request events when commissioners send targeted requests to specific freelancers

  // Gig applications
  const gigApps = gigApplications.filter(app => app.gigId === gig.id);
  gigApps.forEach((app, index) => {
    const applicationDate = new Date(gigPostedDate.getTime() + (index + 1) * 24 * 60 * 60 * 1000);
    
    events.push(createEvent(
      'gig_applied',
      app.freelancerId,
      gig.commissionerId,
      'gig',
      gig.id,
      {
        gigTitle: gig.title,
        applicationMessage: app.coverLetter || 'Application submitted',
        proposedRate: app.proposedRate
      },
      {
        gigId: gig.id,
        applicationId: app.id
      },
      applicationDate.toISOString()
    ));
  });
});

// 4. Skip message events - they clutter notifications and should be handled separately
console.log('💬 Skipping message events (handled separately in messages system)...');

// 5. Generate storefront events
console.log('🛒 Generating storefront events...');
const userPurchases = storefrontPurchases.filter(purchase => 
  TARGET_USERS.includes(purchase.userId)
);

userPurchases.forEach(purchase => {
  const product = storefrontProducts.find(p => p.id === purchase.productId);
  if (!product) return;

  const productOwner = users.find(u => u.id === product.createdBy);
  if (!productOwner) return;

  events.push(createEvent(
    'product_purchased',
    purchase.userId,
    product.createdBy,
    'product',
    purchase.productId,
    {
      productTitle: product.title,
      amount: purchase.amount,
      category: product.category
    },
    {
      productId: purchase.productId,
      purchaseId: purchase.id
    },
    new Date(purchase.purchaseDate).toISOString()
  ));
});

// 6. Generate invoice events
console.log('💰 Generating invoice events...');
// Sample invoice events based on projects
userProjects.forEach(project => {
  if (project.status === 'Ongoing' || project.status === 'Completed') {
    const invoiceDate = new Date('2025-07-10');
    
    // Invoice sent
    events.push(createEvent(
      'invoice_sent',
      project.freelancerId,
      project.commissionerId,
      'invoice',
      `INV-${project.projectId}-001`,
      {
        invoiceNumber: `MGL${project.projectId}001`,
        projectTitle: project.title,
        amount: 2500,
        description: 'Milestone 1 completion'
      },
      {
        projectId: project.projectId,
        invoiceId: `INV-${project.projectId}-001`
      },
      invoiceDate.toISOString()
    ));

    // Invoice paid - use actual task title from the project
    const paidDate = new Date(invoiceDate.getTime() + 3 * 24 * 60 * 60 * 1000);
    const projectTaskData = projectTasks.find(pt => pt.projectId === project.projectId);
    const firstTask = projectTaskData?.tasks?.[0];
    const taskTitle = firstTask?.title || 'Milestone 1 completion';

    events.push(createEvent(
      'invoice_paid',
      project.commissionerId,
      project.freelancerId,
      'invoice',
      `INV-${project.projectId}-001`,
      {
        invoiceNumber: `MGL${project.projectId}001`,
        projectTitle: project.title,
        taskTitle: taskTitle,
        amount: 2500,
        description: taskTitle
      },
      {
        projectId: project.projectId,
        invoiceId: `INV-${project.projectId}-001`
      },
      paidDate.toISOString()
    ));
  }
});

// Sort events by timestamp
events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

// Save events to notifications log
const notificationsLogPath = path.join(dataDir, 'notifications', 'notifications-log.json');
fs.writeFileSync(notificationsLogPath, JSON.stringify(events, null, 2));

console.log(`\n✅ Generated ${events.length} historical events`);
console.log(`📁 Saved to: ${notificationsLogPath}`);

// Generate summary
const eventsByType = events.reduce((acc, event) => {
  acc[event.type] = (acc[event.type] || 0) + 1;
  return acc;
}, {});

console.log('\n📊 Event Summary:');
Object.entries(eventsByType).forEach(([type, count]) => {
  console.log(`   ${type}: ${count}`);
});

console.log('\n🎯 Events for target users:');
TARGET_USERS.forEach(userId => {
  const userEvents = events.filter(e => e.actorId === userId || e.targetId === userId);
  const userName = users.find(u => u.id === userId)?.name || `User ${userId}`;
  console.log(`   ${userName} (${userId}): ${userEvents.length} events`);
});

console.log('\n✨ Historical event generation complete!');
