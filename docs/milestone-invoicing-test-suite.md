# Comprehensive Milestone-Based Invoicing Test Suite

## Overview

This test suite provides comprehensive validation of the milestone-based invoicing workflow in the Artish platform. It tests the complete flow from gig creation through project activation to payment execution, identifying breakages without fixing them.

## What It Tests

### 1. **Data Integrity & Prerequisites**
- Validates required data files exist
- Checks test user accounts and roles
- Verifies system configuration

### 2. **Gig Creation with Milestone Invoicing**
- Creates a test gig with milestone invoicing method
- Validates gig storage in hierarchical structure
- Checks milestone data preservation

### 3. **Freelancer Matching & Project Activation**
- Tests freelancer matching API
- Validates project creation from gig
- Checks task generation for milestones
- Verifies gig status updates

### 4. **Task Workflow**
- Tests task submission by freelancer
- Tests task approval by commissioner
- Validates automatic milestone invoice generation
- Checks task status transitions

### 5. **Payment Execution**
- Tests milestone payment processing
- Validates invoice status updates
- Checks payment amount validation

### 6. **Wallet Balance Updates**
- Verifies freelancer wallet crediting
- Checks lifetime earnings tracking
- Validates transaction history

### 7. **Data Consistency**
- Cross-validates data across storage systems
- Checks project-task-invoice relationships
- Verifies milestone data integrity

### 8. **Invoice Storage Integrity**
- Validates invoice structure and fields
- Checks invoice type and method preservation
- Verifies hierarchical storage

### 9. **Edge Cases & Error Handling**
- Tests duplicate operation prevention
- Validates authorization checks
- Checks error responses

## How to Run

### Command Line
```bash
# Run the complete test suite
npm run test:milestone-invoicing

# Or directly with tsx
npx tsx scripts/test-milestone-invoicing.ts
```

### API Endpoint
```bash
# Run via API (useful for CI/CD)
curl -X GET http://localhost:3000/api/admin/test-milestone-invoicing

# Run with filtering (future enhancement)
curl -X POST http://localhost:3000/api/admin/test-milestone-invoicing \
  -H "Content-Type: application/json" \
  -d '{"categories": ["gig-creation", "payment"], "includeDetails": true}'
```

## Test Configuration

The test uses these default values (configurable in `TEST_CONFIG`):

```typescript
const TEST_CONFIG = {
  freelancerId: 31,        // Test freelancer user ID
  commissionerId: 32,      // Test commissioner user ID
  testGigId: 9999,        // Generated during test
  testProjectId: 9999,    // Generated during test
  testTaskId: 9999,       // Generated during test
  baseUrl: 'http://localhost:3000'
};
```

## Prerequisites

1. **Development server running** on port 3000
2. **Test users exist** in `data/users.json`:
   - User ID 31 with role "freelancer"
   - User ID 32 with role "commissioner"
3. **Required data directories** exist:
   - `data/gigs/`
   - `data/projects/`
   - `data/invoices/`
   - `data/wallets/`

## Output Format

The test generates a comprehensive report including:

### Summary
- Total tests run
- Pass/fail/error counts
- Success rate percentage

### Detailed Results
- Individual test status
- Specific breakages found
- Recommendations for fixes

### Critical Breakages
- High-priority issues affecting core functionality
- API failures and data inconsistencies

### System Recommendations
- Infrastructure improvements
- Monitoring suggestions
- Security enhancements

## Example Output

```
🧪 COMPREHENSIVE MILESTONE-BASED INVOICING TEST REPORT
================================================================================

📊 TEST SUMMARY:
Total Tests: 11
✅ Passed: 8
❌ Failed: 2
🚨 Errors: 1
Success Rate: 73%

📋 DETAILED TEST RESULTS:
1. ✅ Data Integrity Check: PASS
2. ✅ System Prerequisites: PASS
3. ❌ Milestone Gig Creation: FAIL
   Breakages:
   - Gig creation API failed: Missing organization data
   Recommendations:
   - Check gig creation API implementation and validation

🚨 CRITICAL BREAKAGES:
1. Gig creation API failed: Missing organization data
2. Milestone invoice not generated during task approval

💡 SYSTEM-WIDE RECOMMENDATIONS:
1. Implement comprehensive integration tests in CI/CD pipeline
2. Add monitoring for milestone invoice generation
3. Implement data consistency checks across storage systems
```

## Integration with CI/CD

Add to your CI/CD pipeline:

```yaml
- name: Run Milestone Invoicing Tests
  run: npm run test:milestone-invoicing
  continue-on-error: true  # Don't fail build, just report issues
```

## Troubleshooting

### Common Issues

1. **"Test freelancer not found"**
   - Add user with ID 31 and role "freelancer" to `data/users.json`

2. **"API endpoint not found"**
   - Ensure development server is running
   - Check that all required API endpoints are implemented

3. **"Missing storage directory"**
   - Create required directories in `data/` folder
   - Ensure proper permissions

### Debug Mode

Set environment variable for verbose logging:
```bash
DEBUG=milestone-test npm run test:milestone-invoicing
```

## Contributing

When adding new tests:

1. Follow the existing test structure
2. Add breakage detection without auto-fixing
3. Provide specific recommendations
4. Update this documentation
5. Test both success and failure scenarios
