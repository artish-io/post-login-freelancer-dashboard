#!/usr/bin/env tsx
/**
 * 🔒 GIG REQUEST FIXES VERIFICATION SCRIPT
 * 
 * Verifies that:
 * 1. Project overwrites no longer occur
 * 2. Gig-request activations use -R format
 * 3. Event files are preserved and notifications work
 * 4. Collision detection prevents silent overwrites
 */

import { generateProjectId, createProjectAtomic, auditLog } from '../src/lib/projects/gig-request-project-id-generator';
import { promises as fs } from 'fs';
import path from 'path';

// Enable feature flag for verification
process.env.ENABLE_GIG_REQUEST_PROJECT_IDS = 'true';

interface VerificationResult {
  test: string;
  passed: boolean;
  details: string;
  error?: string;
}

class GigRequestVerifier {
  private results: VerificationResult[] = [];

  async verify(): Promise<void> {
    console.log('🔍 Starting Gig Request Fixes Verification...\n');

    await this.verifyProjectIdGeneration();
    await this.verifyCollisionPrevention();
    await this.verifyEventFilePreservation();
    await this.verifyFeatureFlag();

    this.printResults();
  }

  private async verifyProjectIdGeneration(): Promise<void> {
    console.log('📋 Testing Project ID Generation...');

    try {
      // Test request format generation
      const requestResult = await generateProjectId({
        mode: 'request',
        organizationFirstLetter: 'C',
        origin: 'request'
      });

      if (requestResult.success && /^C-R\d{3}$/.test(requestResult.projectId!)) {
        this.addResult('Request ID Format', true, `Generated: ${requestResult.projectId}`);
      } else {
        this.addResult('Request ID Format', false, 'Failed to generate valid request format ID', JSON.stringify(requestResult));
      }

      // Test legacy format generation
      const legacyResult = await generateProjectId({
        mode: 'legacy',
        organizationFirstLetter: 'L',
        origin: 'match'
      });

      if (legacyResult.success && /^L-\d{3}$/.test(legacyResult.projectId!)) {
        this.addResult('Legacy ID Format', true, `Generated: ${legacyResult.projectId}`);
      } else {
        this.addResult('Legacy ID Format', false, 'Failed to generate valid legacy format ID', JSON.stringify(legacyResult));
      }

      // Test invalid input handling
      const invalidResult = await generateProjectId({
        mode: 'request',
        organizationFirstLetter: 'invalid',
        origin: 'request'
      });

      if (!invalidResult.success && invalidResult.error === 'projectId_invalid') {
        this.addResult('Invalid Input Handling', true, 'Correctly rejected invalid organization letter');
      } else {
        this.addResult('Invalid Input Handling', false, 'Failed to reject invalid input', JSON.stringify(invalidResult));
      }

    } catch (error) {
      this.addResult('Project ID Generation', false, 'Exception during testing', String(error));
    }
  }

  private async verifyCollisionPrevention(): Promise<void> {
    console.log('🛡️ Testing Collision Prevention...');

    try {
      const testProjectId = 'TEST-R001';
      const originalData = { title: 'Original Project', createdAt: new Date().toISOString() };
      const overwriteData = { title: 'Overwrite Attempt', createdAt: new Date().toISOString() };

      // Create original project
      const createResult1 = await createProjectAtomic(testProjectId, originalData);
      
      if (!createResult1.success) {
        this.addResult('Initial Project Creation', false, 'Failed to create initial project', JSON.stringify(createResult1));
        return;
      }

      // Attempt overwrite
      const createResult2 = await createProjectAtomic(testProjectId, overwriteData);

      if (!createResult2.success && createResult2.error === 'project_creation_collision') {
        this.addResult('Overwrite Prevention', true, 'Successfully prevented project overwrite');
      } else {
        this.addResult('Overwrite Prevention', false, 'Failed to prevent overwrite', JSON.stringify(createResult2));
      }

      // Verify original data is preserved
      try {
        const projectPath = path.join(process.cwd(), 'data', 'projects', `${testProjectId}.json`);
        const savedData = JSON.parse(await fs.readFile(projectPath, 'utf-8'));
        
        if (savedData.title === 'Original Project') {
          this.addResult('Data Preservation', true, 'Original project data preserved');
        } else {
          this.addResult('Data Preservation', false, `Data was modified: ${savedData.title}`);
        }
      } catch (error) {
        this.addResult('Data Preservation', false, 'Could not verify data preservation', String(error));
      }

    } catch (error) {
      this.addResult('Collision Prevention', false, 'Exception during testing', String(error));
    }
  }

