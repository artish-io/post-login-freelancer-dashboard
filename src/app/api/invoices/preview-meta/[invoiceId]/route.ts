import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

const invoicesPath = path.join(process.cwd(), 'data', 'invoices.json');
const usersPath = path.join(process.cwd(), 'data', 'users.json');
const projectsPath = path.join(process.cwd(), 'data', 'projects.json');

export async function GET(
  _request: Request,
  context: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const { invoiceId } = await context.params;

    const [invoiceData, userData, projectData] = await Promise.all([
      readFile(invoicesPath, 'utf-8'),
      readFile(usersPath, 'utf-8'),
      readFile(projectsPath, 'utf-8')
    ]);

    const invoices = JSON.parse(invoiceData);
    const users = JSON.parse(userData);
    const projects = JSON.parse(projectData);

    const invoice = invoices.find((inv: any) => String(inv.id) === invoiceId);
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const project = projects.find((p: any) => p.projectId === invoice.projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const freelancer = users.find((u: any) => u.id === project.freelancerId);

    return NextResponse.json({
      invoiceId: invoice.id,
      projectTitle: project.title,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      totalAmount: invoice.totalAmount,
      status: invoice.status,
      freelancer: freelancer
        ? {
            name: freelancer.name,
            email: freelancer.email,
            address: freelancer.address,
            title: freelancer.title,
          }
        : null,
      client: project.manager
        ? {
            name: project.manager.name,
            email: project.manager.email,
            address: project.manager.address || '—',
            title: project.manager.title,
          }
        : null,
    });
  } catch (error) {
    console.error('Error loading invoice preview meta:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}