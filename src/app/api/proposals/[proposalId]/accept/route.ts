import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const proposalsFilePath = path.join(process.cwd(), 'data', 'proposals', 'proposals.json');
const projectsFilePath = path.join(process.cwd(), 'data', 'projects.json');
const invoicesFilePath = path.join(process.cwd(), 'data', 'invoices.json');

export async function POST(
  request: Request,
  { params }: { params: Promise<{ proposalId: string }> }
) {
  try {
    const { proposalId } = await params;

    // Read proposals data
    const proposalsData = fs.readFileSync(proposalsFilePath, 'utf-8');
    const proposals = JSON.parse(proposalsData);

    // Find the proposal
    const proposalIndex = proposals.findIndex((p: any) => p.id === proposalId);
    if (proposalIndex === -1) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    const proposal = proposals[proposalIndex];

    // Update proposal status to accepted
    proposals[proposalIndex] = {
      ...proposal,
      status: 'accepted',
      acceptedAt: new Date().toISOString(),
    };

    // Create a new project from the accepted proposal
    const projectsData = fs.readFileSync(projectsFilePath, 'utf-8');
    const projects = JSON.parse(projectsData);

    const newProject = {
      id: proposal.projectId || Date.now(),
      title: proposal.title,
      description: proposal.summary,
      freelancerId: proposal.freelancerId,
      commissionerId: proposal.commissionerId,
      status: 'ongoing',
      executionMethod: proposal.executionMethod,
      totalBudget: proposal.totalBid,
      upfrontAmount: proposal.upfrontAmount,
      upfrontPercentage: proposal.upfrontPercentage,
      milestones: proposal.milestones || [],
      startDate: proposal.customStartDate || new Date().toISOString(),
      endDate: proposal.endDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    projects.push(newProject);

    // If completion-based payment, create upfront invoice
    if (proposal.executionMethod === 'completion' && proposal.upfrontAmount > 0) {
      const invoicesData = fs.readFileSync(invoicesFilePath, 'utf-8');
      const invoices = JSON.parse(invoicesData);

      const upfrontInvoice = {
        invoiceNumber: `UPF${Date.now()}`,
        freelancerId: proposal.freelancerId,
        projectId: newProject.id,
        commissionerId: proposal.commissionerId,
        projectTitle: proposal.title,
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: new Date().toISOString().split('T')[0], // Due immediately
        totalAmount: proposal.upfrontAmount,
        status: 'paid', // Auto-paid on acceptance
        type: 'upfront',
        milestones: [
          {
            description: 'Upfront payment (12% of total project)',
            rate: proposal.upfrontAmount,
          },
        ],
      };

      invoices.push(upfrontInvoice);
      fs.writeFileSync(invoicesFilePath, JSON.stringify(invoices, null, 2));
    }

    // Save updated data
    fs.writeFileSync(proposalsFilePath, JSON.stringify(proposals, null, 2));
    fs.writeFileSync(projectsFilePath, JSON.stringify(projects, null, 2));

    return NextResponse.json({
      message: 'Proposal accepted successfully',
      projectId: newProject.id,
      proposal: proposals[proposalIndex],
    });
  } catch (error) {
    console.error('Error accepting proposal:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
