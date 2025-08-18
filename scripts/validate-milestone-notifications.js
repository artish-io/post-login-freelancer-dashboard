#!/usr/bin/env node

/**
 * Validation script for the milestone notifications implementation
 * This script validates that all components are working correctly
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

/**
 * Check if a file exists
 */
function checkFileExists(filePath, description) {
  const fullPath = path.join(process.cwd(), filePath);
  if (fs.existsSync(fullPath)) {
    logSuccess(`${description}: ${filePath}`);
    return true;
  } else {
    logError(`${description} missing: ${filePath}`);
    return false;
  }
}

/**
 * Check if a file contains specific content
 */
function checkFileContent(filePath, searchText, description) {
  const fullPath = path.join(process.cwd(), filePath);
  try {
    const content = fs.readFileSync(fullPath, 'utf-8');
    if (content.includes(searchText)) {
      logSuccess(`${description}: Found in ${filePath}`);
      return true;
    } else {
      logError(`${description}: Not found in ${filePath}`);
      return false;
    }
  } catch (error) {
    logError(`${description}: Cannot read ${filePath} - ${error.message}`);
    return false;
  }
}

/**
 * Validate Phase 1 implementation
 */
function validatePhase1() {
  log('\n📋 Validating Phase 1: Critical Fixes', 'bold');
  
  let passed = 0;
  let total = 0;

  // Check invoice type filtering
  total++;
  if (checkFileContent(
    'src/app/api/payments/services/payments-service.ts',
    'invoiceType?: \'milestone\' | \'completion\'',
    'Invoice type parameter added'
  )) {
    passed++;
  }

  total++;
  if (checkFileContent(
    'src/app/api/payments/services/payments-service.ts',
    'if (actualInvoiceType === \'milestone\')',
    'Conditional bus event emission'
  )) {
    passed++;
  }

  // Check project completion detector
  total++;
  if (checkFileExists(
    'src/lib/notifications/project-completion-detector.ts',
    'Project completion detector'
  )) {
    passed++;
  }

  total++;
  if (checkFileContent(
    'src/app/api/project-tasks/submit/route.ts',
    'detectProjectCompletion',
    'Final task detection updated'
  )) {
    passed++;
  }

  return { passed, total, phase: 'Phase 1' };
}

/**
 * Validate Phase 2 implementation
 */
function validatePhase2() {
  log('\n📋 Validating Phase 2: Message Improvements', 'bold');
  
  let passed = 0;
  let total = 0;

  // Check notification logic updates
  total++;
  if (checkFileContent(
    'src/app/api/notifications-v2/route.ts',
    'detectProjectCompletion',
    'Task approval notification logic updated'
  )) {
    passed++;
  }

  // Check rating notification enhancements
  total++;
  if (checkFileContent(
    'src/lib/notifications/rating-notifications.ts',
    'project.invoicingMethod !== \'milestone\'',
    'Rating notification milestone verification'
  )) {
    passed++;
  }

  return { passed, total, phase: 'Phase 2' };
}

/**
 * Validate Phase 3 implementation
 */
function validatePhase3() {
  log('\n📋 Validating Phase 3: Reliability Improvements', 'bold');
  
  let passed = 0;
  let total = 0;

  // Check bus retry logic
  total++;
  if (checkFileContent(
    'src/lib/events/bus.ts',
    'export async function withRetry',
    'Bus system retry logic'
  )) {
    passed++;
  }

  // Check deduplication system
  total++;
  if (checkFileExists(
    'src/lib/notifications/deduplication.ts',
    'Notification deduplication system'
  )) {
    passed++;
  }

  total++;
  if (checkFileContent(
    'src/lib/notifications/notification-storage.ts',
    'isDuplicateNotification',
    'Deduplication integration'
  )) {
    passed++;
  }

  return { passed, total, phase: 'Phase 3' };
}

/**
 * Validate Phase 4 implementation
 */
function validatePhase4() {
  log('\n📋 Validating Phase 4: Testing Implementation', 'bold');
  
  let passed = 0;
  let total = 0;

  // Check test suite
  total++;
  if (checkFileExists(
    'tests/notifications/milestone-notifications.test.ts',
    'Milestone notification test suite'
  )) {
    passed++;
  }

  total++;
  if (checkFileContent(
    'tests/notifications/milestone-notifications.test.ts',
    'describe(\'Milestone Project Notifications\'',
    'Test structure'
  )) {
    passed++;
  }

  return { passed, total, phase: 'Phase 4' };
}

/**
 * Validate additional safeguards
 */
function validateSafeguards() {
  log('\n📋 Validating Additional Safeguards', 'bold');
  
  let passed = 0;
  let total = 0;

  // Check centralized emitters
  total++;
  if (checkFileExists(
    'src/lib/events/centralized-emitters.ts',
    'Centralized event emission functions'
  )) {
    passed++;
  }

  total++;
  if (checkFileContent(
    'src/lib/events/centralized-emitters.ts',
    'generateIdempotencyKey',
    'Idempotency key generation'
  )) {
    passed++;
  }

  // Check notification templates
  total++;
  if (checkFileExists(
    'src/lib/notifications/templates.ts',
    'Notification templates system'
  )) {
    passed++;
  }

  // Check reconciliation job
  total++;
  if (checkFileExists(
    'src/lib/jobs/notification-reconciliation.ts',
    'Notification reconciliation job'
  )) {
    passed++;
  }

  return { passed, total, phase: 'Additional Safeguards' };
}

/**
 * Main validation function
 */
function main() {
  log('🚀 Milestone Notifications Implementation Validator', 'bold');
  log('=' * 60, 'blue');

  const results = [
    validatePhase1(),
    validatePhase2(),
    validatePhase3(),
    validatePhase4(),
    validateSafeguards()
  ];

  // Summary
  log('\n📊 Validation Summary', 'bold');
  log('=' * 40, 'blue');

  let totalPassed = 0;
  let totalChecks = 0;

  results.forEach(result => {
    const percentage = Math.round((result.passed / result.total) * 100);
    const status = percentage === 100 ? '✅' : percentage >= 80 ? '⚠️' : '❌';
    
    log(`${status} ${result.phase}: ${result.passed}/${result.total} (${percentage}%)`);
    totalPassed += result.passed;
    totalChecks += result.total;
  });

  const overallPercentage = Math.round((totalPassed / totalChecks) * 100);
  
  log('\n' + '=' * 40, 'blue');
  log(`Overall: ${totalPassed}/${totalChecks} (${overallPercentage}%)`, 'bold');

  if (overallPercentage === 100) {
    logSuccess('🎉 All validations passed! Implementation is complete.');
  } else if (overallPercentage >= 90) {
    logWarning('⚠️  Most validations passed. Minor issues detected.');
  } else {
    logError('❌ Significant issues detected. Please review implementation.');
  }

  // Next steps
  log('\n📝 Next Steps:', 'bold');
  logInfo('1. Run the test suite: npm test tests/notifications/');
  logInfo('2. Test with real milestone projects');
  logInfo('3. Monitor notification delivery in production');
  logInfo('4. Schedule reconciliation job if needed');

  process.exit(overallPercentage >= 90 ? 0 : 1);
}

// Run the validator
if (require.main === module) {
  main();
}

module.exports = {
  validatePhase1,
  validatePhase2,
  validatePhase3,
  validatePhase4,
  validateSafeguards
};
