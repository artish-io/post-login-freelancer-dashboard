
/**
 * @deprecated This module is deprecated. Use hierarchical storage functions instead:
 * - getAllOrganizations() from @/lib/storage/unified-storage-service
 * - getOrganizationById() from @/lib/storage/unified-storage-service
 * - getOrganizationByCommissionerId() from @/lib/storage/unified-storage-service
 */

import {
  getAllOrganizations as getHierarchicalOrganizations,
  getOrganizationById as getHierarchicalOrganizationById
} from '@/lib/storage/unified-storage-service';

/**
 * @deprecated Use getAllOrganizations() from @/lib/storage/unified-storage-service instead
 */
export async function getAllOrganizations() {
  return await getHierarchicalOrganizations();
}

/**
 * @deprecated Use getOrganizationById() from @/lib/storage/unified-storage-service instead
 */
export async function getOrganizationById(id: number) {
  return await getHierarchicalOrganizationById(id);
}

/**
 * @deprecated Use getOrganizationById() from @/lib/storage/unified-storage-service instead
 */
export async function getOrganizationByName(name: string) {
  const all = await getHierarchicalOrganizations();
  return all.find((org: any) => org.name?.toLowerCase() === name.toLowerCase());
}