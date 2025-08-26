#!/usr/bin/env node

/**
 * Fix Notification Enrichment Script
 *
 * This script fixes notifications that have missing or incorrect freelancer names
 * and invoice amounts by cross-referencing with project and invoice data.
 */

const fs = require('fs').promises;
const path = require('path');

// Helper function to read JSON files
async function readJsonFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.warn(`Failed to read ${filePath}:`, error.message);
    return null;
  }
}

// Helper function to write JSON files
async function writeJsonFile(filePath, data) {
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`Failed to write ${filePath}:`, error.message);
    return false;
  }
}

// Get freelancer name from user data
async function getFreelancerName(freelancerId) {
  try {
    // Read users index to find the user path
    const usersIndex = await readJsonFile('data/users-index.json');
    if (!usersIndex || !usersIndex[freelancerId]) {
      console.warn(`User ${freelancerId} not found in users index`);
      return null;
    }

    const userPath = usersIndex[freelancerId].path;
    const profilePath = `data/users/${userPath}/profile.json`;
    const profile = await readJsonFile(profilePath);

    return profile?.name || null;
  } catch (error) {
    console.error(`Error getting freelancer name for ID ${freelancerId}:`, error);
    return null;
  }
}

// Get project data
async function getProjectData(projectId) {
  try {
    // First try the projects index
    const projectsIndex = await readJsonFile('data/projects/metadata/projects-index.json');
    if (projectsIndex && projectsIndex[projectId]) {
      const projectPath = `data/projects/${projectsIndex[projectId].path}/project.json`;
      const project = await readJsonFile(projectPath);
      if (project) return project;
    }

    // Fallback: search through directory structure
    const years = await fs.readdir('data/projects');
    for (const year of years) {
      if (year === 'metadata') continue;

      try {
        const yearPath = `data/projects/${year}`;
        const months = await fs.readdir(yearPath);

        for (const month of months) {
          try {
            const monthPath = `${yearPath}/${month}`;
            const days = await fs.readdir(monthPath);

            for (const day of days) {
              try {
                const dayPath = `${monthPath}/${day}`;
                const projects = await fs.readdir(dayPath);

                for (const project of projects) {
                  if (project === projectId) {
                    const projectPath = `${dayPath}/${project}/project.json`;
                    const projectData = await readJsonFile(projectPath);
                    if (projectData) return projectData;
                  }
                }
              } catch (e) {
                // Skip this day if there's an error
                continue;
              }
            }
          } catch (e) {
            // Skip this month if there's an error
            continue;
          }
        }
      } catch (e) {
        // Skip this year if there's an error
        continue;
      }
    }

    return null;
  } catch (error) {
    console.error(`Error getting project data for ${projectId}:`, error);
    return null;
  }
}

// Get invoice data
async function getInvoiceData(invoiceNumber, projectId) {
  try {
    // Search through invoice directory structure
    const years = await fs.readdir('data/invoices');
    for (const year of years) {
      const yearPath = `data/invoices/${year}`;
      const months = await fs.readdir(yearPath);

      for (const month of months) {
        const monthPath = `${yearPath}/${month}`;
        const days = await fs.readdir(monthPath);

        for (const day of days) {
          const dayPath = `${monthPath}/${day}`;
          const projects = await fs.readdir(dayPath);

          for (const project of projects) {
            if (project === projectId) {
              const projectPath = `${dayPath}/${project}`;
              const invoiceFile = `${invoiceNumber}.json`;
              const invoicePath = `${projectPath}/${invoiceFile}`;

              try {
                return await readJsonFile(invoicePath);
              } catch (e) {
                // Continue searching
              }
            }
          }
        }
      }
    }

    return null;
  } catch (error) {
    console.error(`Error getting invoice data for ${invoiceNumber}:`, error);
    return null;
  }
}

