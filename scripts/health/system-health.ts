#!/usr/bin/env tsx

/**
 * System Health Check Script
 * 
 * Validates the milestone-based invoicing system health with terminal output
 * showing green/red checks for route, storage, and test configuration.
 */

import fs from 'node:fs';
import path from 'node:path';

interface HealthCheck {
  name: string;
  status: 'PASS' | 'FAIL';
  details?: string;
  error?: string;
}

function log(ok: boolean, label: string, extra?: string): boolean {
  const icon = ok ? '✅' : '❌';
  console.log(`${icon} ${label}${extra ? ` — ${extra}` : ''}`);
  return ok;
}

async function checkRouteFile(): Promise<HealthCheck> {
  const routePath = path.join(process.cwd(), 'src/app/api/gigs/create/route.ts');
  
  try {
    const exists = fs.existsSync(routePath);
    if (!exists) {
      return {
        name: 'Route file exists',
        status: 'FAIL',
        error: 'Route file not found'
      };
    }

    // Check if route exports POST function
    const content = fs.readFileSync(routePath, 'utf8');
    const hasPostExport = content.includes('export async function POST');
    
    if (!hasPostExport) {
      return {
        name: 'Route file exports POST',
        status: 'FAIL',
        error: 'POST function not exported'
      };
    }

    return {
      name: 'Route file exists and exports POST',
      status: 'PASS',
      details: 'src/app/api/gigs/create/route.ts'
    };
  } catch (error) {
    return {
      name: 'Route file check',
      status: 'FAIL',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function checkAuthBypass(): Promise<HealthCheck> {
  const routePath = path.join(process.cwd(), 'src/app/api/gigs/create/route.ts');
  
  try {
    const content = fs.readFileSync(routePath, 'utf8');
    const hasTestBypass = content.includes('TEST_BYPASS_AUTH') || content.includes('NODE_ENV === \'test\'');
    
    if (!hasTestBypass) {
      return {
        name: 'Auth bypass enabled in test mode',
        status: 'FAIL',
        error: 'No test authentication bypass found'
      };
    }

    return {
      name: 'Auth bypass enabled in test mode',
      status: 'PASS',
      details: 'TEST_BYPASS_AUTH or NODE_ENV check found'
    };
  } catch (error) {
    return {
      name: 'Auth bypass check',
      status: 'FAIL',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function checkGigsIndex(): Promise<HealthCheck> {
  const indexPath = path.join(process.cwd(), 'data/gigs-index.json');
  
  try {
    // Create if missing
    if (!fs.existsSync(indexPath)) {
      const dataDir = path.dirname(indexPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.writeFileSync(indexPath, '{}');
    }

    // Test read/write
    const content = fs.readFileSync(indexPath, 'utf8');
    JSON.parse(content); // Validate JSON
    
    // Test write
    const testData = { test: 'health-check' };
    fs.writeFileSync(indexPath, JSON.stringify(testData));
    fs.writeFileSync(indexPath, content); // Restore original

    return {
      name: 'gigs-index.json accessible',
      status: 'PASS',
      details: 'Read/write operations successful'
    };
  } catch (error) {
    return {
      name: 'gigs-index.json accessible',
      status: 'FAIL',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function checkHierarchicalStorage(): Promise<HealthCheck> {
  const gigsDir = path.join(process.cwd(), 'data/gigs');
  
  try {
    if (!fs.existsSync(gigsDir)) {
      fs.mkdirSync(gigsDir, { recursive: true });
    }

    // Test hierarchical directory creation
    const testYear = new Date().getFullYear();
    const testMonth = String(new Date().getMonth() + 1).padStart(2, '0');
    const testDay = String(new Date().getDate()).padStart(2, '0');
    const testDir = path.join(gigsDir, String(testYear), testMonth, testDay, 'test');
    
    fs.mkdirSync(testDir, { recursive: true });
    
    // Clean up test directory
    fs.rmSync(testDir, { recursive: true, force: true });

    return {
      name: 'Hierarchical storage structure',
      status: 'PASS',
      details: 'Directory creation/cleanup successful'
    };
  } catch (error) {
    return {
      name: 'Hierarchical storage structure',
      status: 'FAIL',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function checkRouteHandler(): Promise<HealthCheck> {
  try {
    // Set test environment
    process.env.TEST_BYPASS_AUTH = '1';
    process.env.NODE_ENV = 'test';

    const routePath = path.join(process.cwd(), 'src/app/api/gigs/create/route.ts');
    
    // Dynamic import of the route handler
    const mod = await import(routePath);
    
    if (!mod.POST || typeof mod.POST !== 'function') {
      return {
        name: 'Route handler import',
        status: 'FAIL',
        error: 'POST function not found in module'
      };
    }

    // Create test payload
    const payload = {
      title: 'Health Check Gig',
      budget: 1000,
      executionMethod: 'milestone',
      commissionerId: 999,
      milestones: [
        {
          id: 'M1',
          title: 'Health Check Milestone',
          description: 'Test milestone for health check',
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }
      ]
    };

    // Create mock Request
    const request = new Request('http://localhost/api/gigs/create', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Call the handler
    const response = await mod.POST(request);
    const json = await response.json();

    const isValid = json?.success === true && typeof json?.gigId === 'number';
    
    if (!isValid) {
      return {
        name: 'Route handler execution',
        status: 'FAIL',
        error: `Invalid response: ${JSON.stringify(json)}`
      };
    }

    return {
      name: 'Route handler execution',
      status: 'PASS',
      details: `Created gig ${json.gigId}`
    };

  } catch (error) {
    return {
      name: 'Route handler execution',
      status: 'FAIL',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function checkGigPersistence(): Promise<HealthCheck> {
  try {
    const indexPath = path.join(process.cwd(), 'data/gigs-index.json');
    
    if (!fs.existsSync(indexPath)) {
      return {
        name: 'Gig persistence verification',
        status: 'FAIL',
        error: 'Gigs index not found'
      };
    }

    const indexContent = fs.readFileSync(indexPath, 'utf8');
    const index = JSON.parse(indexContent);
    
    // Find the most recent gig (health check gig)
    const gigIds = Object.keys(index);
    if (gigIds.length === 0) {
      return {
        name: 'Gig persistence verification',
        status: 'FAIL',
        error: 'No gigs found in index'
      };
    }

    const latestGigId = Math.max(...gigIds.map(Number));
    const gigEntry = index[String(latestGigId)];
    
    if (!gigEntry || !gigEntry.path) {
      return {
        name: 'Gig persistence verification',
        status: 'FAIL',
        error: 'Invalid gig entry in index'
      };
    }

    // Check if gig file exists at hierarchical path
    const gigFilePath = path.join(process.cwd(), 'data/gigs', gigEntry.path, 'gig.json');
    
    if (!fs.existsSync(gigFilePath)) {
      return {
        name: 'Gig persistence verification',
        status: 'FAIL',
        error: `Gig file not found at ${gigEntry.path}`
      };
    }

    // Validate gig content
    const gigContent = fs.readFileSync(gigFilePath, 'utf8');
    const gig = JSON.parse(gigContent);
    
    if (!gig.milestones || gig.milestones.length === 0) {
      return {
        name: 'Gig persistence verification',
        status: 'FAIL',
        error: 'Milestones not persisted correctly'
      };
    }

    return {
      name: 'Gig persistence verification',
      status: 'PASS',
      details: `Gig ${latestGigId} persisted at ${gigEntry.path}`
    };

  } catch (error) {
    return {
      name: 'Gig persistence verification',
      status: 'FAIL',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function main() {
  console.log('🔍 System Health Check - Milestone-Based Invoicing\n');
  
  const checks: HealthCheck[] = [];
  let allPassed = true;

  // Run all health checks
  checks.push(await checkRouteFile());
  checks.push(await checkAuthBypass());
  checks.push(await checkGigsIndex());
  checks.push(await checkHierarchicalStorage());
  checks.push(await checkRouteHandler());
  checks.push(await checkGigPersistence());

  // Display results
  for (const check of checks) {
    const passed = log(check.status === 'PASS', check.name, check.details || check.error);
    if (!passed) allPassed = false;
  }

  // Summary
  console.log('\n—— System Health Summary ——');
  const passedCount = checks.filter(c => c.status === 'PASS').length;
  const totalCount = checks.length;
  
  if (allPassed) {
    console.log('🟢 ALL CHECKS PASS');
    console.log(`✅ ${passedCount}/${totalCount} checks successful`);
  } else {
    console.log('🔴 CHECKS FAILED');
    console.log(`❌ ${passedCount}/${totalCount} checks successful`);
    
    const failedChecks = checks.filter(c => c.status === 'FAIL');
    console.log('\nFailed checks:');
    failedChecks.forEach(check => {
      console.log(`  • ${check.name}: ${check.error}`);
    });
  }

  process.exit(allPassed ? 0 : 1);
}

// Run the health check
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Health check failed:', error);
    process.exit(1);
  });
}
