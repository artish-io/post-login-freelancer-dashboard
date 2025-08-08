import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function requireSession(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw Object.assign(new Error('UNAUTHORIZED'), { status: 401 });
  }
  return { session, userId: Number(session.user.id) };
}

export function assert(cond: any, code: string, status = 403, message?: string) {
  if (!cond) {
    throw Object.assign(new Error(message || code), { code, status });
  }
}

export type Role = 'freelancer' | 'commissioner' | 'admin';

export function requireRole(session: any, role: Role) {
  const roles = (session?.user as any)?.roles || [];
  assert(
    roles.includes(role) || roles.includes('admin'), 
    'FORBIDDEN_ROLE', 
    403, 
    `Requires role: ${role}`
  );
}

/**
 * Extract user type from session user object
 */
export function getUserType(session: any): 'freelancer' | 'commissioner' | null {
  const user = session?.user;
  if (!user) return null;
  
  // Check if user has type property
  if (user.type) {
    return user.type === 'freelancer' ? 'freelancer' : 'commissioner';
  }
  
  // Fallback to roles array
  const roles = user.roles || [];
  if (roles.includes('freelancer')) return 'freelancer';
  if (roles.includes('commissioner')) return 'commissioner';
  
  return null;
}

/**
 * Require specific user type from session
 */
export function requireUserType(session: any, userType: 'freelancer' | 'commissioner') {
  const actualType = getUserType(session);
  assert(
    actualType === userType,
    'FORBIDDEN_USER_TYPE',
    403,
    `Requires user type: ${userType}, got: ${actualType}`
  );
}

/**
 * Check if user owns a resource by comparing user ID
 */
export function assertOwnership(
  sessionUserId: number,
  resourceUserId: number | string | undefined,
  resourceType: string = 'resource'
) {
  const resourceId = Number(resourceUserId);
  assert(
    sessionUserId === resourceId,
    'FORBIDDEN_OWNER',
    403,
    `Not your ${resourceType}`
  );
}

/**
 * Check if user can access a project (either as freelancer or commissioner)
 */
export function assertProjectAccess(
  sessionUserId: number,
  project: { freelancerId?: number; commissionerId?: number },
  accessType?: 'freelancer' | 'commissioner'
) {
  const isFreelancer = Number(project.freelancerId) === sessionUserId;
  const isCommissioner = Number(project.commissionerId) === sessionUserId;
  
  if (accessType === 'freelancer') {
    assert(isFreelancer, 'FORBIDDEN_PROJECT_FREELANCER', 403, 'Not the project freelancer');
  } else if (accessType === 'commissioner') {
    assert(isCommissioner, 'FORBIDDEN_PROJECT_COMMISSIONER', 403, 'Not the project commissioner');
  } else {
    assert(
      isFreelancer || isCommissioner,
      'FORBIDDEN_PROJECT_ACCESS',
      403,
      'No access to this project'
    );
  }
}
