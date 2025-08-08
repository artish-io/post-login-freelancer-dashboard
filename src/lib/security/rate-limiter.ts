/**
 * Rate limiting implementation for API endpoints
 * Provides protection against abuse and DoS attacks
 */

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (req: Request) => string; // Custom key generator
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
  firstRequest: number;
}

// In-memory store for rate limiting (in production, use Redis)
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Default key generator - uses IP address and user ID if available
 */
function defaultKeyGenerator(req: Request): string {
  // Try to get IP from various headers
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0] || realIp || 'unknown';
  
  // Add user ID if available (from session)
  const userAgent = req.headers.get('user-agent') || 'unknown';
  return `${ip}:${userAgent.slice(0, 50)}`;
}

/**
 * Rate limiter middleware
 */
export function createRateLimiter(config: RateLimitConfig) {
  const {
    windowMs,
    maxRequests,
    keyGenerator = defaultKeyGenerator,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
  } = config;

  return {
    check: (req: Request): { allowed: boolean; remaining: number; resetTime: number } => {
      const key = keyGenerator(req);
      const now = Date.now();
      
      // Clean up expired entries
      cleanupExpiredEntries(now);
      
      let entry = rateLimitStore.get(key);
      
      if (!entry || now >= entry.resetTime) {
        // Create new entry or reset expired one
        entry = {
          count: 1,
          resetTime: now + windowMs,
          firstRequest: now,
        };
        rateLimitStore.set(key, entry);
        
        return {
          allowed: true,
          remaining: maxRequests - 1,
          resetTime: entry.resetTime,
        };
      }
      
      // Check if limit exceeded
      if (entry.count >= maxRequests) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: entry.resetTime,
        };
      }
      
      // Increment counter
      entry.count++;
      
      return {
        allowed: true,
        remaining: maxRequests - entry.count,
        resetTime: entry.resetTime,
      };
    },
    
    recordResult: (req: Request, success: boolean) => {
      if ((success && skipSuccessfulRequests) || (!success && skipFailedRequests)) {
        const key = keyGenerator(req);
        const entry = rateLimitStore.get(key);
        if (entry) {
          entry.count = Math.max(0, entry.count - 1);
        }
      }
    },
  };
}

/**
 * Clean up expired entries to prevent memory leaks
 */
function cleanupExpiredEntries(now: number) {
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now >= entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Predefined rate limiters for different endpoint types
 */
export const RateLimiters = {
  // Strict limits for authentication endpoints
  auth: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts per 15 minutes
  }),
  
  // Moderate limits for payment operations
  payments: createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 requests per minute
  }),
  
  // Generous limits for general API usage
  general: createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 requests per minute
  }),
  
  // Very strict limits for file uploads
  uploads: createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5, // 5 uploads per minute
  }),
  
  // Moderate limits for task operations
  tasks: createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30, // 30 task operations per minute
  }),
};

/**
 * Rate limiting middleware wrapper for route handlers
 */
export function withRateLimit(
  rateLimiter: ReturnType<typeof createRateLimiter>,
  handler: (req: Request, ...args: any[]) => Promise<Response>
) {
  return async (req: Request, ...args: any[]): Promise<Response> => {
    const { allowed, remaining, resetTime } = rateLimiter.check(req);
    
    if (!allowed) {
      const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
      
      return new Response(
        JSON.stringify({
          ok: false,
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
          retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': rateLimiter.check(req).remaining.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString(),
          },
        }
      );
    }
    
    try {
      const response = await handler(req, ...args);
      
      // Record successful request
      rateLimiter.recordResult(req, response.ok);
      
      // Add rate limit headers to response
      const newHeaders = new Headers(response.headers);
      newHeaders.set('X-RateLimit-Remaining', remaining.toString());
      newHeaders.set('X-RateLimit-Reset', Math.ceil(resetTime / 1000).toString());
      
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    } catch (error) {
      // Record failed request
      rateLimiter.recordResult(req, false);
      throw error;
    }
  };
}

/**
 * User-specific rate limiter that uses session user ID
 */
export function createUserRateLimiter(config: RateLimitConfig) {
  return createRateLimiter({
    ...config,
    keyGenerator: (req: Request) => {
      // This would need to be integrated with session extraction
      // For now, fall back to IP-based limiting
      return defaultKeyGenerator(req);
    },
  });
}

/**
 * Endpoint-specific rate limiter
 */
export function createEndpointRateLimiter(endpoint: string, config: RateLimitConfig) {
  return createRateLimiter({
    ...config,
    keyGenerator: (req: Request) => {
      const baseKey = defaultKeyGenerator(req);
      return `${endpoint}:${baseKey}`;
    },
  });
}
