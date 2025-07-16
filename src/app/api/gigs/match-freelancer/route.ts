import { NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';

const GIGS_PATH = path.join(process.cwd(), 'data/gigs/gigs.json');
const APPLICATIONS_PATH = path.join(process.cwd(), 'data/gigs/gig-applications.json');
const PROJECTS_PATH = path.join(process.cwd(), 'data/projects.json');
const PROJECT_TASKS_PATH = path.join(process.cwd(), 'data/project-tasks.json');
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
    const [gigsData, applicationsData, projectsData, projectTasksData, organizationsData, usersData] = await Promise.all([
      readFile(GIGS_PATH, 'utf-8').then(data => JSON.parse(data)),
      readFile(APPLICATIONS_PATH, 'utf-8').then(data => JSON.parse(data)),
      readFile(PROJECTS_PATH, 'utf-8').then(data => JSON.parse(data)),
      readFile(PROJECT_TASKS_PATH, 'utf-8').then(data => JSON.parse(data)),
      readFile(ORGANIZATIONS_PATH, 'utf-8').then(data => JSON.parse(data)),
      readFile(USERS_PATH, 'utf-8').then(data => JSON.parse(data))
    ]);

    // Find the gig and application
    const gig = gigsData.find((g: any) => g.id === gigId);
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
    const updatedGigs = gigsData.map((g: any) => 
      g.id === gigId ? { ...g, status: 'Unavailable' } : g
    );

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

    // Update all data files
    const updatedProjects = [...projectsData, newProject];
    const updatedProjectTasks = [...projectTasksData, newProjectTasks];

    await Promise.all([
      writeFile(GIGS_PATH, JSON.stringify(updatedGigs, null, 2)),
      writeFile(APPLICATIONS_PATH, JSON.stringify(updatedApplications, null, 2)),
      writeFile(PROJECTS_PATH, JSON.stringify(updatedProjects, null, 2)),
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
