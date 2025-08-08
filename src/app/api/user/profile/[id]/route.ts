import { NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';
import { getCommissionedTotalSync } from '@/lib/utils/getCommissionedTotal';
import { readAllProjects } from '@/lib/projects-utils';
import { readAllTasks, convertHierarchicalToLegacy } from '@/lib/project-tasks/hierarchical-storage';
import { readAllGigs } from '@/lib/gigs/hierarchical-storage';
import { getAllInvoices } from '@/lib/invoice-storage';
import { getAllUsers } from '@/lib/storage/unified-storage-service';

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    // ---------- File paths ----------
    const root = process.cwd();
    const freelancersPath = path.join(root, 'data', 'freelancers.json');
    const usersPath = path.join(root, 'data', 'users.json');
    const organizationsPath = path.join(root, 'data', 'organizations.json');
    const workSamplesPath = path.join(
      root,
      'data',
      'profiles',
      'work-samples.json'
    );
    const gigCategoriesPath = path.join(root, 'data', 'gigs', 'gig-categories.json');
    const gigToolsPath = path.join(root, 'data', 'gigs', 'gig-tools.json');

    // ---------- Read all files in parallel ----------
    const [freelancersRaw, users, organizationsRaw, gigs, samplesRaw, categoriesRaw, toolsRaw, invoices, projects, hierarchicalTasks] = await Promise.all([
      readFile(freelancersPath, 'utf-8'),
      getAllUsers(), // Use hierarchical storage for users
      readFile(organizationsPath, 'utf-8'),
      readAllGigs(), // Use hierarchical storage for gigs
      readFile(workSamplesPath, 'utf-8'),
      readFile(gigCategoriesPath, 'utf-8'),
      readFile(gigToolsPath, 'utf-8'),
      getAllInvoices(), // Use hierarchical storage for invoices
      readAllProjects(), // Use hierarchical storage for projects
      readAllTasks() // Use hierarchical storage for project tasks
    ]);

    const freelancers = JSON.parse(freelancersRaw);
    // users is already parsed from hierarchical storage
    const organizations = JSON.parse(organizationsRaw);
    // gigs, invoices, and projects are already parsed from hierarchical storage
    const workSamples = JSON.parse(samplesRaw);
    const gigTools = JSON.parse(toolsRaw);
    // Convert hierarchical tasks to legacy format for compatibility
    const projectTasks = convertHierarchicalToLegacy(hierarchicalTasks);

    // ---------- Look‑ups ----------
    const user = users.find((u: any) => String(u.id) === id);
    const isOnline = user?.isOnline ?? false; // persist online status per user
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // ---------- Build response based on user type ----------
    if (user.type === 'freelancer') {
      const freelancer = freelancers.find((f: any) => f.userId === user.id);
      if (!freelancer) {
        return NextResponse.json(
          { error: 'Freelancer profile not found' },
          { status: 404 }
        );
      }

      const userSamples = workSamples.filter(
        (ws: any) => String(ws.userId) === id
      );

      // Map skills and tools using the new structure
      const allTools = gigTools.flatMap((category: any) => category.tools);

      // Get skills from skillCategories (subcategories from gig-categories.json)
      const mappedSkills = freelancer.skillCategories || freelancer.skills || [];

      // Get tools with icons from gig-tools.json
      const mappedTools = (freelancer.tools || []).map((toolName: string) => {
        const tool = allTools.find((t: any) => t.name.toLowerCase() === toolName.toLowerCase());
        return tool || { name: toolName, icon: null };
      });

      return NextResponse.json({
        id: user.id,
        name: user.name,
        title: user.title,
        avatar: user.avatar,
        isOnline,
        type: user.type,
        location: freelancer.location,
        rate: freelancer.rate,
        availability: freelancer.availability ?? 'Unavailable',
        hourlyRate: {
          min: freelancer.minRate,
          max: freelancer.maxRate
        },
        rating: freelancer.rating ?? 0,
        about: freelancer.about ?? '',
        skills: mappedSkills,
        tools: mappedTools,
        socialLinks: freelancer.socialLinks ?? [],
        workSamples: userSamples,
        responsibilities: freelancer.responsibilities ?? []
      });
    } else if (user.type === 'commissioner') {
      // Find organization for this commissioner
      const organization = organizations.find((org: any) => org.contactPersonId === user.id);

      // Find gigs posted by this organization
      const organizationGigs = organization
        ? gigs.filter((gig: any) => gig.organizationId === organization.id)
        : [];

      // Calculate total budget from hierarchical invoice structure
      const totalBudget = organization ? getCommissionedTotalSync(organization.id) : 0;

      // Calculate quarterly change (mock data for now - in real app would compare with previous quarter)
      const previousQuarterTotal = totalBudget * 0.85; // Mock 15% growth
      const quarterlyChange = totalBudget > 0 ?
        ((totalBudget - previousQuarterTotal) / previousQuarterTotal * 100) : 0;

      // Check if commissioner has active unfilled gigs
      const activeUnfilledGigs = organizationGigs.filter((gig: any) =>
        gig.status === 'active' && !gig.freelancerId
      );
      const isActivelyCommissioning = activeUnfilledGigs.length > 0;

      // Format gig listings for display
      const gigListings = organizationGigs.slice(0, 8).map((gig: any) => ({
        id: gig.id,
        title: gig.title,
        category: gig.category,
        budget: gig.budget || '$5,000 - $10,000',
        deadline: new Date(gig.deadline || Date.now()).toLocaleDateString(),
        applicants: Math.floor(Math.random() * 20) + 1, // Mock data
        status: gig.status || 'active'
      }));

      return NextResponse.json({
        id: user.id,
        name: user.name,
        title: user.title,
        avatar: user.avatar,
        isOnline,
        type: user.type,
        location: user.address, // Use address from user data as location
        rating: user.rating,
        about: user.bio || '',
        organization: organization ? {
          id: organization.id,
          name: organization.name,
          logo: organization.logo,
          address: organization.address
        } : null,
        projectsCommissioned: organizationGigs.length,
        totalBudget,
        quarterlyChange,
        isActivelyCommissioning,
        gigListings,
        responsibilities: user.responsibilities || [],
        socialLinks: user.socialLinks || []
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid user type' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to load user profile' },
      { status: 500 }
    );
  }
}