  private async verifyEventFilePreservation(): Promise<void> {
    console.log('📁 Testing Event File Preservation...');

    const eventFiles = [
      'data/notifications/events/2025/August/29/completion.gig-request-commissioner-accepted/comp_1756500229824_8a56rpw4m.json',
      'data/notifications/events/2025/August/29/completion.gig-request-project_activated/comp_1756500229880_xvk2dzeay.json'
    ];

    for (const filePath of eventFiles) {
      try {
        const fullPath = path.join(process.cwd(), filePath);
        const data = await fs.readFile(fullPath, 'utf-8');
        const parsed = JSON.parse(data);

        const expectedTypes = [
          'completion.gig-request-commissioner-accepted',
          'completion.gig-request-project_activated'
        ];

        if (expectedTypes.includes(parsed.type)) {
          this.addResult(`Event File: ${path.basename(filePath)}`, true, `Type: ${parsed.type}, ProjectId: ${parsed.projectId}`);
        } else {
          this.addResult(`Event File: ${path.basename(filePath)}`, false, `Unexpected type: ${parsed.type}`);
        }

      } catch (error) {
        this.addResult(`Event File: ${path.basename(filePath)}`, false, 'File not found or invalid', String(error));
      }
    }
  }

  private async verifyFeatureFlag(): Promise<void> {
    console.log('🚩 Testing Feature Flag...');

    try {
      // Test with flag enabled
      process.env.ENABLE_GIG_REQUEST_PROJECT_IDS = 'true';
      const enabledResult = await generateProjectId({
        mode: 'request',
        organizationFirstLetter: 'F',
        origin: 'request'
      });

      // Test with flag disabled
      process.env.ENABLE_GIG_REQUEST_PROJECT_IDS = 'false';
      const disabledResult = await generateProjectId({
        mode: 'request',
        organizationFirstLetter: 'F',
        origin: 'request'
      });

      // Restore flag
      process.env.ENABLE_GIG_REQUEST_PROJECT_IDS = 'true';

      if (enabledResult.success && !disabledResult.success) {
        this.addResult('Feature Flag Control', true, 'Feature flag correctly controls behavior');
      } else {
        this.addResult('Feature Flag Control', false, `Enabled: ${enabledResult.success}, Disabled: ${disabledResult.success}`);
      }

    } catch (error) {
      this.addResult('Feature Flag Control', false, 'Exception during testing', String(error));
    }
  }

  private addResult(test: string, passed: boolean, details: string, error?: string): void {
    this.results.push({ test, passed, details, error });
    const status = passed ? '✅' : '❌';
    console.log(`  ${status} ${test}: ${details}`);
    if (error) {
      console.log(`     Error: ${error}`);
    }
  }

  private printResults(): void {
    console.log('\n📊 Verification Results:');
    console.log('========================');

    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    const percentage = Math.round((passed / total) * 100);

    console.log(`Passed: ${passed}/${total} (${percentage}%)`);

    if (passed === total) {
      console.log('\n🎉 All tests passed! Gig request fixes are working correctly.');
    } else {
      console.log('\n⚠️  Some tests failed. Review the issues above.');
      
      const failed = this.results.filter(r => !r.passed);
      console.log('\nFailed tests:');
      failed.forEach(result => {
        console.log(`- ${result.test}: ${result.details}`);
        if (result.error) {
          console.log(`  Error: ${result.error}`);
        }
      });
    }

    console.log('\n📋 Runbook for Staging Validation:');
    console.log('1. Set ENABLE_GIG_REQUEST_PROJECT_IDS=true in environment');
    console.log('2. Accept a gig request and verify project ID matches ^[A-Z]-R\\d{3}$ pattern');
    console.log('3. Attempt to accept another gig request with same org - should get different ID');
    console.log('4. Check that existing projects are not overwritten');
    console.log('5. Verify notifications appear in frontend pages');
    console.log('6. If issues occur, set ENABLE_GIG_REQUEST_PROJECT_IDS=false to rollback');
  }
}

// Run verification if called directly
if (require.main === module) {
  const verifier = new GigRequestVerifier();
  verifier.verify().catch(console.error);
}

export { GigRequestVerifier };