// Fix a single notification
async function fixNotification(notificationPath) {
  const notification = await readJsonFile(notificationPath);
  if (!notification) return false;

  let wasFixed = false;
  const fixes = [];

  // Check if freelancer name needs fixing
  const hasGenericFreelancerName = notification.metadata?.freelancerName === 'Freelancer';
  const hasZeroAmount = notification.metadata?.amount === 0;

  if (hasGenericFreelancerName || hasZeroAmount) {
    console.log(`\nFixing notification ${notification.id}:`);
    console.log(`  Type: ${notification.type}`);
    console.log(`  Current freelancerName: ${notification.metadata?.freelancerName}`);
    console.log(`  Current amount: ${notification.metadata?.amount}`);

    // Get project data to find freelancer ID
    const projectId = notification.metadata?.projectId || notification.context?.projectId;

    if (projectId) {
      const project = await getProjectData(projectId);

      if (project) {
        // Fix freelancer name
        if (hasGenericFreelancerName && project.freelancerId) {
          const freelancerName = await getFreelancerName(project.freelancerId);
          if (freelancerName) {
            notification.metadata.freelancerName = freelancerName;
            fixes.push(`freelancerName: ${freelancerName} (from user ID ${project.freelancerId})`);
            wasFixed = true;
          }
        }

        // Fix amount from invoice data
        if (hasZeroAmount) {
          const invoiceNumber = notification.metadata?.invoiceNumber || notification.context?.invoiceNumber;
          if (invoiceNumber) {
            const invoice = await getInvoiceData(invoiceNumber, projectId);
            if (invoice && invoice.totalAmount) {
              notification.metadata.amount = invoice.totalAmount;
              fixes.push(`amount: $${invoice.totalAmount} (from invoice ${invoiceNumber})`);
              wasFixed = true;
            }
          }
        }
      }
    }

    if (wasFixed) {
      // Add enrichment note and update timestamp
      notification.enrichmentNote = `Fixed ${fixes.join(', ')}`;
      notification.updatedAt = new Date().toISOString();

      // Update title and message for payment notifications
      if (notification.type === 'milestone_payment_sent' && notification.metadata.freelancerName && notification.metadata.amount) {
        const freelancerName = notification.metadata.freelancerName;
        const amount = notification.metadata.amount;
        const taskTitle = notification.metadata.taskTitle;
        const projectTitle = notification.metadata.projectTitle;
        const remainingBudget = notification.metadata.remainingBudget || 0;

        notification.title = `You just paid ${freelancerName} $${amount.toLocaleString()}`;
        notification.message = `You just paid ${freelancerName} $${amount.toLocaleString()} for submitting ${taskTitle} for ${projectTitle}. Remaining budget: $${remainingBudget.toLocaleString()}. Click here to see transaction activity`;
      }

      // Save the fixed notification
      const success = await writeJsonFile(notificationPath, notification);
      if (success) {
        console.log(`  ✅ Fixed: ${fixes.join(', ')}`);
        return true;
      } else {
        console.log(`  ❌ Failed to save fixes`);
        return false;
      }
    } else {
      console.log(`  ⚠️ Could not fix notification - missing data`);
    }
  }

  return false;
}

