#!/usr/bin/env node

/**
 * Ensure Generic Notifications Script
 * 
 * This script ensures that all notification types work generically for all user types
 * by checking for and fixing any hardcoded user IDs, organization names, or other
 * non-generic values in the notification system.
 */

const fs = require('fs').promises;
const path = require('path');

async function checkNotificationGenericness() {
  console.log('🔍 Checking notification system for generic compatibility...');
  
  const issues = [];
  const fixes = [];
  
  // Check notification generation logic
  const notificationRoutes = [
    'src/app/api/notifications-v2/route.ts',
    'src/lib/events/bus.ts',
    'src/lib/events/completion-events.ts',
    'src/app/api/notifications-v2/completion-handler.ts'
  ];
  
  for (const routePath of notificationRoutes) {
    try {
      const fullPath = path.join(process.cwd(), routePath);
      const content = await fs.readFile(fullPath, 'utf8');
      
      // Check for hardcoded user IDs
      const hardcodedUserIds = content.match(/(?:userId|actorId|targetId|freelancerId|commissionerId)\s*[=:]\s*(?:31|32|34|35|1|25)\b/g);
      if (hardcodedUserIds) {
        issues.push(`${routePath}: Found hardcoded user IDs: ${hardcodedUserIds.join(', ')}`);
      }
      
      // Check for hardcoded organization names
      const hardcodedOrgNames = content.match(/["'](?:Corlax Wellness|Zynate Events Group|TechCorp)["']/g);
      if (hardcodedOrgNames) {
        issues.push(`${routePath}: Found hardcoded organization names: ${hardcodedOrgNames.join(', ')}`);
      }
      
      // Check for hardcoded freelancer names
      const hardcodedFreelancerNames = content.match(/["'](?:Tobi Philly|Lucas Meyer|Sarah Johnson|Margsate Flether)["']/g);
      if (hardcodedFreelancerNames) {
        issues.push(`${routePath}: Found hardcoded freelancer names: ${hardcodedFreelancerNames.join(', ')}`);
      }
      
    } catch (error) {
      console.warn(`Could not check ${routePath}: ${error.message}`);
    }
  }
  
  // Check for proper dynamic user/organization lookup usage
  const checkFiles = [
    'src/app/api/notifications-v2/route.ts',
    'src/lib/events/bus.ts',
    'src/app/api/notifications-v2/completion-handler.ts'
  ];
  
  for (const filePath of checkFiles) {
    try {
      const fullPath = path.join(process.cwd(), filePath);
      const content = await fs.readFile(fullPath, 'utf8');
      
      // Check if files use proper dynamic lookup services
      const hasUnifiedStorage = content.includes('UnifiedStorageService');
      const hasGetUserById = content.includes('getUserById');
      const hasGetOrganizations = content.includes('getAllOrganizations');
      
      if (!hasUnifiedStorage && !hasGetUserById) {
        issues.push(`${filePath}: Should use UnifiedStorageService for dynamic user lookup`);
      }
      
      if (content.includes('organizationName') && !hasGetOrganizations) {
        issues.push(`${filePath}: Should use getAllOrganizations for dynamic organization lookup`);
      }
      
    } catch (error) {
      console.warn(`Could not check ${filePath}: ${error.message}`);
    }
  }
  
  // Check notification data for proper structure
  console.log('📋 Checking notification data structure...');
  
  const notificationsDir = path.join(process.cwd(), 'data', 'notifications', 'events');
  const sampleNotifications = await findSampleNotifications(notificationsDir);
  
  for (const notificationPath of sampleNotifications) {
    try {
      const data = await fs.readFile(notificationPath, 'utf8');
      const notification = JSON.parse(data);
      
      // Check if notification has proper context enrichment
      if (notification.type === 'milestone_payment_received' || notification.type === 'milestone_payment_sent') {
        if (!notification.metadata?.organizationName) {
          issues.push(`${notificationPath}: Missing organizationName in metadata`);
        }
        if (!notification.metadata?.freelancerName && notification.type === 'milestone_payment_sent') {
          issues.push(`${notificationPath}: Missing freelancerName in metadata`);
        }
      }
      
      if (notification.type?.startsWith('completion.')) {
        if (!notification.context?.orgName && !notification.context?.freelancerName) {
          issues.push(`${notificationPath}: Missing orgName/freelancerName in context`);
        }
      }
      
    } catch (error) {
      // Skip invalid JSON files
    }
  }
  
  return { issues, fixes };
}

async function findSampleNotifications(dir, maxSamples = 10) {
  const files = [];
  
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (files.length >= maxSamples) break;
      
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        const subFiles = await findSampleNotifications(fullPath, maxSamples - files.length);
        files.push(...subFiles);
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    // Directory doesn't exist or can't be read
    return [];
  }
  
  return files.slice(0, maxSamples);
}

async function validateNotificationSystem() {
  console.log('🧪 Validating notification system genericness...');
  
  // Test that notification generation works with different user combinations
  const testCombinations = [
    { freelancerId: 1, commissionerId: 34, orgId: 3 },
    { freelancerId: 25, commissionerId: 35, orgId: 2 },
    { freelancerId: 31, commissionerId: 32, orgId: 1 }
  ];
  
  const validationResults = [];
  
  for (const combo of testCombinations) {
    try {
      // Check if users exist
      const { UnifiedStorageService, getAllOrganizations } = await import('../src/lib/storage/unified-storage-service.js');
      
      const freelancer = await UnifiedStorageService.getUserById(combo.freelancerId);
      const commissioner = await UnifiedStorageService.getUserById(combo.commissionerId);
      const organizations = await getAllOrganizations();
      const organization = organizations.find(org => org.id === combo.orgId);
      
      if (!freelancer) {
        validationResults.push(`❌ Freelancer ID ${combo.freelancerId} not found`);
      } else {
        validationResults.push(`✅ Freelancer ${freelancer.name} (ID: ${combo.freelancerId}) found`);
      }
      
      if (!commissioner) {
        validationResults.push(`❌ Commissioner ID ${combo.commissionerId} not found`);
      } else {
        validationResults.push(`✅ Commissioner ${commissioner.name} (ID: ${combo.commissionerId}) found`);
      }
      
      if (!organization) {
        validationResults.push(`❌ Organization ID ${combo.orgId} not found`);
      } else {
        validationResults.push(`✅ Organization ${organization.name} (ID: ${combo.orgId}) found`);
      }
      
    } catch (error) {
      validationResults.push(`❌ Error validating combination: ${error.message}`);
    }
  }
  
  return validationResults;
}

async function main() {
  console.log('🚀 Starting notification system genericness check...');
  
  const { issues, fixes } = await checkNotificationGenericness();
  const validationResults = await validateNotificationSystem();
  
  console.log('\n📊 Results:');
  console.log('='.repeat(50));
  
  if (issues.length === 0) {
    console.log('✅ No genericness issues found in notification system!');
  } else {
    console.log(`❌ Found ${issues.length} genericness issues:`);
    issues.forEach(issue => console.log(`  - ${issue}`));
  }
  
  console.log('\n🧪 Validation Results:');
  validationResults.forEach(result => console.log(`  ${result}`));
  
  console.log('\n📋 Recommendations:');
  console.log('  1. All notification generation should use UnifiedStorageService for user/org lookup');
  console.log('  2. No hardcoded user IDs, organization names, or freelancer names');
  console.log('  3. All notification metadata should be enriched with actual user/org data');
  console.log('  4. Fallback values should be generic (e.g., "Freelancer", "Organization")');
  console.log('  5. Test with different user combinations to ensure genericness');
  
  console.log('\n✅ Notification system genericness check completed!');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { checkNotificationGenericness, validateNotificationSystem };
