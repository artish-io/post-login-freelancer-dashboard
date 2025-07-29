#!/usr/bin/env node

/**
 * Fix invoice notification data inconsistency
 * 
 * Problem: Notification events have incorrect invoice numbers in metadata
 * - Notifications show: MGL303001, MGL304001, MGL305001
 * - But invoices.json has: MGL100000-M1, MGL100002-M1, etc.
 * - Context has: INV-303-001, INV-304-001, etc.
 * 
 * Solution: Update notification events to use correct invoice numbers
 */

const fs = require('fs');
const path = require('path');

// Load invoices data to create mapping
function loadInvoices() {
  const invoicesPath = path.join(process.cwd(), 'data', 'invoices.json');
  return JSON.parse(fs.readFileSync(invoicesPath, 'utf-8'));
}

// Create mapping from context invoiceId to actual invoice number
function createInvoiceMapping(invoices) {
  const mapping = {};
  
  // Create mapping from project-based patterns to actual invoice numbers
  mapping['INV-303-001'] = 'MGL000303-M1';
  mapping['INV-304-001'] = 'MGL100004-M1'; // Event Production Branding
  mapping['INV-305-001'] = 'MGL100006-M1'; // Micro-content for Launch Campaign
  mapping['INV-299-001'] = 'MGL100005-M1'; // Corlax iOS App Launch Deck
  mapping['INV-306-001'] = 'MGL100006-M1'; // Micro-content for Launch Campaign
  mapping['INV-311-001'] = 'MGL100008-M1'; // Lagos Parks Mobile App Development
  
  return mapping;
}

// Fix notification events in a specific file
function fixNotificationFile(filePath, invoiceMapping) {
  if (!fs.existsSync(filePath)) {
    return false;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const events = JSON.parse(content);
  let modified = false;

  events.forEach(event => {
    if (event.type === 'invoice_paid' && event.context?.invoiceId) {
      const contextInvoiceId = event.context.invoiceId;
      const correctInvoiceNumber = invoiceMapping[contextInvoiceId];

      console.log(`Checking event: ${event.id}, contextId: ${contextInvoiceId}, current: ${event.metadata?.invoiceNumber}, correct: ${correctInvoiceNumber}`);

      if (correctInvoiceNumber && event.metadata?.invoiceNumber !== correctInvoiceNumber) {
        console.log(`Fixing ${event.metadata?.invoiceNumber} -> ${correctInvoiceNumber}`);
        event.metadata.invoiceNumber = correctInvoiceNumber;
        event.context.invoiceNumber = correctInvoiceNumber;
        modified = true;
      }
    }
  });

  if (modified) {
    fs.writeFileSync(filePath, JSON.stringify(events, null, 2));
    return true;
  }
  return false;
}

// Main function
function fixInvoiceNotificationData() {
  console.log('🔧 Fixing invoice notification data inconsistency...\n');

  try {
    const invoices = loadInvoices();
    const invoiceMapping = createInvoiceMapping(invoices);
    
    console.log('Invoice mapping:');
    Object.entries(invoiceMapping).forEach(([contextId, invoiceNumber]) => {
      console.log(`  ${contextId} -> ${invoiceNumber}`);
    });
    console.log('');

    // Find all invoice_paid.json files
    const eventsDir = path.join(process.cwd(), 'data', 'notifications', 'events');
    let totalFixed = 0;

    function processDirectory(dir) {
      if (!fs.existsSync(dir)) return;
      
      const items = fs.readdirSync(dir);
      items.forEach(item => {
        const itemPath = path.join(dir, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
          processDirectory(itemPath);
        } else if (item === 'invoice_paid.json') {
          const fixed = fixNotificationFile(itemPath, invoiceMapping);
          if (fixed) {
            console.log(`✅ Fixed: ${itemPath}`);
            totalFixed++;
          }
        }
      });
    }

    processDirectory(eventsDir);

    console.log(`\n🎉 Fixed ${totalFixed} notification files!`);

  } catch (error) {
    console.error('❌ Error fixing invoice notification data:', error);
    process.exit(1);
  }
}

// Run the fix
fixInvoiceNotificationData();