// Main function to scan and fix notifications
async function main() {
  console.log('🔧 Starting notification enrichment fix...\n');

  let totalFixed = 0;
  let totalScanned = 0;

  try {
    // Scan all notification event files
    const eventsPath = 'data/notifications/events';
    const years = await fs.readdir(eventsPath);

    for (const year of years) {
      const yearPath = `${eventsPath}/${year}`;
      const months = await fs.readdir(yearPath);

      for (const month of months) {
        const monthPath = `${yearPath}/${month}`;
        const days = await fs.readdir(monthPath);

        for (const day of days) {
          const dayPath = `${monthPath}/${day}`;
          const eventTypes = await fs.readdir(dayPath);

          for (const eventType of eventTypes) {
            const eventTypePath = `${dayPath}/${eventType}`;
            const files = await fs.readdir(eventTypePath);

            for (const file of files) {
              if (file.endsWith('.json')) {
                const filePath = `${eventTypePath}/${file}`;
                totalScanned++;

                const wasFixed = await fixNotification(filePath);
                if (wasFixed) {
                  totalFixed++;
                }
              }
            }
          }
        }
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`  Total notifications scanned: ${totalScanned}`);
    console.log(`  Total notifications fixed: ${totalFixed}`);
    console.log(`\n✅ Notification enrichment fix completed!`);

  } catch (error) {
    console.error('❌ Error during notification fix:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { fixNotification, getFreelancerName, getProjectData, getInvoiceData, backfillAndCleanupC009 };

// ---------------- DEV-ONLY BACKFILL AND CLEANUP FOR PROJECT C-009 (PHASE 5) ----------------
async function backfillAndCleanupC009() {
  if (process.env.NODE_ENV === 'production') {
    console.log('⏭️  Skipping C-009 backfill in production');
    return;
  }

  const TARGET_PROJECT_ID = 'C-009';
  const TARGET_INVOICE = 'MH-009';

  // Load invoice and project
  const invoice = await getInvoiceData(TARGET_INVOICE, TARGET_PROJECT_ID);
  const project = await getProjectData(TARGET_PROJECT_ID);
  if (!invoice || !project) {
    console.warn('⚠️  C-009 backfill aborted - missing invoice or project');
    return;
  }

  // Resolve enrichment fields
  const amount = Number(invoice.totalAmount || invoice.amount || 0) || 0;
  const organizationName = await (async () => {
    try {
      const { UnifiedStorageService } = await import('../src/lib/storage/unified-storage-service');
      const org = await UnifiedStorageService.getOrganizationById(project.organizationId);
      return org?.name || null;
    } catch (_) {
      return null;
    }
  })();

  // Walk events dir to gather candidate files
  const eventsRoot = 'data/notifications/events';
  const commissionerCandidates = [];
  const freelancerCandidates = [];

  async function scanDir(dir) {
    let entries = [];
    try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await scanDir(full);
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        try {
          const ev = JSON.parse(await fs.readFile(full, 'utf8'));
          if (['milestone_payment_sent','milestone_payment_received'].includes(ev.type)) {
            const inv = ev.metadata?.invoiceNumber || ev.context?.invoiceNumber;
            const proj = ev.metadata?.projectId || ev.context?.projectId;
            if (String(inv).trim() === TARGET_INVOICE && String(proj).trim() === TARGET_PROJECT_ID) {
              (ev.type === 'milestone_payment_sent' ? commissionerCandidates : freelancerCandidates).push({ ev, full });
            }
          }
        } catch {}
      }
    }
  }
  await scanDir(eventsRoot);

  // Helper: choose the best event per type
  function pickBest(arr, type) {
    if (arr.length === 0) return null;
    const scored = arr.map(x => ({
      file: x.full,
      ev: x.ev,
      score: (type === 'commissioner')
        ? ((Number(x.ev.metadata?.amount) > 0 ? 2 : 0) + (x.ev.metadata?.freelancerName && x.ev.metadata.freelancerName !== 'Freelancer' ? 1 : 0))
        : ((Number(x.ev.metadata?.amount) > 0 ? 2 : 0) + (x.ev.metadata?.organizationName ? 1 : 0))
    }));
    scored.sort((a,b)=>b.score-a.score);
    return scored[0];
  }

  // Commissioner cleanup
  const bestCommissioner = pickBest(commissionerCandidates, 'commissioner');
  if (bestCommissioner) {
    const keepFile = bestCommissioner.file;
    const remove = commissionerCandidates.filter(c => c.full !== keepFile);
    if (remove.length) {
      for (const r of remove) {
        await fs.unlink(r.full).catch(()=>{});
      }
      console.log('[cleanup-duplicate]', `milestone_payment_sent:commissioner:${TARGET_PROJECT_ID}:${TARGET_INVOICE}`, { kept: keepFile, removed: remove.map(r=>r.full) });
    }
    // Re-enrich stale kept file if needed
    const ev = bestCommissioner.ev;
    let changed = false;
    if (!(Number(ev.metadata?.amount) > 0) && amount > 0) { ev.metadata.amount = amount; changed = true; }
    if (!ev.metadata?.freelancerName || ev.metadata.freelancerName === 'Freelancer') {
      const freelancerName = await getFreelancerName(project.freelancerId);
      if (freelancerName) { ev.metadata.freelancerName = freelancerName; changed = true; }
    }
    if (changed) {
      ev.enrichmentNote = 'Re-enriched C-009 commissioner event';
      ev.updatedAt = new Date().toISOString();
      await writeJsonFile(keepFile, ev);
    }
  }

  // Freelancer cleanup and backfill
  const bestFreelancer = pickBest(freelancerCandidates, 'freelancer');
  if (bestFreelancer) {
    const keepFile = bestFreelancer.file;
    const remove = freelancerCandidates.filter(c => c.full !== keepFile);
    if (remove.length) {
      for (const r of remove) await fs.unlink(r.full).catch(()=>{});
      console.log('[cleanup-duplicate]', `milestone_payment_received:freelancer:${TARGET_PROJECT_ID}:${TARGET_INVOICE}`, { kept: keepFile, removed: remove.map(r=>r.full) });
    }
    // Re-enrich kept
    const ev = bestFreelancer.ev;
    let changed = false;
    if (!(Number(ev.metadata?.amount) > 0) && amount > 0) { ev.metadata.amount = amount; changed = true; }
    if (!ev.metadata?.organizationName && organizationName) { ev.metadata.organizationName = organizationName; changed = true; }
    if (changed) {
      ev.enrichmentNote = 'Re-enriched C-009 freelancer event';
      ev.updatedAt = new Date().toISOString();
      await writeJsonFile(keepFile, ev);
    }
  } else {
    // Backfill missing freelancer event
    const ts = invoice.paymentDetails?.processedAt || (invoice.paidDate ? new Date(invoice.paidDate).toISOString() : new Date().toISOString());
    const t = new Date(ts);
    const year = t.getFullYear().toString();
    const month = t.toLocaleDateString('en-US', { month: 'long' });
    const day = String(t.getDate()).padStart(2, '0');
    const dir = path.join('data/notifications/events', year, month, day, 'milestone_payment_received');
    await fs.mkdir(dir, { recursive: true });

    const eventId = `milestone_payment_${TARGET_PROJECT_ID}_${Date.now()}`;
    const filePath = path.join(dir, `${eventId}.json`);

    const milestoneTitle = (invoice.milestones && invoice.milestones[0]?.description) || 'Task';
    const evt = {
      id: eventId,
      timestamp: t.toISOString(),
      type: 'milestone_payment_received',
      notificationType: 42,
      actorId: Number(project.commissionerId),
      targetId: Number(invoice.freelancerId),
      entityType: 10,
      entityId: `${TARGET_PROJECT_ID}_${milestoneTitle}`,
      metadata: {
        milestoneTitle,
        amount: amount || 0,
        organizationName: organizationName || 'Organization',
        invoiceNumber: TARGET_INVOICE,
        projectBudget: project.totalBudget || 0,
        projectTitle: project.title,
        remainingBudget: Math.max(0, (project.totalBudget||0) - (project.paidToDate||0)),
        priority: 'high'
      },
      context: {
        projectId: TARGET_PROJECT_ID,
        milestoneTitle,
        invoiceNumber: TARGET_INVOICE
      },
      enrichmentNote: 'Backfilled from payment/invoice data',
      updatedAt: new Date().toISOString()
    };
    await writeJsonFile(filePath, evt);
    console.log('[emit]', `milestone_payment_received:freelancer:${TARGET_PROJECT_ID}:${TARGET_INVOICE}`);
  }
}

