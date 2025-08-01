import { NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { readAllTasks, convertHierarchicalToLegacy } from '@/lib/project-tasks/hierarchical-storage';
import { readAllProjects, saveProject } from '@/lib/projects-utils';
import { readGig, updateGig } from '@/lib/gigs/hierarchical-storage';

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
      freelancerId: freelancerId,
      status: 'Active',
      dueDate: new Date(Date.now() + gig.deliveryTimeWeeks * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      totalTasks: 1 // Start with 1 initial task
    };

    // Create initial project task
    const newProjectTasks = {
      projectId: newProjectId,
      title: gig.title,
      organizationId: gig.organizationId,
      typeTags: gig.tags,
      tasks: [
        {
          id: Math.max(...projectTasksData.flatMap((p: any) => p.tasks?.map((t: any) => t.id) || []), 0) + 1,
          title: `Initial setup for ${gig.title}`,
          status: 'Upcoming',
          completed: false,
          order: 1,
          link: '',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          rejected: false,
          feedbackCount: 0,
          pushedBack: false,
          version: 1,
          description: `Begin work on ${gig.title} project`
        }
      ]
    };

    // Save new project to hierarchical structure
    await saveProject(newProject);

    // Update other data files
    const updatedProjectTasks = [...projectTasksData, newProjectTasks];

    await Promise.all([
      writeFile(APPLICATIONS_PATH, JSON.stringify(updatedApplications, null, 2)),
      writeFile(PROJECT_TASKS_PATH, JSON.stringify(updatedProjectTasks, null, 2))
    ]);

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
