/**
 * Input sanitization utilities for XSS prevention and data cleaning
 * Provides comprehensive protection against malicious input
 */

/**
 * HTML entities for escaping
 */
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
};

/**
 * Escape HTML entities to prevent XSS
 */
export function escapeHtml(input: string): string {
  return input.replace(/[&<>"'`=/]/g, (match) => HTML_ENTITIES[match] || match);
}

/**
 * Remove HTML tags from input
 */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '');
}

/**
 * Sanitize string input for safe storage and display
 */
export function sanitizeString(input: string, options: {
  maxLength?: number;
  allowHtml?: boolean;
  trimWhitespace?: boolean;
  removeControlChars?: boolean;
} = {}): string {
  const {
    maxLength = 10000,
    allowHtml = false,
    trimWhitespace = true,
    removeControlChars = true,
  } = options;

  let sanitized = input;

  // Trim whitespace
  if (trimWhitespace) {
    sanitized = sanitized.trim();
  }

  // Remove control characters (except newlines and tabs)
  if (removeControlChars) {
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  }

  // Remove or escape HTML
  if (!allowHtml) {
    sanitized = stripHtml(sanitized);
    sanitized = escapeHtml(sanitized);
  }

  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength);
  }

  return sanitized;
}

/**
 * Sanitize email addresses
 */
export function sanitizeEmail(email: string): string {
  const sanitized = email.toLowerCase().trim();
  
  // Basic email validation pattern
  const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  if (!emailPattern.test(sanitized)) {
    throw new Error('Invalid email format');
  }

  return sanitized;
}

/**
 * Sanitize URLs
 */
export function sanitizeUrl(url: string): string {
  const sanitized = url.trim();
  
  // Allow only http, https, and mailto protocols
  const allowedProtocols = ['http:', 'https:', 'mailto:'];
  
  try {
    const urlObj = new URL(sanitized);
    
    if (!allowedProtocols.includes(urlObj.protocol)) {
      throw new Error('Invalid URL protocol');
    }
    
    return urlObj.toString();
  } catch {
    throw new Error('Invalid URL format');
  }
}

/**
 * Sanitize file names
 */
