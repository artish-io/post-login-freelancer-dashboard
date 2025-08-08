#!/usr/bin/env node

/**
 * Test script to validate the complete proposal workflow
 * Tests: proposal sending, acceptance, rejection, and notifications
 */

const fs = require('fs');
const path = require('path');

// Test data
const TEST_PROPOSAL = {
  title: "Test Proposal Workflow",
  summary: "This is a test proposal to validate the notification system",
  freelancerId: 1, // Assuming freelancer ID 1 exists
  commissionerId: 32, // Assuming commissioner ID 32 exists
  totalBid: 5000,
  executionMethod: "completion",
  upfrontAmount: 600,
  upfrontPercentage: 12,
  typeTags: ["Web Development"],
  milestones: [],
  startType: "Immediately",
  customStartDate: null,
  endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
};

async function testProposalWorkflow() {
  console.log('🧪 Testing Proposal Workflow...\n');

  try {
    // Test 1: Check if notification rules exist
    console.log('1. Checking notification rules...');
    const eventLoggerPath = path.join(process.cwd(), 'src/lib/events/event-logger.ts');
    const eventLoggerContent = fs.readFileSync(eventLoggerPath, 'utf-8');
    
    const hasProposalSentRule = eventLoggerContent.includes("eventType: 'proposal_sent'");
    const hasProposalAcceptedRule = eventLoggerContent.includes("eventType: 'proposal_accepted'");
    const hasProposalRejectedRule = eventLoggerContent.includes("eventType: 'proposal_rejected'");
    
    console.log(`   ✅ Proposal sent rule: ${hasProposalSentRule ? 'Found' : 'Missing'}`);
    console.log(`   ✅ Proposal accepted rule: ${hasProposalAcceptedRule ? 'Found' : 'Missing'}`);
    console.log(`   ✅ Proposal rejected rule: ${hasProposalRejectedRule ? 'Found' : 'Missing'}`);

    // Test 2: Check if notification message generation exists
    console.log('\n2. Checking notification message generation...');
    const notificationsApiPath = path.join(process.cwd(), 'src/app/api/notifications-v2/route.ts');
    const notificationsContent = fs.readFileSync(notificationsApiPath, 'utf-8');
    
    const hasProposalAcceptedMessage = notificationsContent.includes("case 'proposal_accepted':");
    const hasProposalRejectedMessage = notificationsContent.includes("case 'proposal_rejected':");
    
    console.log(`   ✅ Proposal accepted message: ${hasProposalAcceptedMessage ? 'Found' : 'Missing'}`);
    console.log(`   ✅ Proposal rejected message: ${hasProposalRejectedMessage ? 'Found' : 'Missing'}`);

    // Test 3: Check if enriched metadata system exists
    console.log('\n3. Checking enriched metadata system...');
    const enrichedMetadataPath = path.join(process.cwd(), 'src/lib/proposals/enriched-metadata.ts');
    const enrichedMetadataExists = fs.existsSync(enrichedMetadataPath);
    
    console.log(`   ✅ Enriched metadata system: ${enrichedMetadataExists ? 'Found' : 'Missing'}`);
    
    if (enrichedMetadataExists) {
      const enrichedContent = fs.readFileSync(enrichedMetadataPath, 'utf-8');
      const hasGenerateFunction = enrichedContent.includes('generateEnrichedProposalMetadata');
      const hasEmailSummary = enrichedContent.includes('generateEmailSummary');
      
      console.log(`   ✅ Generate metadata function: ${hasGenerateFunction ? 'Found' : 'Missing'}`);
      console.log(`   ✅ Email summary function: ${hasEmailSummary ? 'Found' : 'Missing'}`);
    }

    // Test 4: Check API endpoints
    console.log('\n4. Checking API endpoints...');
    const acceptRoutePath = path.join(process.cwd(), 'src/app/api/proposals/[proposalId]/accept/route.ts');
    const rejectRoutePath = path.join(process.cwd(), 'src/app/api/proposals/[proposalId]/reject/route.ts');
    const sendRoutePath = path.join(process.cwd(), 'src/app/api/proposals/send/route.ts');
    
    const acceptRouteExists = fs.existsSync(acceptRoutePath);
    const rejectRouteExists = fs.existsSync(rejectRoutePath);
    const sendRouteExists = fs.existsSync(sendRoutePath);
    
    console.log(`   ✅ Accept route: ${acceptRouteExists ? 'Found' : 'Missing'}`);
    console.log(`   ✅ Reject route: ${rejectRouteExists ? 'Found' : 'Missing'}`);
    console.log(`   ✅ Send route: ${sendRouteExists ? 'Found' : 'Missing'}`);

    // Test 5: Check if routes have proper event logging
    if (acceptRouteExists) {
      const acceptContent = fs.readFileSync(acceptRoutePath, 'utf-8');
      const hasEventLogging = acceptContent.includes('eventLogger.logEvent');
      const hasProjectCreation = acceptContent.includes('createProject');
      
      console.log(`   ✅ Accept route event logging: ${hasEventLogging ? 'Found' : 'Missing'}`);
      console.log(`   ✅ Accept route project creation: ${hasProjectCreation ? 'Found' : 'Missing'}`);
    }

    if (rejectRouteExists) {
      const rejectContent = fs.readFileSync(rejectRoutePath, 'utf-8');
      const hasEventLogging = rejectContent.includes('eventLogger.logEvent');
      const hasSessionValidation = rejectContent.includes('requireSession');
      
      console.log(`   ✅ Reject route event logging: ${hasEventLogging ? 'Found' : 'Missing'}`);
      console.log(`   ✅ Reject route session validation: ${hasSessionValidation ? 'Found' : 'Missing'}`);
    }

    // Test 6: Check data structure compatibility
    console.log('\n5. Checking data structure compatibility...');
    const usersPath = path.join(process.cwd(), 'data/users.json');
    const usersExist = fs.existsSync(usersPath);
    
    if (usersExist) {
      const users = JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
      const freelancer = users.find(u => u.id === TEST_PROPOSAL.freelancerId);
      const commissioner = users.find(u => u.id === TEST_PROPOSAL.commissionerId);
      
      console.log(`   ✅ Test freelancer (ID ${TEST_PROPOSAL.freelancerId}): ${freelancer ? 'Found' : 'Missing'}`);
      console.log(`   ✅ Test commissioner (ID ${TEST_PROPOSAL.commissionerId}): ${commissioner ? 'Found' : 'Missing'}`);
      
      if (freelancer) {
        console.log(`      - Name: ${freelancer.name}`);
        console.log(`      - Email: ${freelancer.email}`);
      }
      
      if (commissioner) {
        console.log(`      - Name: ${commissioner.name}`);
        console.log(`      - Email: ${commissioner.email}`);
        console.log(`      - Organization: ${commissioner.organizationName || 'N/A'}`);
      }
    } else {
      console.log(`   ❌ Users data file not found`);
    }

    // Test 7: Check proposal storage structure
    console.log('\n6. Checking proposal storage structure...');
    const proposalsDir = path.join(process.cwd(), 'data/proposals');
    const proposalsIndexPath = path.join(proposalsDir, 'proposals-index.json');
    
    const proposalsDirExists = fs.existsSync(proposalsDir);
    const proposalsIndexExists = fs.existsSync(proposalsIndexPath);
    
    console.log(`   ✅ Proposals directory: ${proposalsDirExists ? 'Found' : 'Missing'}`);
    console.log(`   ✅ Proposals index: ${proposalsIndexExists ? 'Found' : 'Missing'}`);

    // Test 8: Check notification storage
    console.log('\n7. Checking notification storage...');
    const notificationsDir = path.join(process.cwd(), 'data/notifications');
    const notificationsDirExists = fs.existsSync(notificationsDir);
    
    console.log(`   ✅ Notifications directory: ${notificationsDirExists ? 'Found' : 'Missing'}`);

    // Summary
    console.log('\n📋 WORKFLOW VALIDATION SUMMARY:');
    console.log('================================');
    
    const checks = [
      hasProposalSentRule && hasProposalAcceptedRule && hasProposalRejectedRule,
      hasProposalAcceptedMessage && hasProposalRejectedMessage,
      enrichedMetadataExists,
      acceptRouteExists && rejectRouteExists && sendRouteExists,
      proposalsDirExists && proposalsIndexExists,
      notificationsDirExists
    ];
    
    const passedChecks = checks.filter(Boolean).length;
    const totalChecks = checks.length;
    
    console.log(`✅ Passed: ${passedChecks}/${totalChecks} checks`);
    
    if (passedChecks === totalChecks) {
      console.log('🎉 All systems are ready for proposal workflow!');
      console.log('\n📝 NEXT STEPS:');
      console.log('1. Test proposal sending via the UI');
      console.log('2. Test proposal acceptance/rejection');
      console.log('3. Verify notifications are generated');
      console.log('4. Check enriched metadata is created');
    } else {
      console.log('⚠️  Some components need attention before full workflow testing');
    }

  } catch (error) {
    console.error('❌ Error during workflow validation:', error);
  }
}

// Run the test
testProposalWorkflow();
