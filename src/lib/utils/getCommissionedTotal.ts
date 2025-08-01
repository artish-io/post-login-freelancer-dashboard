import fs from 'fs';
import path from 'path';

interface Project {
  projectId: number;
  organizationId: number;
  [key: string]: any;
}

interface Invoice {
  projectId: number;
  totalAmount: number;
  status: string;
  [key: string]: any;
}

/**
 * Recursively scans the data/projects directory to find all projects
 */
async function getAllProjects(): Promise<Project[]> {
  const projects: Project[] = [];
  const projectsDir = path.join(process.cwd(), 'data', 'projects');

  if (!fs.existsSync(projectsDir)) {
    return projects;
  }

  function scanDirectory(dirPath: string) {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        // Check if this directory contains a project.json file
        const projectJsonPath = path.join(itemPath, 'project.json');
        if (fs.existsSync(projectJsonPath)) {
          try {
            const projectData = JSON.parse(fs.readFileSync(projectJsonPath, 'utf-8'));
            projects.push(projectData);
          } catch (error) {
            console.error(`Error reading project file ${projectJsonPath}:`, error);
          }
        } else {
          // Recursively scan subdirectories
          scanDirectory(itemPath);
        }
      }
    }
  }

  scanDirectory(projectsDir);
  return projects;
}

/**
 * Recursively scans the data/invoices directory to find all invoices
 */
async function getAllInvoices(): Promise<Invoice[]> {
  const invoices: Invoice[] = [];
  const invoicesDir = path.join(process.cwd(), 'data', 'invoices');

  if (!fs.existsSync(invoicesDir)) {
    return invoices;
  }

  function scanDirectory(dirPath: string) {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        // Check if this directory contains an invoice.json file
        const invoiceJsonPath = path.join(itemPath, 'invoice.json');
        if (fs.existsSync(invoiceJsonPath)) {
          try {
            const invoiceData = JSON.parse(fs.readFileSync(invoiceJsonPath, 'utf-8'));
            invoices.push(invoiceData);
          } catch (error) {
            console.error(`Error reading invoice file ${invoiceJsonPath}:`, error);
          }
        } else {
          // Recursively scan subdirectories
          scanDirectory(itemPath);
        }
      }
    }
  }

  scanDirectory(invoicesDir);
  return invoices;
}

/**
 * Calculates the total commissioned value for a given organization
 * @param organizationId - The organization ID to calculate total for
 * @returns Promise<number> - Total USD value commissioned
 */
export async function getCommissionedTotal(organizationId: number): Promise<number> {
  try {
    // Get all projects for this organization
    const allProjects = await getAllProjects();
    const organizationProjects = allProjects.filter(
      project => project.organizationId === organizationId
    );

    if (organizationProjects.length === 0) {
      return 0;
    }

    // Get all invoices
    const allInvoices = await getAllInvoices();
    
    // Filter invoices for projects belonging to this organization
    const organizationProjectIds = organizationProjects.map(p => p.projectId);
    const organizationInvoices = allInvoices.filter(
      invoice => organizationProjectIds.includes(invoice.projectId)
    );

    // Sum up the total amounts from all invoices (regardless of status)
    // This represents the total value commissioned, not necessarily paid
    const total = organizationInvoices.reduce((sum, invoice) => {
      return sum + (invoice.totalAmount || 0);
    }, 0);

    return total;
  } catch (error) {
    console.error('Error calculating commissioned total:', error);
    return 0;
  }
}

/**
 * Calculates the total commissioned value for a given organization (synchronous version)
 * @param organizationId - The organization ID to calculate total for
 * @returns number - Total USD value commissioned
 */
export function getCommissionedTotalSync(organizationId: number): number {
  try {
    // Get all projects for this organization
    const projectsDir = path.join(process.cwd(), 'data', 'projects');
    const projects: Project[] = [];

    if (!fs.existsSync(projectsDir)) {
      return 0;
    }

    function scanProjectsDirectory(dirPath: string) {
      const items = fs.readdirSync(dirPath);
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
          const projectJsonPath = path.join(itemPath, 'project.json');
          if (fs.existsSync(projectJsonPath)) {
            try {
              const projectData = JSON.parse(fs.readFileSync(projectJsonPath, 'utf-8'));
              projects.push(projectData);
            } catch (error) {
              console.error(`Error reading project file ${projectJsonPath}:`, error);
            }
          } else {
            scanProjectsDirectory(itemPath);
          }
        }
      }
    }

    scanProjectsDirectory(projectsDir);
    
    const organizationProjects = projects.filter(
      project => project.organizationId === organizationId
    );

    if (organizationProjects.length === 0) {
      return 0;
    }

    // Get all invoices
    const invoicesDir = path.join(process.cwd(), 'data', 'invoices');
    const invoices: Invoice[] = [];

    if (!fs.existsSync(invoicesDir)) {
      return 0;
    }

    function scanInvoicesDirectory(dirPath: string) {
      const items = fs.readdirSync(dirPath);
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
          const invoiceJsonPath = path.join(itemPath, 'invoice.json');
          if (fs.existsSync(invoiceJsonPath)) {
            try {
              const invoiceData = JSON.parse(fs.readFileSync(invoiceJsonPath, 'utf-8'));
              invoices.push(invoiceData);
            } catch (error) {
              console.error(`Error reading invoice file ${invoiceJsonPath}:`, error);
            }
          } else {
            scanInvoicesDirectory(itemPath);
          }
        }
      }
    }

    scanInvoicesDirectory(invoicesDir);
    
    // Filter invoices for projects belonging to this organization
    const organizationProjectIds = organizationProjects.map(p => p.projectId);
    const organizationInvoices = invoices.filter(
      invoice => organizationProjectIds.includes(invoice.projectId)
    );

    // Sum up the total amounts from all invoices
    const total = organizationInvoices.reduce((sum, invoice) => {
      return sum + (invoice.totalAmount || 0);
    }, 0);

    return total;
  } catch (error) {
    console.error('Error calculating commissioned total:', error);
    return 0;
  }
}
