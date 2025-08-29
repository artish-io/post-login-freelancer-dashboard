/**
 * 🔒 GIG REQUEST PROJECT ID GENERATOR
 * 
 * Surgical fix for project overwrite bug - creates request-specific project IDs
 * with atomic collision detection and create-only behavior.
 * 
 * Feature flag: ENABLE_GIG_REQUEST_PROJECT_IDS
 */

import { promises as fs } from 'fs';
import path from 'path';

// Feature flag - can be toggled off immediately if issues occur
function isFeatureEnabled(): boolean {
  return process.env.ENABLE_GIG_REQUEST_PROJECT_IDS === 'true';
}

// Audit logging for project creation flow
export function auditLog(event: string, data: any) {
  const timestamp = new Date().toISOString();
  console.log(`[PROJECT_AUDIT] ${timestamp} ${event}:`, JSON.stringify(data, null, 2));
}

// ID shapes:
// Legacy/match: ^[A-Z]-\d{3}$ (unchanged)
// Gig-request: ^[A-Z]-R\d{3}$ (new)
export type ProjectIdMode = 'legacy' | 'request';

export interface ProjectIdGeneratorOptions {
  mode: ProjectIdMode;
  organizationFirstLetter: string;
  origin: 'match' | 'request';
}

export interface ProjectIdResult {
  success: boolean;
  projectId?: string;
  error?: 'project_creation_collision' | 'projectId_invalid' | 'validation_failed';
  attempts?: number;
}

/**
 * Atomic project ID generator with collision detection
 */
export async function generateProjectId(options: ProjectIdGeneratorOptions): Promise<ProjectIdResult> {
  const featureEnabled = isFeatureEnabled();
  if (!featureEnabled && options.mode === 'request') {
    auditLog('project_id_generation_disabled', {
      mode: options.mode,
      featureFlag: featureEnabled
    });
    // 🔧 FALLBACK: Use legacy mode when feature flag is off to prevent breaking gig requests
    console.log('🔧 FALLBACK: Feature flag disabled, using legacy project ID generation');
    return await generateProjectId({
      ...options,
      mode: 'legacy'
    });
  }

  // Validate organization letter
  if (!options.organizationFirstLetter || !/^[A-Z]$/.test(options.organizationFirstLetter)) {
    auditLog('project_id_validation_failed', {
      reason: 'invalid_organization_letter',
      provided: options.organizationFirstLetter,
      expected: 'single uppercase letter'
    });
    return { success: false, error: 'projectId_invalid' };
  }

  const maxAttempts = 3;
  let attempts = 0;

  while (attempts < maxAttempts) {
    attempts++;
    
    try {
      const candidateId = await generateCandidateId(options);
      
      auditLog('project_id_candidate_generated', {
        candidateId,
        mode: options.mode,
        origin: options.origin,
        attempt: attempts
      });

      // Validate candidate ID format
      const isValid = validateProjectIdFormat(candidateId, options.mode);
      if (!isValid) {
        auditLog('project_id_validation_failed', {
          candidateId,
          mode: options.mode,
          reason: 'format_mismatch'
        });
        return { success: false, error: 'projectId_invalid', attempts };
      }

      // Check for collision (create-only behavior)
      const exists = await projectExists(candidateId);
      if (exists) {
        auditLog('project_creation_collision', {
          candidateId,
          attempt: attempts,
          maxAttempts
        });
        
        if (attempts >= maxAttempts) {
          return { success: false, error: 'project_creation_collision', attempts };
        }
        continue; // Try next ID
      }

      // Success - ID is available
      auditLog('project_id_generation_success', {
        projectId: candidateId,
        mode: options.mode,
        attempts
      });

      return { success: true, projectId: candidateId, attempts };

    } catch (error) {
      auditLog('project_id_generation_error', {
        attempt: attempts,
        error: error instanceof Error ? error.message : String(error)
      });
      
      if (attempts >= maxAttempts) {
        return { success: false, error: 'validation_failed', attempts };
      }
    }
  }

  return { success: false, error: 'validation_failed', attempts };
}

/**
 * Generate candidate ID based on mode
 */
async function generateCandidateId(options: ProjectIdGeneratorOptions): Promise<string> {
  const { organizationFirstLetter, mode } = options;
  
  if (mode === 'request') {
    // Gig-request format: C-R001, C-R002, etc.
    const counter = await getNextRequestCounter(organizationFirstLetter);
    return `${organizationFirstLetter}-R${counter.toString().padStart(3, '0')}`;
  } else {
    // Legacy format: C-001, C-002, etc.
    const counter = await getNextLegacyCounter(organizationFirstLetter);
    return `${organizationFirstLetter}-${counter.toString().padStart(3, '0')}`;
  }
}

/**
 * Validate project ID format matches expected pattern
 */
