# Completion Invoicing Test Suite

This directory contains comprehensive testing scripts for the completion invoicing workflow in the Artish platform.

## Overview

The completion invoicing workflow involves:
1. **Gig Creation** - Creating a gig with completion invoicing method
2. **Freelancer Matching** - Matching freelancer to activate project
3. **Upfront Payment** - 12% of budget paid upfront
4. **Task Completion** - All tasks must be approved
5. **Completion Payment** - 88% of budget paid upon completion

## Scripts

### 1. `test-completion-invoicing-workflow.js`
**Main test script** that validates the entire completion invoicing flow end-to-end.

**Features:**
- Creates test gig with completion invoicing
- Simulates freelancer application and matching
- Tests upfront invoice generation (12% of budget)
- Simulates upfront payment processing
- Tests task approval workflow
- Tests completion invoice generation (88% of budget)
- Validates data integrity across all systems
- Generates comprehensive test reports

**Usage:**
```bash
node scripts/test-completion-invoicing-workflow.js
```

### 2. `run-completion-test.sh`
**Shell script runner** that provides a convenient way to execute the test suite.

**Features:**
- Checks prerequisites (Node.js, project structure)
- Verifies development server is running
- Sets up environment variables
- Runs the test suite with proper error handling
- Reports results and saves to test-reports directory

**Usage:**
```bash
./scripts/run-completion-test.sh
```

### 3. `validate-completion-invoicing.js`
**Data validation utility** that checks existing completion invoicing data for consistency.

**Features:**
- Scans all completion-based projects
- Validates project structure and required fields
- Checks invoice amounts and relationships
- Validates task completion logic
- Reports errors and warnings
- Provides recommendations for fixes

**Usage:**
```bash
node scripts/validate-completion-invoicing.js
```

## Test Configuration

The test suite uses the following default configuration:

```javascript
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  testCommissionerId: 31,
  testFreelancerId: 1,
  testBudget: 5000,
  testGigTitle: 'Test Completion Invoicing Workflow',
  testProjectTasks: 3,
  timeout: 30000
};
```

You can override these by setting environment variables:
- `NEXTAUTH_URL` - Base URL for API calls
- `TEST_COMMISSIONER_ID` - Commissioner user ID for testing
- `TEST_FREELANCER_ID` - Freelancer user ID for testing
- `TEST_BUDGET` - Budget amount for test gig

## Expected Behavior

### Successful Test Flow:
1. ✅ Gig created with completion invoicing method
2. ✅ Freelancer application submitted
3. ✅ Freelancer matched and project activated
4. ✅ Upfront invoice generated for $600 (12% of $5000)
5. ✅ Upfront payment processed successfully
6. ✅ All tasks approved by commissioner
7. ✅ Completion invoice generated for $4400 (88% of $5000)
8. ✅ Data integrity validated across all systems

### Common Issues and Breakages:

#### 1. **Gig Creation Failures**
- **Symptom**: API returns error during gig creation
- **Possible Causes**: 
  - Invalid organization data
  - Missing required fields
  - Database connection issues
- **Check**: Validate gig creation API endpoint and data schema

#### 2. **Freelancer Matching Failures**
- **Symptom**: Project not created after matching
- **Possible Causes**:
  - Missing application data
  - Project activation logic broken
  - Task generation issues
- **Check**: Review project activation service and task creation logic

#### 3. **Upfront Invoice Issues**
- **Symptom**: Wrong amount or invoice not generated
- **Possible Causes**:
  - Incorrect percentage calculation (should be 12%)
  - Missing project budget data
  - Invoice generation service broken
- **Check**: Validate upfront invoice generation logic

#### 4. **Task Approval Workflow Issues**
- **Symptom**: Tasks not approving or completion not triggering
- **Possible Causes**:
  - Task status not updating correctly
  - Transaction service failures
  - Project completion detection broken
- **Check**: Review task approval and project completion services

#### 5. **Completion Invoice Issues**
- **Symptom**: Wrong amount or invoice not generated
- **Possible Causes**:
  - Incorrect percentage calculation (should be 88%)
  - Project completion not detected
  - Auto-generation logic broken
- **Check**: Validate completion invoice auto-generation logic

#### 6. **Data Integrity Issues**
- **Symptom**: Inconsistent data across systems
- **Possible Causes**:
  - Race conditions in concurrent operations
  - Failed atomic transactions
  - Storage system inconsistencies
- **Check**: Review transaction service and data consistency

## Test Reports

Test results are saved to the `test-reports/` directory with timestamps:
- `completion-invoicing-YYYY-MM-DDTHH-mm-ss.json` - Detailed test results
- Contains test configuration, state, and comprehensive analysis

## Prerequisites

1. **Development Server Running**: The test suite requires the Next.js development server to be running on `localhost:3000`
2. **Test Data**: Ensure test users (commissioner ID 31, freelancer ID 1) exist in the system
3. **Clean State**: For best results, run tests with a clean database state

## Integration with CI/CD

These scripts can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions step
- name: Run Completion Invoicing Tests
  run: |
    npm run dev &
    sleep 10  # Wait for server to start
    ./scripts/run-completion-test.sh
    kill %1   # Stop dev server
```

## Troubleshooting

### Server Not Running
```bash
# Start the development server
npm run dev
```

### Permission Issues
```bash
# Make scripts executable
chmod +x scripts/*.sh
```

### Environment Issues
```bash
# Set environment variables
export NEXTAUTH_URL="http://localhost:3000"
export TEST_COMMISSIONER_ID="31"
export TEST_FREELANCER_ID="1"
```

## Contributing

When modifying the completion invoicing workflow:
1. Run the test suite before and after changes
2. Update test expectations if business logic changes
3. Add new test cases for new features
4. Ensure all tests pass before merging

## Support

For issues with the test suite or completion invoicing workflow:
1. Check the test reports for detailed error information
2. Run the validation script to check data integrity
3. Review the API endpoints and business logic
4. Consult the development team for complex issues
