import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { eventLogger } from '../../../../../lib/events/event-logger';
import { readProposal, updateProposal } from '../../../../../lib/proposals/hierarchical-storage';

const projectsFilePath = path.join(process.cwd(), 'data', 'projects.json');
const invoicesFilePath = path.join(process.cwd(), 'data', 'invoices.json');

export async function POST(
  request: Request,
  { params }: { params: Promise<{ proposalId: string }> }
) {
  try {
    const { proposalId } = await params;

    // Read proposal using hierarchical storage
    const proposal = await readProposal(proposalId);
    if (!proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    // Update proposal status to accepted
    await updateProposal(proposalId, {
      status: 'accepted',
      acceptedAt: new Date().toISOString(),
    });

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
    fs.writeFileSync(projectsFilePath, JSON.stringify(projects, null, 2));

    // Log proposal acceptance event
    try {
      await eventLogger.logEvent({
        id: `proposal_accepted_${proposalId}_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'proposal_accepted',
        notificationType: 81, // NOTIFICATION_TYPES.PROPOSAL_ACCEPTED
        actorId: proposal.commissionerId,
        targetId: proposal.freelancerId,
        entityType: 7, // ENTITY_TYPES.PROPOSAL
        entityId: proposalId,
        metadata: {
          proposalTitle: proposal.title || 'Untitled Proposal',
          budget: proposal.totalBid || 'Not specified',
          executionMethod: proposal.executionMethod || 'Not specified',
          projectCreated: true,
          newProjectId: newProject.id,
          upfrontAmount: proposal.upfrontAmount || 0
        },
        context: {
          proposalId: proposalId,
          projectId: newProject.id
        }
      });

      // Log project creation event
      await eventLogger.logEvent({
        id: `project_created_${newProject.id}_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'project_created',
        notificationType: 20, // NOTIFICATION_TYPES.PROJECT_CREATED
        actorId: proposal.commissionerId,
        targetId: proposal.freelancerId,
        entityType: 2, // ENTITY_TYPES.PROJECT
        entityId: newProject.id,
        metadata: {
          projectTitle: newProject.title,
          budget: newProject.totalBudget,
          executionMethod: newProject.executionMethod,
          createdFromProposal: proposalId
        },
        context: {
          projectId: newProject.id,
          proposalId: proposalId
        }
      });

    } catch (eventError) {
      console.error('Failed to log proposal acceptance events:', eventError);
      // Don't fail the main operation if event logging fails
    }

    // Get the updated proposal
    const updatedProposal = await readProposal(proposalId);

    return NextResponse.json({
      message: 'Proposal accepted successfully',
      projectId: newProject.id,
      proposal: updatedProposal,
      eventLogged: true
    });
  } catch (error) {
    console.error('Error accepting proposal:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
