/**
 * Request Deduplication Service
 * 
 * Prevents multiple identical API requests from being made simultaneously
 * by caching promises and returning the same promise for identical requests.
 */

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
  abortController: AbortController;
}

class RequestDeduplicationService {
  private pendingRequests = new Map<string, PendingRequest<any>>();
  private readonly maxAge = 30000; // 30 seconds max age for pending requests

  /**
   * Generate a cache key for a request
   */
  private generateKey(url: string, options?: RequestInit): string {
    const method = options?.method || 'GET';
    const body = options?.body ? JSON.stringify(options.body) : '';
    const headers = options?.headers ? JSON.stringify(options.headers) : '';
    
    return `${method}:${url}:${body}:${headers}`;
  }

  /**
   * Clean up expired pending requests
   */
  private cleanup(): void {
    const now = Date.now();
    
    for (const [key, request] of this.pendingRequests.entries()) {
      if (now - request.timestamp > this.maxAge) {
        request.abortController.abort();
        this.pendingRequests.delete(key);
      }
    }
  }

  /**
   * Deduplicated fetch function
   */
  async fetch<T = any>(url: string, options?: RequestInit): Promise<T> {
    this.cleanup();
    
    const key = this.generateKey(url, options);
    const existingRequest = this.pendingRequests.get(key);
    
    if (existingRequest) {
      console.log(`🔄 Deduplicating request: ${key}`);
      return existingRequest.promise;
    }

    // Create new request with abort controller
    const abortController = new AbortController();
    const requestOptions: RequestInit = {
      ...options,
      signal: abortController.signal
    };

    const promise = fetch(url, requestOptions)
      .then(async response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          return await response.json();
        } else {
          return await response.text();
        }
      })
      .finally(() => {
        // Remove from pending requests when complete
        this.pendingRequests.delete(key);
      });

    // Store pending request
    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now(),
      abortController
    });

    return promise;
  }

  /**
   * Cancel all pending requests
   */
  cancelAll(): void {
    for (const request of this.pendingRequests.values()) {
      request.abortController.abort();
    }
    this.pendingRequests.clear();
  }

  /**
   * Cancel specific request by key
   */
  cancel(url: string, options?: RequestInit): void {
    const key = this.generateKey(url, options);
    const request = this.pendingRequests.get(key);
    
    if (request) {
      request.abortController.abort();
      this.pendingRequests.delete(key);
    }
  }

  /**
   * Get stats about pending requests
   */
  getStats() {
    return {
      pendingCount: this.pendingRequests.size,
      pendingRequests: Array.from(this.pendingRequests.keys())
    };
  }
}

// Global instance
export const requestDeduplication = new RequestDeduplicationService();

/**
 * React hook for deduplicated requests
 */
import { useState, useEffect, useCallback, useRef } from 'react';

interface UseDeduplicatedRequestOptions<T> {
  /** Whether to automatically fetch on mount */
  autoFetch?: boolean;
  /** Dependencies that trigger a refetch */
  deps?: React.DependencyList;
  /** Success callback */
  onSuccess?: (data: T) => void;
  /** Error callback */
  onError?: (error: Error) => void;
  /** Whether to enable the request */
  enabled?: boolean;
}

export function useDeduplicatedRequest<T = any>(
  url: string | null,
  options?: RequestInit,
  hookOptions: UseDeduplicatedRequestOptions<T> = {}
) {
  const {
    autoFetch = true,
    deps = [],
    onSuccess,
    onError,
    enabled = true
  } = hookOptions;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const abortControllerRef = useRef<AbortController>();

  const fetch = useCallback(async (): Promise<T | null> => {
    if (!url || !enabled) return null;

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setLoading(true);
    setError(null);

    try {
      const result = await requestDeduplication.fetch<T>(url, options);
      setData(result);
      
      if (onSuccess) {
        onSuccess(result);
      }
      
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Request failed');
      
      // Don't set error state for aborted requests
      if (error.name !== 'AbortError') {
        setError(error);
        
        if (onError) {
          onError(error);
        }
      }
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [url, enabled, onSuccess, onError, ...deps]);

  // Auto-fetch on mount and dependency changes
  useEffect(() => {
    if (autoFetch) {
      fetch();
    }
  }, [fetch, autoFetch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    fetch,
    cancel: () => {
      if (url) {
        requestDeduplication.cancel(url, options);
      }
    }
  };
}

/**
 * Higher-order function to wrap existing fetch calls with deduplication
 */
export function withDeduplication<T extends (...args: any[]) => Promise<any>>(
  fetchFunction: T
): T {
  return (async (...args: any[]) => {
    // Extract URL from arguments (assuming first arg is URL)
    const url = args[0];
    const options = args[1];
    
    if (typeof url === 'string') {
      return requestDeduplication.fetch(url, options);
    } else {
      // Fallback to original function if URL is not a string
      return fetchFunction(...args);
    }
  }) as T;
}

/**
 * Utility to create a deduplicated API client
 */
export function createDeduplicatedApiClient(baseURL: string = '') {
  return {
    get: <T = any>(url: string, options?: Omit<RequestInit, 'method'>) =>
      requestDeduplication.fetch<T>(`${baseURL}${url}`, { ...options, method: 'GET' }),
    
    post: <T = any>(url: string, data?: any, options?: Omit<RequestInit, 'method' | 'body'>) =>
      requestDeduplication.fetch<T>(`${baseURL}${url}`, {
        ...options,
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers
        }
      }),
    
    put: <T = any>(url: string, data?: any, options?: Omit<RequestInit, 'method' | 'body'>) =>
      requestDeduplication.fetch<T>(`${baseURL}${url}`, {
        ...options,
        method: 'PUT',
        body: data ? JSON.stringify(data) : undefined,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers
        }
      }),
    
    delete: <T = any>(url: string, options?: Omit<RequestInit, 'method'>) =>
      requestDeduplication.fetch<T>(`${baseURL}${url}`, { ...options, method: 'DELETE' }),
    
    // Utility methods
    cancelAll: () => requestDeduplication.cancelAll(),
    getStats: () => requestDeduplication.getStats()
  };
}

// Default API client
export const apiClient = createDeduplicatedApiClient();

/**
 * Performance monitoring for request deduplication
 */
export const RequestDeduplicationMonitor = {
  startMonitoring() {
    const interval = setInterval(() => {
      const stats = requestDeduplication.getStats();
      
      if (stats.pendingCount > 10) {
        console.warn(`⚠️ High number of pending requests: ${stats.pendingCount}`);
        console.log('Pending requests:', stats.pendingRequests);
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  },

  logStats() {
    const stats = requestDeduplication.getStats();
    console.log('📊 Request Deduplication Stats:', stats);
  }
};
