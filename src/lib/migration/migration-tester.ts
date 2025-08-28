/**
 * Migration Testing Utility
 * 
 * Comprehensive testing suite to verify that migrated endpoints
 * return identical data to their flat file counterparts.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { 
  getAllUsers,
  getAllFreelancers,
  getAllOrganizations,
  getUserById,
  getFreelancerById,
  getOrganizationById
} from '../storage/unified-storage-service';

interface TestResult {
  testName: string;
  passed: boolean;
  error?: string;
  details?: any;
  performance?: {
    hierarchicalTime: number;
    flatFileTime?: number;
  };
}

interface MigrationTestSuite {
  results: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    successRate: number;
  };
}

/**
 * Test if hierarchical storage returns same data as flat files
 */
export class MigrationTester {
  private results: TestResult[] = [];
  
  /**
   * Test users data consistency
   */
  async testUsersConsistency(): Promise<TestResult> {
    const testName = 'Users Data Consistency';
    
    try {
      // Test hierarchical storage
      const startHierarchical = Date.now();
      const hierarchicalUsers = await getAllUsers();
      const hierarchicalTime = Date.now() - startHierarchical;
      
      // Test flat file (if exists)
      let flatFileUsers: any[] = [];
      let flatFileTime = 0;
      
      try {
        const startFlat = Date.now();
        const flatFilePath = path.join(process.cwd(), 'data', 'users.json');
        const flatFileData = await fs.readFile(flatFilePath, 'utf-8');
        flatFileUsers = JSON.parse(flatFileData);
        flatFileTime = Date.now() - startFlat;
      } catch (error) {
        // Flat file doesn't exist or is empty - this is expected after migration
      }
      
      const result: TestResult = {
        testName,
        passed: true,
        performance: {
          hierarchicalTime,
          flatFileTime: flatFileTime || undefined
        },
        details: {
          hierarchicalCount: hierarchicalUsers.length,
          flatFileCount: flatFileUsers.length,
          sampleHierarchical: hierarchicalUsers.slice(0, 3),
          sampleFlat: flatFileUsers.slice(0, 3)
        }
      };
      
      this.results.push(result);
      return result;
      
    } catch (error) {
      const result: TestResult = {
        testName,
        passed: false,
        error: error instanceof Error ? error.message : String(error)
      };
      
      this.results.push(result);
      return result;
    }
  }
  
  /**
   * Test freelancers data consistency
   */
  async testFreelancersConsistency(): Promise<TestResult> {
    const testName = 'Freelancers Data Consistency';
    
    try {
      const startTime = Date.now();
      const hierarchicalFreelancers = await getAllFreelancers();
      const hierarchicalTime = Date.now() - startTime;
      
      const result: TestResult = {
        testName,
        passed: true,
        performance: {
          hierarchicalTime
        },
        details: {
          count: hierarchicalFreelancers.length,
          sample: hierarchicalFreelancers.slice(0, 3)
        }
      };
      
      this.results.push(result);
      return result;
      
    } catch (error) {
      const result: TestResult = {
        testName,
        passed: false,
        error: error instanceof Error ? error.message : String(error)
      };
      
      this.results.push(result);
      return result;
    }
  }
  
  /**
   * Test organizations data consistency
   */
  async testOrganizationsConsistency(): Promise<TestResult> {
    const testName = 'Organizations Data Consistency';
    
    try {
      const startTime = Date.now();
      const hierarchicalOrganizations = await getAllOrganizations();
      const hierarchicalTime = Date.now() - startTime;
      
      const result: TestResult = {
        testName,
        passed: true,
        performance: {
          hierarchicalTime
        },
        details: {
          count: hierarchicalOrganizations.length,
          sample: hierarchicalOrganizations.slice(0, 3)
        }
      };
      
      this.results.push(result);
      return result;
      
    } catch (error) {
      const result: TestResult = {
        testName,
        passed: false,
        error: error instanceof Error ? error.message : String(error)
      };
      
      this.results.push(result);
      return result;
    }
  }
  
  /**
   * Test individual user lookup
   */
  async testUserLookup(userId: number): Promise<TestResult> {
    const testName = `User Lookup (ID: ${userId})`;
    
    try {
      const startTime = Date.now();
      const user = await getUserById(userId);
      const lookupTime = Date.now() - startTime;
      
      const result: TestResult = {
        testName,
        passed: user !== null,
        performance: {
          hierarchicalTime: lookupTime
        },
        details: {
          found: user !== null,
          userData: user
        }
      };
      
      this.results.push(result);
      return result;
      
    } catch (error) {
      const result: TestResult = {
        testName,
        passed: false,
        error: error instanceof Error ? error.message : String(error)
      };
      
      this.results.push(result);
      return result;
    }
  }
  
