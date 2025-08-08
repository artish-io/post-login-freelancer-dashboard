/**
 * Invoice Audit Cleanup Utility
 * 
 * Removes preview invoice spam from audit logs and provides cleanup functionality
 */

import { promises as fs } from 'fs';
import path from 'path';

const AUDIT_LOG_PATH = path.join(process.cwd(), 'data', 'logs', 'invoice-audit.json');
const BACKUP_PATH = path.join(process.cwd(), 'data', 'logs', 'invoice-audit-backup.json');

export interface AuditEntry {
  invoiceNumber: string;
  status: string;
  timestamp: string;
  uuid: string;
}

export interface CleanupResult {
  totalEntries: number;
  previewEntries: number;
  removedEntries: number;
  remainingEntries: number;
  backupCreated: boolean;
}

/**
 * Clean up preview invoice spam from audit logs
 */
export async function cleanupInvoiceAuditSpam(): Promise<CleanupResult> {
  try {
    // Read current audit log
    const auditData = await fs.readFile(AUDIT_LOG_PATH, 'utf-8');
    const auditEntries: AuditEntry[] = JSON.parse(auditData);

    const totalEntries = auditEntries.length;
    const previewEntries = auditEntries.filter(entry => entry.status === 'preview').length;

    // Create backup before cleanup
    await fs.writeFile(BACKUP_PATH, auditData);
    console.log(`📦 Created backup at: ${BACKUP_PATH}`);

    // Filter out preview entries
    const cleanedEntries = auditEntries.filter(entry => entry.status !== 'preview');
    const removedEntries = totalEntries - cleanedEntries.length;

    // Write cleaned data back
    await fs.writeFile(AUDIT_LOG_PATH, JSON.stringify(cleanedEntries, null, 2));

    const result: CleanupResult = {
      totalEntries,
      previewEntries,
      removedEntries,
      remainingEntries: cleanedEntries.length,
      backupCreated: true
    };

    console.log('🧹 Invoice audit cleanup completed:');
    console.log(`   Total entries: ${totalEntries}`);
    console.log(`   Preview entries: ${previewEntries}`);
    console.log(`   Removed entries: ${removedEntries}`);
    console.log(`   Remaining entries: ${cleanedEntries.length}`);

    return result;

  } catch (error) {
    console.error('❌ Error during invoice audit cleanup:', error);
    throw new Error(`Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get audit log statistics without cleanup
 */
export async function getAuditLogStats(): Promise<{
  totalEntries: number;
  statusBreakdown: Record<string, number>;
  oldestEntry?: string;
  newestEntry?: string;
}> {
  try {
    const auditData = await fs.readFile(AUDIT_LOG_PATH, 'utf-8');
    const auditEntries: AuditEntry[] = JSON.parse(auditData);

    const statusBreakdown: Record<string, number> = {};
    let oldestEntry: string | undefined;
    let newestEntry: string | undefined;

    auditEntries.forEach(entry => {
      statusBreakdown[entry.status] = (statusBreakdown[entry.status] || 0) + 1;
      
      if (!oldestEntry || entry.timestamp < oldestEntry) {
        oldestEntry = entry.timestamp;
      }
      if (!newestEntry || entry.timestamp > newestEntry) {
        newestEntry = entry.timestamp;
      }
    });

    return {
      totalEntries: auditEntries.length,
      statusBreakdown,
      oldestEntry,
      newestEntry
    };

  } catch (error) {
    console.error('❌ Error reading audit log stats:', error);
    throw new Error(`Stats failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Restore audit log from backup
 */
export async function restoreAuditLogFromBackup(): Promise<boolean> {
  try {
    const backupData = await fs.readFile(BACKUP_PATH, 'utf-8');
    await fs.writeFile(AUDIT_LOG_PATH, backupData);
    console.log('✅ Audit log restored from backup');
    return true;
  } catch (error) {
    console.error('❌ Error restoring from backup:', error);
    return false;
  }
}
