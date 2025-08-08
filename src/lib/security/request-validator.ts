/**
 * Request validation middleware for security and data integrity
 * Provides protection against malicious requests and data corruption
 */

import { z } from 'zod';

export interface RequestValidationConfig {
  maxBodySize?: number; // Maximum request body size in bytes
  maxHeaderSize?: number; // Maximum header size in bytes
  allowedMethods?: string[]; // Allowed HTTP methods
  requiredHeaders?: string[]; // Required headers
  forbiddenHeaders?: string[]; // Headers that should not be present
  maxUrlLength?: number; // Maximum URL length
  validateContentType?: boolean; // Validate Content-Type header
  allowedContentTypes?: string[]; // Allowed Content-Type values
}

const DEFAULT_CONFIG: Required<RequestValidationConfig> = {
  maxBodySize: 10 * 1024 * 1024, // 10MB
  maxHeaderSize: 8 * 1024, // 8KB
  allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  requiredHeaders: [],
  forbiddenHeaders: ['x-forwarded-host', 'x-forwarded-proto'],
  maxUrlLength: 2048,
  validateContentType: true,
  allowedContentTypes: ['application/json', 'multipart/form-data', 'application/x-www-form-urlencoded'],
};

/**
 * Validate request against security rules
 */
export function validateRequest(req: Request, config: Partial<RequestValidationConfig> = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const errors: string[] = [];

  // Validate HTTP method
  if (!finalConfig.allowedMethods.includes(req.method)) {
    errors.push(`HTTP method ${req.method} not allowed`);
  }

  // Validate URL length
  if (req.url.length > finalConfig.maxUrlLength) {
    errors.push(`URL length exceeds maximum of ${finalConfig.maxUrlLength} characters`);
  }

  // Validate headers
  const headers = req.headers;
  
  // Check required headers
  for (const header of finalConfig.requiredHeaders) {
    if (!headers.has(header)) {
      errors.push(`Required header ${header} is missing`);
    }
  }

  // Check forbidden headers
  for (const header of finalConfig.forbiddenHeaders) {
    if (headers.has(header)) {
      errors.push(`Forbidden header ${header} is present`);
    }
  }

  // Validate header size
  let totalHeaderSize = 0;
  headers.forEach((value, name) => {
    totalHeaderSize += name.length + value.length + 4; // +4 for ": " and "\r\n"
  });
  
  if (totalHeaderSize > finalConfig.maxHeaderSize) {
    errors.push(`Total header size exceeds maximum of ${finalConfig.maxHeaderSize} bytes`);
  }

  // Validate Content-Type for requests with body
  if (finalConfig.validateContentType && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = headers.get('content-type');
    if (contentType) {
      const baseContentType = contentType.split(';')[0].trim();
      if (!finalConfig.allowedContentTypes.includes(baseContentType)) {
        errors.push(`Content-Type ${baseContentType} not allowed`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate request body size
 */
export async function validateBodySize(req: Request, maxSize: number = DEFAULT_CONFIG.maxBodySize) {
  const contentLength = req.headers.get('content-length');
  
  if (contentLength) {
    const size = parseInt(contentLength, 10);
    if (size > maxSize) {
      return {
        valid: false,
        error: `Request body size ${size} exceeds maximum of ${maxSize} bytes`,
      };
    }
  }

  return { valid: true };
}

/**
 * Sanitize and validate JSON input
 */
export function sanitizeJsonInput(input: any): any {
  if (typeof input !== 'object' || input === null) {
    return input;
  }

  if (Array.isArray(input)) {
    return input.map(sanitizeJsonInput);
  }

  const sanitized: any = {};
  
  for (const [key, value] of Object.entries(input)) {
    // Skip potentially dangerous keys
    if (key.startsWith('__') || key.includes('prototype') || key.includes('constructor')) {
      continue;
    }

    // Recursively sanitize nested objects
    if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeJsonInput(value);
    } else if (typeof value === 'string') {
      // Basic string sanitization
      sanitized[key] = value.trim().slice(0, 10000); // Limit string length
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Validate file upload requests
 */
export interface FileValidationConfig {
  maxFileSize: number;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  maxFiles: number;
}

export const FILE_VALIDATION_CONFIGS = {
  images: {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    maxFiles: 10,
  },
  documents: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ['application/pdf', 'text/plain', 'application/msword'],
    allowedExtensions: ['.pdf', '.txt', '.doc', '.docx'],
    maxFiles: 5,
  },
  any: {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    allowedMimeTypes: [], // Allow any
    allowedExtensions: [], // Allow any
    maxFiles: 1,
  },
};

/**
 * Security headers to add to responses
 */
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};

/**
 * Request validation middleware wrapper
 */
export function withRequestValidation(
  config: Partial<RequestValidationConfig>,
  handler: (req: Request, ...args: any[]) => Promise<Response>
) {
  return async (req: Request, ...args: any[]): Promise<Response> => {
    // Validate request structure
    const validation = validateRequest(req, config);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({
          ok: false,
          code: 'INVALID_REQUEST',
          message: 'Request validation failed',
          errors: validation.errors,
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...SECURITY_HEADERS,
          },
        }
      );
    }

    // Validate body size for requests with body
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const bodySizeValidation = await validateBodySize(req, config.maxBodySize);
      if (!bodySizeValidation.valid) {
        return new Response(
          JSON.stringify({
            ok: false,
            code: 'REQUEST_TOO_LARGE',
            message: bodySizeValidation.error,
          }),
          {
            status: 413,
            headers: {
              'Content-Type': 'application/json',
              ...SECURITY_HEADERS,
            },
          }
        );
      }
    }

    try {
      const response = await handler(req, ...args);
      
      // Add security headers to response
      const newHeaders = new Headers(response.headers);
      Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
        if (!newHeaders.has(key)) {
          newHeaders.set(key, value);
        }
      });
      
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    } catch (error) {
      console.error('Request handler error:', error);
      return new Response(
        JSON.stringify({
          ok: false,
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...SECURITY_HEADERS,
          },
        }
      );
    }
  };
}

/**
 * Specific validation configs for different endpoint types
 */
export const VALIDATION_CONFIGS = {
  payments: {
    maxBodySize: 1024 * 1024, // 1MB for payment requests
    requiredHeaders: ['content-type'],
    allowedContentTypes: ['application/json'],
  },
  uploads: {
    maxBodySize: 50 * 1024 * 1024, // 50MB for file uploads
    allowedContentTypes: ['multipart/form-data'],
  },
  api: {
    maxBodySize: 5 * 1024 * 1024, // 5MB for general API requests
    allowedContentTypes: ['application/json'],
  },
};
