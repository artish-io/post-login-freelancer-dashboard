
import { getAllUsers as getUnifiedUsers, getUserById as getUnifiedUserById, getUserByEmail as getUnifiedUserByEmail } from '../storage/unified-storage-service';

/**
 * @deprecated Use unified storage service functions instead
 * These functions are kept for backward compatibility but will be removed in a future version
 */

export async function getAllUsers() {
  console.warn('⚠️ [DEPRECATED] src/lib/users/index.ts getAllUsers() is deprecated. Use getAllUsers from unified-storage-service instead.');
  return await getUnifiedUsers();
}

export async function getUserById(id: number) {
  console.warn('⚠️ [DEPRECATED] src/lib/users/index.ts getUserById() is deprecated. Use getUserById from unified-storage-service instead.');
  return await getUnifiedUserById(id);
}

export async function getUserByEmail(email: string) {
  console.warn('⚠️ [DEPRECATED] src/lib/users/index.ts getUserByEmail() is deprecated. Use getUserByEmail from unified-storage-service instead.');
  return await getUnifiedUserByEmail(email);
}