export function sanitizeFileName(fileName: string): string {
  // Remove path traversal attempts
  let sanitized = fileName.replace(/[\/\\:*?"<>|]/g, '');
  
  // Remove leading dots and spaces
  sanitized = sanitized.replace(/^[.\s]+/, '');
  
  // Limit length
  sanitized = sanitized.slice(0, 255);
  
  // Ensure it's not empty
  if (!sanitized) {
    sanitized = 'file';
  }
  
  return sanitized;
}

/**
 * Sanitize numeric input
 */
export function sanitizeNumber(input: any, options: {
  min?: number;
  max?: number;
  integer?: boolean;
} = {}): number {
  const { min, max, integer = false } = options;
  
  let num = Number(input);
  
  if (isNaN(num) || !isFinite(num)) {
    throw new Error('Invalid number');
  }
  
  if (integer) {
    num = Math.floor(num);
  }
  
  if (min !== undefined && num < min) {
    throw new Error(`Number must be at least ${min}`);
  }
  
  if (max !== undefined && num > max) {
    throw new Error(`Number must be at most ${max}`);
  }
  
  return num;
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject(obj: any, options: {
  maxDepth?: number;
  maxKeys?: number;
  stringOptions?: Parameters<typeof sanitizeString>[1];
} = {}): any {
  const { maxDepth = 10, maxKeys = 100, stringOptions = {} } = options;
  
  function sanitizeRecursive(value: any, depth: number): any {
    if (depth > maxDepth) {
      throw new Error('Object nesting too deep');
    }
    
    if (value === null || value === undefined) {
      return value;
    }
    
    if (typeof value === 'string') {
      return sanitizeString(value, stringOptions);
    }
    
    if (typeof value === 'number') {
      return sanitizeNumber(value);
    }
    
    if (typeof value === 'boolean') {
      return value;
    }
    
    if (Array.isArray(value)) {
      if (value.length > maxKeys) {
        throw new Error('Array too large');
      }
      return value.map(item => sanitizeRecursive(item, depth + 1));
    }
    
    if (typeof value === 'object') {
      const keys = Object.keys(value);
      if (keys.length > maxKeys) {
        throw new Error('Object has too many keys');
      }
      
      const sanitized: any = {};
      for (const key of keys) {
        // Sanitize key names
        const sanitizedKey = sanitizeString(key, { maxLength: 100, allowHtml: false });
        if (sanitizedKey) {
          sanitized[sanitizedKey] = sanitizeRecursive(value[key], depth + 1);
        }
      }
      return sanitized;
    }
    
    // For other types, convert to string and sanitize
    return sanitizeString(String(value), stringOptions);
  }
  
  return sanitizeRecursive(obj, 0);
}

/**
 * SQL injection prevention for search queries
 */
export function sanitizeSearchQuery(query: string): string {
  // Remove SQL keywords and special characters
  const sqlKeywords = [
    'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER',
    'UNION', 'JOIN', 'WHERE', 'ORDER', 'GROUP', 'HAVING', 'EXEC',
    'EXECUTE', 'SCRIPT', 'DECLARE', 'CAST', 'CONVERT'
  ];
  
  let sanitized = query.trim();
  
  // Remove SQL keywords (case insensitive)
  const keywordPattern = new RegExp(`\\b(${sqlKeywords.join('|')})\\b`, 'gi');
  sanitized = sanitized.replace(keywordPattern, '');
  
  // Remove dangerous characters
  sanitized = sanitized.replace(/[';/*-]/g, '');
  
  // Limit length
  sanitized = sanitized.slice(0, 1000);
  
  return sanitized.trim();
}

/**
 * Sanitize user input for different contexts
 */
export const InputSanitizers = {
  // For user profiles and display names
  displayName: (input: string) => sanitizeString(input, {
    maxLength: 100,
    allowHtml: false,
    trimWhitespace: true,
  }),
  
  // For project titles and descriptions
  projectTitle: (input: string) => sanitizeString(input, {
    maxLength: 200,
    allowHtml: false,
    trimWhitespace: true,
  }),
  
  projectDescription: (input: string) => sanitizeString(input, {
    maxLength: 5000,
    allowHtml: false,
    trimWhitespace: true,
  }),
  
  // For task content
  taskTitle: (input: string) => sanitizeString(input, {
    maxLength: 200,
    allowHtml: false,
    trimWhitespace: true,
  }),
  
  taskNotes: (input: string) => sanitizeString(input, {
    maxLength: 2000,
    allowHtml: false,
    trimWhitespace: true,
  }),
  
  // For messages and comments
  messageContent: (input: string) => sanitizeString(input, {
    maxLength: 5000,
    allowHtml: false,
    trimWhitespace: true,
  }),
  
  // For search queries
  searchQuery: sanitizeSearchQuery,
  
  // For URLs and links
  url: sanitizeUrl,
  
  // For file names
  fileName: sanitizeFileName,
  
  // For email addresses
  email: sanitizeEmail,
  
  // For currency amounts
  currencyAmount: (input: any) => sanitizeNumber(input, {
    min: 0,
    max: 1000000,
    integer: false,
  }),
  
  // For IDs
  id: (input: any) => sanitizeNumber(input, {
    min: 1,
    max: Number.MAX_SAFE_INTEGER,
    integer: true,
  }),
};

/**
 * Comprehensive input sanitization for API requests
 */
export function sanitizeApiInput(input: any): any {
  return sanitizeObject(input, {
    maxDepth: 5,
    maxKeys: 50,
    stringOptions: {
      maxLength: 10000,
      allowHtml: false,
      trimWhitespace: true,
      removeControlChars: true,
    },
  });
}
