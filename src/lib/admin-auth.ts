import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'admin-dashboard-secret-key-2025'
);

export interface AdminUser {
  email: string;
  role: string;
  iat: number;
}

export async function verifyAdminToken(token: string): Promise<AdminUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as AdminUser;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

export function getTokenFromRequest(request: Request): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

export async function requireAdminAuth(request: Request): Promise<AdminUser | Response> {
  const token = getTokenFromRequest(request);
  
  if (!token) {
    return new Response(
      JSON.stringify({ error: 'No authentication token provided' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const user = await verifyAdminToken(token);
  
  if (!user) {
    return new Response(
      JSON.stringify({ error: 'Invalid or expired token' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return user;
}
