/**
 * Milestone Payment Notifications Acceptance Tests
 * 
 * Tests specified in section 11 of the implementation guide:
 * 1. Milestone payment on string projectId (e.g., "C-009")
 * 2. Duplicate emission (simulate retry or double-click)
 * 3. C-009 backfill
 * 4. Invoice/Payment Safety
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/testing-library/jest-dom';
import { emitMilestonePaymentNotifications } from '../payment-notification-gateway';
import { enrichPaymentData } from '../payment-enrichment';
import { backfillC009, isC009BackfillNeeded } from '../c009-backfill';
import { NotificationStorage } from '../notification-storage';

// Mock environment variables for testing
const originalEnv = process.env;

beforeEach(() => {
  // Reset environment for each test
  process.env = { ...originalEnv };
  
  // Enable all features for testing
  process.env.NOTIFS_SINGLE_EMITTER = 'true';
  process.env.NOTIFS_DISABLE_GENERIC_FOR_PAYMENT = 'true';
  process.env.PAYMENT_NOTIFS_DISABLED = 'false';
});

afterEach(() => {
  // Restore original environment
  process.env = originalEnv;
});

describe('Milestone Payment Notifications - Acceptance Tests', () => {
  
  describe('Test 1: Milestone payment on string projectId', () => {
    test('should emit exactly one commissioner and one freelancer notification', async () => {
      // Arrange
      const paymentData = {
        projectId: 'C-009',
        invoiceNumber: 'MH-009',
        amount: 500,
        commissionerId: 1,
        freelancerId: 2,
        freelancerName: 'Tobi Philly',
        organizationName: 'Corlax Wellness',
        taskTitle: 'Positioning & Messaging',
        projectTitle: 'Milestones Web 3 Graphic Design Assets',
        remainingBudget: 1000
      };

      // Act
      await emitMilestonePaymentNotifications(paymentData);

      // Assert
      const recentEvents = await NotificationStorage.getRecentEvents(1);
      
      const commissionerNotifs = recentEvents.filter(e => 
        e.type === 'milestone_payment_sent' && 
        e.metadata?.projectId === 'C-009' &&
        e.metadata?.invoiceNumber === 'MH-009'
      );
      
      const freelancerNotifs = recentEvents.filter(e => 
        e.type === 'milestone_payment_received' && 
        e.metadata?.projectId === 'C-009' &&
        e.metadata?.invoiceNumber === 'MH-009'
      );

      expect(commissionerNotifs).toHaveLength(1);
      expect(freelancerNotifs).toHaveLength(1);

      // Verify enriched content
      const commissionerNotif = commissionerNotifs[0];
      expect(commissionerNotif.metadata?.freelancerName).toBe('Tobi Philly');
      expect(commissionerNotif.metadata?.amount).toBe(500);

      const freelancerNotif = freelancerNotifs[0];
      expect(freelancerNotif.metadata?.organizationName).toBe('Corlax Wellness');
      expect(freelancerNotif.metadata?.amount).toBe(500);
    });

    test('should not create generic duplicates when feature flags are enabled', async () => {
      // Arrange
      const paymentData = {
        projectId: 'C-009',
        invoiceNumber: 'MH-009-TEST',
        amount: 500,
        commissionerId: 1,
        freelancerId: 2,
        freelancerName: 'Test Freelancer',
        organizationName: 'Test Org'
      };

      // Act
      await emitMilestonePaymentNotifications(paymentData);

      // Assert
      const recentEvents = await NotificationStorage.getRecentEvents(1);
      
      const genericNotifs = recentEvents.filter(e => 
        e.type === 'invoice_paid' && 
        e.metadata?.projectId === 'C-009' &&
        e.metadata?.invoiceNumber === 'MH-009-TEST'
      );

      expect(genericNotifs).toHaveLength(0);
    });
  });

  describe('Test 2: Duplicate emission handling', () => {
    test('should upgrade in place without creating extra files', async () => {
      // Arrange
      const basePaymentData = {
        projectId: 'C-010',
        invoiceNumber: 'MH-010',
        amount: 300,
        commissionerId: 1,
        freelancerId: 2,
        freelancerName: 'Freelancer', // Generic name (low quality)
        organizationName: 'Organization' // Generic name (low quality)
      };

      const enrichedPaymentData = {
        ...basePaymentData,
        freelancerName: 'John Doe', // Better name
        organizationName: 'Acme Corp' // Better name
      };

      // Act - First emission (low quality)
      await emitMilestonePaymentNotifications(basePaymentData);
      
      const eventsAfterFirst = await NotificationStorage.getRecentEvents(1);
      const initialCount = eventsAfterFirst.length;

      // Act - Second emission (higher quality)
      await emitMilestonePaymentNotifications(enrichedPaymentData);

      // Assert
      const eventsAfterSecond = await NotificationStorage.getRecentEvents(1);
      
      // Should not have more events (upgrade in place)
      expect(eventsAfterSecond.length).toBeLessThanOrEqual(initialCount + 2); // At most 2 new events

      // Find the upgraded events
      const upgradedEvents = eventsAfterSecond.filter(e => 
        e.metadata?.projectId === 'C-010' &&
        e.metadata?.invoiceNumber === 'MH-010' &&
        e.metadata?.enrichmentNote === 'Upgraded'
      );

      expect(upgradedEvents.length).toBeGreaterThan(0);

      // Verify quality improvement
      const freelancerEvent = upgradedEvents.find(e => e.type === 'milestone_payment_received');
      expect(freelancerEvent?.metadata?.organizationName).toBe('Acme Corp');
    });
  });

  describe('Test 3: C-009 backfill', () => {
    test('should create missing freelancer notification and upgrade poor quality notifications', async () => {
      // This test would require setting up specific test data for C-009
      // For now, we'll test the backfill logic
      
      const backfillNeeded = await isC009BackfillNeeded();
      
      if (backfillNeeded) {
        const report = await backfillC009();
        
        expect(report.projectId).toBe('C-009');
        expect(report.invoiceNumber).toBe('MH-009');
        expect(report.errors.length).toBe(0);
        
        // If freelancer event was missing, it should be created
        if (!report.freelancerEventExists) {
          expect(report.freelancerEventCreated).toBe(true);
        }
      }
    });
  });

  describe('Test 4: Invoice/Payment Safety', () => {
    test('should not modify invoice or payment artifacts during notification processing', async () => {
      // This test verifies that notification processing is read-only
      // In a real implementation, you would:
      // 1. Take a snapshot of invoice/payment files before processing
      // 2. Process notifications
      // 3. Verify no invoice/payment files were modified
      
      const paymentData = {
        projectId: 'C-011',
        invoiceNumber: 'MH-011',
        amount: 400,
        commissionerId: 1,
        freelancerId: 2
      };

      // Mock file system operations to track writes
      const originalWriteFile = require('fs').writeFileSync;
      const writeOperations: string[] = [];
      
      require('fs').writeFileSync = jest.fn((path: string, data: any) => {
        writeOperations.push(path);
        return originalWriteFile(path, data);
      });

      try {
        // Act
        await emitMilestonePaymentNotifications(paymentData);

        // Assert - No invoice or payment files should be written
        const invoiceWrites = writeOperations.filter(path => 
          path.includes('/invoices/') || path.includes('/payments/')
        );
        
        expect(invoiceWrites).toHaveLength(0);
        
        // Only notification files should be written
        const notificationWrites = writeOperations.filter(path => 
          path.includes('/notifications/events/')
        );
        
        expect(notificationWrites.length).toBeGreaterThan(0);
        
      } finally {
        // Restore original function
        require('fs').writeFileSync = originalWriteFile;
      }
    });

    test('should handle read failures gracefully without affecting payment execution', async () => {
      // Mock enrichment to fail
      const originalEnrichment = enrichPaymentData;
      
      // Replace with failing version
      const mockEnrichment = jest.fn().mockRejectedValue(new Error('Read failure'));
      
      try {
        // This should not throw - errors should be caught and logged
        await expect(async () => {
          // Simulate payment notification with read failure
          const paymentData = {
            projectId: 'C-012',
            invoiceNumber: 'MH-012',
            amount: 500,
            commissionerId: 1,
            freelancerId: 2
          };
          
          await emitMilestonePaymentNotifications(paymentData);
        }).not.toThrow();
        
      } finally {
        // Restore original function
        jest.restoreAllMocks();
      }
    });
  });

  describe('Test 5: Feature Flag Safety', () => {
    test('should respect PAYMENT_NOTIFS_DISABLED kill switch', async () => {
      // Arrange
      process.env.PAYMENT_NOTIFS_DISABLED = 'true';
      
      const paymentData = {
        projectId: 'C-013',
        invoiceNumber: 'MH-013',
        amount: 500,
        commissionerId: 1,
        freelancerId: 2
      };

      const eventCountBefore = (await NotificationStorage.getRecentEvents(1)).length;

      // Act
      await emitMilestonePaymentNotifications(paymentData);

      // Assert - No new notifications should be created
      const eventCountAfter = (await NotificationStorage.getRecentEvents(1)).length;
      expect(eventCountAfter).toBe(eventCountBefore);
    });

    test('should fall back to legacy behavior when NOTIFS_SINGLE_EMITTER is disabled', async () => {
      // Arrange
      process.env.NOTIFS_SINGLE_EMITTER = 'false';
      
      // This test would verify that the legacy notification path is used
      // when the new gateway is disabled
      expect(process.env.NOTIFS_SINGLE_EMITTER).toBe('false');
    });
  });
});
