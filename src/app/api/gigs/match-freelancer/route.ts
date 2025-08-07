import { NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { readAllTasks, convertHierarchicalToLegacy, writeTask, convertLegacyToHierarchical } from '@/lib/project-tasks/hierarchical-storage';
import { readAllProjects, saveProject, deleteProject } from '@/lib/projects-utils';
import { readGig, updateGig } from '@/lib/gigs/hierarchical-storage';
import { eventLogger, NOTIFICATION_TYPES, ENTITY_TYPES } from '@/lib/events/event-logger';

// Using hierarchical storage for gigs and project tasks
const APPLICATIONS_PATH = path.join(process.cwd(), 'data/gigs/gig-applications.json');
const ORGANIZATIONS_PATH = path.join(process.cwd(), 'data/organizations.json');
const USERS_PATH = path.join(process.cwd(), 'data/users.json');

export async function POST(req: Request) {
  try {
    const { applicationId, gigId, freelancerId } = await req.json();

    if (!applicationId || !gigId || !freelancerId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Read all necessary data files
    const [applicationsData, organizationsData, usersData] = await Promise.all([
      readFile(APPLICATIONS_PATH, 'utf-8').then(data => JSON.parse(data)),
      readFile(ORGANIZATIONS_PATH, 'utf-8').then(data => JSON.parse(data)),
      readFile(USERS_PATH, 'utf-8').then(data => JSON.parse(data))
    ]);

    // Read projects from hierarchical structure
    const projectsData = await readAllProjects();

    // Read project tasks from hierarchical storage
    const hierarchicalTasks = await readAllTasks();
    const projectTasksData = convertHierarchicalToLegacy(hierarchicalTasks);

    // Find the gig and application
    const gig = await readGig(gigId);
    const application = applicationsData.find((a: any) => a.id === applicationId);

    if (!gig || !application) {
      return NextResponse.json(
        { error: 'Gig or application not found' },
        { status: 404 }
      );
    }

    // Validation guards
    if (!gig.title || !gig.description) {
      return NextResponse.json(
        { error: 'Gig missing required fields (title, description)' },
        { status: 400 }
      );
    }

    if (gig.status === 'Unavailable') {
      return NextResponse.json(
        { error: 'Gig is no longer available' },
        { status: 409 }
      );
    }

    // Find organization for the gig
    const organization = organizationsData.find((org: any) => org.id === gig.organizationId);
    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Find contact person (manager) for the organization
    const manager = usersData.find((user: any) => user.id === organization.contactPersonId);
    if (!manager) {
      return NextResponse.json(
        { error: 'Manager not found' },
        { status: 404 }
      );
    }

    // Update gig status to unavailable
    await updateGig(gigId, { status: 'Unavailable' });

    // Update application status to accepted
    const updatedApplications = applicationsData.map((a: any) => 
      a.id === applicationId ? { ...a, status: 'accepted' } : a
    );

    // Generate new project ID
    const maxProjectId = Math.max(...projectsData.map((p: any) => p.projectId), 0);
    const newProjectId = maxProjectId + 1;

    // Determine task count based on gig milestones
    const milestoneCount = gig.milestones && Array.isArray(gig.milestones) ? gig.milestones.length : 1;

    // Create new project
    const newProject = {
      projectId: newProjectId,
      title: gig.title,
      description: gig.description,
      organizationId: gig.organizationId,
      typeTags: gig.tags,
      manager: {
        name: manager.name,
        title: manager.title,
        avatar: manager.avatar,
        email: manager.email
      },
      commissionerId: organization.contactPersonId, // Add commissionerId for dashboard filtering
      freelancerId: freelancerId,
      status: 'ongoing',
      dueDate: gig.endDate || new Date(Date.now() + gig.deliveryTimeWeeks * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      totalTasks: milestoneCount,
      gigId: gigId, // Link to original gig
      createdAt: new Date().toISOString()
    };

    // Generate tasks from gig milestones or create default task
    let tasksToCreate = [];

    if (gig.milestones && Array.isArray(gig.milestones) && gig.milestones.length > 0) {
      // Create tasks from milestones
      const maxTaskId = Math.max(...projectTasksData.flatMap((p: any) => p.tasks?.map((t: any) => t.id) || []), 0);

      tasksToCreate = gig.milestones.map((milestone: any, index: number) => ({
        taskId: maxTaskId + index + 1,
        projectId: newProjectId,
        projectTitle: gig.title,
        organizationId: gig.organizationId,
        projectTypeTags: gig.tags,
        title: milestone.title,
        status: 'Ongoing',
        completed: false,
        order: index + 1,
        link: '',
        dueDate: milestone.endDate || new Date(Date.now() + (index + 1) * 7 * 24 * 60 * 60 * 1000).toISOString(),
        rejected: false,
        feedbackCount: 0,
        pushedBack: false,
        version: 1,
        description: milestone.description || `Work on ${milestone.title}`,
        createdDate: new Date().toISOString(),
        lastModified: new Date().toISOString()
      }));
    } else {
      // Create default task if no milestones
      const maxTaskId = Math.max(...projectTasksData.flatMap((p: any) => p.tasks?.map((t: any) => t.id) || []), 0);

      tasksToCreate = [{
        taskId: maxTaskId + 1,
        projectId: newProjectId,
        projectTitle: gig.title,
        organizationId: gig.organizationId,
        projectTypeTags: gig.tags,
        title: `Initial setup for ${gig.title}`,
        status: 'Ongoing',
        completed: false,
        order: 1,
        link: '',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        rejected: false,
        feedbackCount: 0,
        pushedBack: false,
        version: 1,
        description: `Begin work on ${gig.title} project`,
        createdDate: new Date().toISOString(),
        lastModified: new Date().toISOString()
      }];
    }

    // Save new project to hierarchical structure
    await saveProject(newProject);

    // Save tasks to hierarchical structure
    try {
      await Promise.all([
        writeFile(APPLICATIONS_PATH, JSON.stringify(updatedApplications, null, 2)),
        ...tasksToCreate.map(task => writeTask(task))
      ]);

      // Validate that tasks were created successfully
      if (tasksToCreate.length === 0) {
        throw new Error('No tasks were created for the project');
      }

      console.log(`✅ Successfully created ${tasksToCreate.length} tasks for project ${newProjectId}`);
    } catch (taskError) {
      console.error('Failed to create project tasks:', taskError);
      // Clean up the project if task creation failed
      try {
        await deleteProject(newProjectId);
      } catch (cleanupError) {
        console.error('Failed to clean up project after task creation failure:', cleanupError);
      }
      return NextResponse.json(
        { error: 'Failed to create project tasks' },
        { status: 500 }
      );
    }

    // Create project activation notification for freelancer
    try {
      // Validate notification context
      if (!newProjectId || !freelancerId || !organization.contactPersonId) {
        throw new Error('Missing required notification context');
      }

      await eventLogger.logEvent({
        id: `project_activated_${newProjectId}_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'project_activated',
        notificationType: NOTIFICATION_TYPES.PROJECT_ACTIVATED,
        actorId: organization.contactPersonId, // Commissioner who accepted
        targetId: freelancerId, // Freelancer who gets notified
        entityType: ENTITY_TYPES.PROJECT,
        entityId: newProjectId,
        metadata: {
          projectTitle: gig.title,
          gigTitle: gig.title,
          taskCount: newProject.totalTasks,
          dueDate: newProject.dueDate,
          commissionerName: manager.name,
          organizationName: organization.name
        },
        context: {
          projectId: newProjectId,
          gigId: gigId,
          applicationId: applicationId
        }
      });

      console.log(`✅ Successfully sent project activation notification for project ${newProjectId}`);
    } catch (eventError) {
      console.error('Failed to log project activation event:', eventError);
      // Don't fail the main operation if event logging fails
    }

    return NextResponse.json({
      success: true,
      projectId: newProjectId,
      message: 'Successfully matched with freelancer and created project'
    });

  } catch (error) {
    console.error('Error matching with freelancer:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
