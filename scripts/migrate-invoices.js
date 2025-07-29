#!/usr/bin/env node

/**
 * Migration script to convert flat invoices.json to hierarchical structure
 * Structure: data/invoices/[year]/[month]/[day]/[projectId]/invoice.json
 */

const fs = require('fs').promises;
const path = require('path');

// Helper function to parse date from various formats
function parseInvoiceDate(dateStr) {
  if (!dateStr) return null;
  
  // Handle ISO string format (e.g., "2025-07-27T16:55:28.237Z")
  if (dateStr.includes('T')) {
    return new Date(dateStr);
  }
  
  // Handle simple date format (e.g., "2025-06-01")
  return new Date(dateStr + 'T00:00:00.000Z');
}

// Helper function to format date parts
function getDateParts(date) {
  if (!date || isNaN(date.getTime())) {
    // Fallback to current date if invalid
    date = new Date();
  }
  
  const year = date.getFullYear().toString();
  const month = date.toLocaleString('en-US', { month: 'long' }); // e.g., "July"
  const day = date.getDate().toString().padStart(2, '0'); // e.g., "01"
  
  return { year, month, day };
}

// Helper function to ensure directory exists
async function ensureDir(dirPath) {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

// Helper function to generate unique filename if collision occurs
async function getUniqueFilename(basePath, invoiceNumber) {
  let filename = 'invoice.json';
  let fullPath = path.join(basePath, filename);
  let counter = 1;
  
  try {
    await fs.access(fullPath);
    // File exists, check if it's the same invoice
    const existingData = JSON.parse(await fs.readFile(fullPath, 'utf-8'));
    if (existingData.invoiceNumber === invoiceNumber) {
      // Same invoice, overwrite
      return filename;
    }
    
    // Different invoice, create unique filename
    while (true) {
      filename = `invoice-${counter}.json`;
      fullPath = path.join(basePath, filename);
      try {
        await fs.access(fullPath);
        const existingData = JSON.parse(await fs.readFile(fullPath, 'utf-8'));
        if (existingData.invoiceNumber === invoiceNumber) {
          return filename;
        }
        counter++;
      } catch {
        return filename;
      }
    }
  } catch {
    // File doesn't exist
    return filename;
  }
}

async function migrateInvoices() {
  try {
    console.log('🚀 Starting invoice migration...');
    
    // Read the current invoices.json
    const invoicesPath = path.join(process.cwd(), 'data', 'invoices.json');
    const invoicesData = await fs.readFile(invoicesPath, 'utf-8');
    const invoices = JSON.parse(invoicesData);
    
    console.log(`📊 Found ${invoices.length} invoices to migrate`);
    
    // Create backup
    const backupPath = path.join(process.cwd(), 'data', `invoices-backup-${Date.now()}.json`);
    await fs.writeFile(backupPath, invoicesData);
    console.log(`💾 Backup created: ${backupPath}`);
    
    // Create base invoices directory
    const baseInvoicesDir = path.join(process.cwd(), 'data', 'invoices');
    await ensureDir(baseInvoicesDir);
    
    let migratedCount = 0;
    let errorCount = 0;
    
    for (const invoice of invoices) {
      try {
        // Parse the issue date
        const issueDate = parseInvoiceDate(invoice.issueDate);
        const { year, month, day } = getDateParts(issueDate);
        
        // Determine project ID (use 'custom' for null project IDs)
        const projectId = invoice.projectId ? invoice.projectId.toString() : 'custom';
        
        // Create directory structure
        const invoiceDir = path.join(baseInvoicesDir, year, month, day, projectId);
        await ensureDir(invoiceDir);
        
        // Get unique filename
        const filename = await getUniqueFilename(invoiceDir, invoice.invoiceNumber);
        const invoiceFilePath = path.join(invoiceDir, filename);
        
        // Write invoice data
        await fs.writeFile(invoiceFilePath, JSON.stringify(invoice, null, 2));
        
        migratedCount++;
        console.log(`✅ Migrated: ${invoice.invoiceNumber} -> ${year}/${month}/${day}/${projectId}/${filename}`);
        
      } catch (error) {
        errorCount++;
        console.error(`❌ Error migrating invoice ${invoice.invoiceNumber}:`, error.message);
      }
    }
    
    // Clear the original invoices.json (make it an empty array)
    await fs.writeFile(invoicesPath, '[]');
    
    console.log('\n📈 Migration Summary:');
    console.log(`✅ Successfully migrated: ${migratedCount} invoices`);
    console.log(`❌ Errors: ${errorCount} invoices`);
    console.log(`📁 New structure: data/invoices/[year]/[month]/[day]/[projectId]/invoice.json`);
    console.log(`🗂️  Original file cleared and backup saved`);
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateInvoices();
}

module.exports = { migrateInvoices };
