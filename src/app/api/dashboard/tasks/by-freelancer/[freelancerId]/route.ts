import { NextResponse } from 'next/server';
import { readAllTasks, convertHierarchicalToLegacy } from '../../../../../../lib/project-tasks/hierarchical-storage';
import { getAllUsers, getAllOrganizations } from '@/lib/storage/unified-storage-service';

interface User {
  id: number;
  name: string;
  email: string;
  type: 'freelancer' | 'commissioner';
  organizationId?: number;
}

interface Organization {
  id: number;
  name: string;
  email: string;
  logo: string;
}

interface Task {
  id: number;
  title: string;
  status: string;
  completed: boolean;
  feedbackCount: number;
  rejected: boolean;
  pushedBack: boolean;
  dueDate: string;
  link: string;
}

interface Project {
  projectId: number;
  title: string;
  typeTags: string[];
  organizationId: number;
  tasks: Task[];
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ freelancerId: string }> }
) {
  const { freelancerId: freelancerIdParam } = await params;
  const freelancerId = Number(freelancerIdParam);

  try {
    const [users, orgs] = await Promise.all([
      getAllUsers(),
      getAllOrganizations(),
    ]);

    // Read project tasks from hierarchical storage
    const hierarchicalTasks = await readAllTasks();
    const projects: Project[] = convertHierarchicalToLegacy(hierarchicalTasks);

    const freelancer = users.find(
      (u) => u.id === freelancerId && u.type === 'freelancer'
    );

    if (!freelancer) {
      return NextResponse.json({ error: 'Freelancer not found' }, { status: 404 });
    }

    // Map orgId to commissioner for quick lookup
    const commissionerByOrgId = new Map<number, User>();
    users.forEach((u) => {
      if (u.type === 'commissioner' && u.organizationId) {
        commissionerByOrgId.set(u.organizationId, u);
      }
    });

    // Filter valid projects tied to known organizations with commissioner users
    const validProjects = projects.filter((project) => {
      const commissioner = commissionerByOrgId.get(project.organizationId);
      return Boolean(commissioner);
    });

    // Map tasks with org and project data
    const results = validProjects.flatMap((project) => {
      const org = orgs.find((o) => o.id === project.organizationId);
      if (!org) return [];

      return project.tasks.map((task) => ({
        taskId: task.id,
        taskTitle: task.title,
        status: task.status,
        completed: task.completed,
        feedbackCount: task.feedbackCount,
        rejected: task.rejected,
        pushedBack: task.pushedBack,
        dueDate: task.dueDate,
        link: task.link,
        projectId: project.projectId,
        projectTitle: project.title,
        typeTags: project.typeTags,
        organizationId: org.id,
        organizationLogo: org.logo,
        organizationName: org.name,
      }));
    });

    return NextResponse.json({ tasks: results });
  } catch (err) {
    console.error('[GET /tasks/by-freelancer]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}