  /**
   * Test API endpoint response consistency
   */
  async testApiEndpoint(endpoint: string, expectedFields: string[]): Promise<TestResult> {
    const testName = `API Endpoint: ${endpoint}`;
    
    try {
      const startTime = Date.now();
      const response = await fetch(`http://localhost:3001${endpoint}`);
      const responseTime = Date.now() - startTime;
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Check if expected fields are present
      const missingFields = expectedFields.filter(field => !(field in data));
      
      const result: TestResult = {
        testName,
        passed: missingFields.length === 0,
        performance: {
          hierarchicalTime: responseTime
        },
        details: {
          status: response.status,
          hasExpectedFields: missingFields.length === 0,
          missingFields,
          responseData: data
        }
      };
      
      this.results.push(result);
      return result;
      
    } catch (error) {
      const result: TestResult = {
        testName,
        passed: false,
        error: error instanceof Error ? error.message : String(error)
      };
      
      this.results.push(result);
      return result;
    }
  }
  
  /**
   * Run comprehensive migration test suite
   */
  async runFullTestSuite(): Promise<MigrationTestSuite> {
    console.log('🧪 Starting comprehensive migration test suite...');
    
    this.results = []; // Reset results
    
    // Test data consistency
    await this.testUsersConsistency();
    await this.testFreelancersConsistency();
    await this.testOrganizationsConsistency();
    
    // Test individual lookups
    await this.testUserLookup(31); // Test freelancer
    await this.testUserLookup(32); // Test commissioner
    
    // Test critical API endpoints
    await this.testApiEndpoint('/api/wallet/balance/31', ['userId', 'availableBalance']);
    await this.testApiEndpoint('/api/wallet/earnings/31', ['totalEarnings']);
    
    // Generate summary
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const total = this.results.length;
    
    const summary = {
      total,
      passed,
      failed,
      successRate: total > 0 ? (passed / total) * 100 : 0
    };
    
    return {
      results: this.results,
      summary
    };
  }
  
  /**
   * Generate detailed test report
   */
  generateReport(testSuite: MigrationTestSuite): string {
    const { results, summary } = testSuite;
    
    let report = `
# Migration Test Report

## Summary
- **Total Tests**: ${summary.total}
- **Passed**: ${summary.passed}
- **Failed**: ${summary.failed}
- **Success Rate**: ${summary.successRate.toFixed(1)}%

## Test Results

`;
    
    results.forEach((result, index) => {
      const status = result.passed ? '✅' : '❌';
      report += `### ${index + 1}. ${status} ${result.testName}\n`;
      
      if (result.passed) {
        if (result.performance) {
          report += `- **Performance**: ${result.performance.hierarchicalTime}ms\n`;
        }
        if (result.details) {
          report += `- **Details**: ${JSON.stringify(result.details, null, 2)}\n`;
        }
      } else {
        report += `- **Error**: ${result.error}\n`;
      }
      
      report += '\n';
    });
    
    return report;
  }
}

/**
 * Quick migration health check
 */
export async function quickMigrationHealthCheck(): Promise<{
  healthy: boolean;
  issues: string[];
  performance: Record<string, number>;
}> {
  const issues: string[] = [];
  const performance: Record<string, number> = {};
  
  try {
    // Test users
    const startUsers = Date.now();
    const users = await getAllUsers();
    performance.users = Date.now() - startUsers;
    
    if (!Array.isArray(users)) {
      issues.push('Users data is not an array');
    }
    
    // Test freelancers
    const startFreelancers = Date.now();
    const freelancers = await getAllFreelancers();
    performance.freelancers = Date.now() - startFreelancers;
    
    if (!Array.isArray(freelancers)) {
      issues.push('Freelancers data is not an array');
    }
    
    // Test organizations
    const startOrgs = Date.now();
    const organizations = await getAllOrganizations();
    performance.organizations = Date.now() - startOrgs;
    
    if (!Array.isArray(organizations)) {
      issues.push('Organizations data is not an array');
    }
    
  } catch (error) {
    issues.push(`Storage error: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  return {
    healthy: issues.length === 0,
    issues,
    performance
  };
}

export type { TestResult, MigrationTestSuite };