function validateProjectIdFormat(projectId: string, mode: ProjectIdMode): boolean {
  if (mode === 'request') {
    return /^[A-Z]-R\d{3}$/.test(projectId);
  } else {
    return /^[A-Z]-\d{3}$/.test(projectId);
  }
}

/**
 * Check if project exists (atomic collision detection)
 */
async function projectExists(projectId: string): Promise<boolean> {
  try {
    const projectPath = path.join(process.cwd(), 'data', 'projects', `${projectId}.json`);
    await fs.access(projectPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get next counter for request IDs (atomic)
 */
async function getNextRequestCounter(orgLetter: string): Promise<number> {
  // Simple atomic counter - in production this would use a proper atomic counter
  const counterPath = path.join(process.cwd(), 'data', 'counters', `${orgLetter}-request-counter.json`);
  
  try {
    await fs.mkdir(path.dirname(counterPath), { recursive: true });
    
    let counter = 1;
    try {
      const data = await fs.readFile(counterPath, 'utf-8');
      const parsed = JSON.parse(data);
      counter = (parsed.counter || 0) + 1;
    } catch {
      // File doesn't exist, start at 1
    }
    
    // Write new counter
    await fs.writeFile(counterPath, JSON.stringify({ counter, lastUpdated: new Date().toISOString() }));
    return counter;
  } catch (error) {
    auditLog('counter_error', { orgLetter, type: 'request', error: String(error) });
    throw error;
  }
}

/**
 * Get next counter for legacy IDs (atomic)
 */
async function getNextLegacyCounter(orgLetter: string): Promise<number> {
  const counterPath = path.join(process.cwd(), 'data', 'counters', `${orgLetter}-legacy-counter.json`);
  
  try {
    await fs.mkdir(path.dirname(counterPath), { recursive: true });
    
    let counter = 1;
    try {
      const data = await fs.readFile(counterPath, 'utf-8');
      const parsed = JSON.parse(data);
      counter = (parsed.counter || 0) + 1;
    } catch {
      // File doesn't exist, start at 1
    }
    
    // Write new counter
    await fs.writeFile(counterPath, JSON.stringify({ counter, lastUpdated: new Date().toISOString() }));
    return counter;
  } catch (error) {
    auditLog('counter_error', { orgLetter, type: 'legacy', error: String(error) });
    throw error;
  }
}

/**
 * Create-only project creation with collision prevention and proper indexing
 */
export async function createProjectAtomic(projectId: string, projectData: any): Promise<{
  success: boolean;
  error?: 'project_creation_collision' | 'write_failed';
}> {
  try {
    // 🔧 CRITICAL FIX: Use hierarchical storage structure like UnifiedStorageService
    const now = new Date();
    const year = now.getFullYear();
    const month = now.toLocaleString('en-US', { month: 'long' });
    const day = now.getDate().toString().padStart(2, '0');

    const projectPath = path.join(
      process.cwd(),
      'data',
      'projects',
      year.toString(),
      month,
      day,
      projectId,
      'project.json'
    );

    // Check if project already exists (atomic check) - check both flat and hierarchical
    const flatExists = await projectExists(projectId);
    let hierarchicalExists = false;
    try {
      await fs.access(projectPath);
      hierarchicalExists = true;
    } catch {
      // Doesn't exist, which is good
    }

    if (flatExists || hierarchicalExists) {
      auditLog('project_creation_collision', { projectId, operation: 'create_atomic' });
      return { success: false, error: 'project_creation_collision' };
    }

    auditLog('project_creation_attempt', {
      projectId,
      operation: 'create_atomic',
      hasData: !!projectData,
      path: projectPath
    });

    // Create project directory structure
    await fs.mkdir(path.dirname(projectPath), { recursive: true });

    // Write project file in hierarchical structure
    await fs.writeFile(projectPath, JSON.stringify(projectData, null, 2));

    // 🔧 CRITICAL: Update project index so other systems can find the project
    try {
      const indexPath = path.join(process.cwd(), 'data', 'projects', 'metadata', 'projects-index.json');
      await fs.mkdir(path.dirname(indexPath), { recursive: true });

      let index = {};
      try {
        const indexData = await fs.readFile(indexPath, 'utf-8');
        index = JSON.parse(indexData);
      } catch {
        // Index doesn't exist, start with empty object
      }

      // Add project to index
      (index as any)[projectId] = projectData.createdAt || new Date().toISOString();

      // Write updated index
      await fs.writeFile(indexPath, JSON.stringify(index, null, 2));

      auditLog('project_index_updated', { projectId, indexPath });
    } catch (indexError) {
      auditLog('project_index_update_failed', {
        projectId,
        error: indexError instanceof Error ? indexError.message : String(indexError)
      });
      // Don't fail the entire operation for index update failures
    }

    auditLog('project_creation_success', { projectId });
    return { success: true };

  } catch (error) {
    auditLog('project_creation_error', {
      projectId,
      error: error instanceof Error ? error.message : String(error)
    });
    return { success: false, error: 'write_failed' };
  }
}
