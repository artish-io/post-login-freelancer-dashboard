import { customAlphabet } from 'nanoid';

// 6-character alphanumeric uppercase
const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 6);

/**
 * Generates a custom project ID in the format:
 *   [USER_INITIALS]-[6_CHAR_ID]
 * Example: TS-X9R3KP
 */
export function generateCustomProjectId(userName: string): string {
  const initials = extractInitials(userName);
  const suffix = nanoid(); // Already uppercase
  return `${initials}-${suffix}`;
}

/**
 * Extracts up to 2 initials from a full name.
 * Fallback: 'XX' if name is empty or invalid.
 */
function extractInitials(name: string): string {
  if (!name || typeof name !== 'string') return 'XX';

  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'XX';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return (parts[0][0] + parts[1][0]).toUpperCase();
}