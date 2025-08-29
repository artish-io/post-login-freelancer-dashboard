import type { Outlink } from '@/components/profile/PortfolioIcons';
import type { RateRange } from '@/components/profile/RateRangeEditor';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface OutlinksResponse {
  success: true;
  outlinks: Outlink[];
}

export interface RateRangeResponse {
  success: true;
  rateRange: RateRange;
}

class ProfileApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'ProfileApiError';
  }
}

async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ProfileApiError(
      errorData.error || `HTTP ${response.status}: ${response.statusText}`,
      response.status
    );
  }

  const data = await response.json();
  
  if (!data.success) {
    throw new ProfileApiError(data.error || 'API request failed');
  }

  return data;
}

/**
 * Update freelancer outlinks/portfolio links
 */
export async function updateOutlinks(outlinks: Outlink[]): Promise<OutlinksResponse> {
  try {
    const response = await fetch('/api/profile/outlinks', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ outlinks }),
    });

    return await handleApiResponse<OutlinksResponse>(response);
  } catch (error) {
    if (error instanceof ProfileApiError) {
      throw error;
    }
    throw new ProfileApiError('Failed to update outlinks. Please check your connection and try again.');
  }
}

/**
 * Update freelancer rate range
 */
export async function updateRateRange(
  rateMin: number, 
  rateMax: number, 
  rateUnit: 'hour' | 'project' | 'day' = 'hour'
): Promise<RateRangeResponse> {
  try {
    const response = await fetch('/api/profile/rate-range', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rateMin, rateMax, rateUnit }),
    });

    return await handleApiResponse<RateRangeResponse>(response);
  } catch (error) {
    if (error instanceof ProfileApiError) {
      throw error;
    }
    throw new ProfileApiError('Failed to update rate range. Please check your connection and try again.');
  }
}

/**
 * Update multiple profile sections at once (optional unified endpoint)
 */
export async function updateProfile(payload: {
  outlinks?: Outlink[];
  rateRange?: RateRange;
  [key: string]: any;
}): Promise<ApiResponse> {
  try {
    const response = await fetch('/api/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return await handleApiResponse<ApiResponse>(response);
  } catch (error) {
    if (error instanceof ProfileApiError) {
      throw error;
    }
    throw new ProfileApiError('Failed to update profile. Please check your connection and try again.');
  }
}

/**
 * Validate outlinks before sending to server
 */
export function validateOutlinks(outlinks: Outlink[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (outlinks.length > 3) {
    errors.push('Maximum 3 outlinks allowed');
  }

  const urls = new Set<string>();
  
  outlinks.forEach((outlink, index) => {
    if (!outlink.url?.trim()) {
      errors.push(`Link ${index + 1}: URL is required`);
    } else {
      try {
        const url = new URL(outlink.url);
        if (!['http:', 'https:'].includes(url.protocol)) {
          errors.push(`Link ${index + 1}: URL must use http or https protocol`);
        }
        
        if (urls.has(outlink.url)) {
          errors.push(`Link ${index + 1}: Duplicate URL`);
        } else {
          urls.add(outlink.url);
        }
      } catch {
        errors.push(`Link ${index + 1}: Invalid URL format`);
      }
    }

    if (!outlink.platform?.trim()) {
      errors.push(`Link ${index + 1}: Platform is required`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate rate range before sending to server
 */
export function validateRateRange(rateRange: RateRange): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!Number.isInteger(rateRange.rateMin) || rateRange.rateMin <= 0) {
    errors.push('Minimum rate must be a positive integer');
  }
  
  if (!Number.isInteger(rateRange.rateMax) || rateRange.rateMax <= 0) {
    errors.push('Maximum rate must be a positive integer');
  }
  
  if (rateRange.rateMin > rateRange.rateMax) {
    errors.push('Minimum rate cannot be greater than maximum rate');
  }

  if (rateRange.rateUnit && !['hour', 'project', 'day'].includes(rateRange.rateUnit)) {
    errors.push('Rate unit must be hour, project, or day');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Normalize outlinks data (ensure proper order, generate IDs if missing)
 */
export function normalizeOutlinks(outlinks: Outlink[]): Outlink[] {
  return outlinks.map((outlink, index) => ({
    ...outlink,
    id: outlink.id || `ol_${Date.now()}_${index}`,
    order: index,
    createdAt: outlink.createdAt || new Date().toISOString(),
  }));
}

export { ProfileApiError };
