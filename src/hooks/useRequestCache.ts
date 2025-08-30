import { useState, useEffect, useRef, useCallback } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface RequestCacheOptions {
  /** Cache duration in milliseconds (default: 5 minutes) */
  ttl?: number;
  /** Whether to return stale data while revalidating (default: true) */
  staleWhileRevalidate?: boolean;
  /** Maximum number of cache entries (default: 100) */
  maxEntries?: number;
  /** Whether to cache errors (default: false) */
  cacheErrors?: boolean;
}

/**
 * Request cache hook that provides intelligent caching for API requests
 * 
 * Features:
 * - Automatic deduplication of identical requests
 * - Configurable TTL (time-to-live)
 * - Stale-while-revalidate pattern
 * - Memory management with LRU eviction
 * - Error caching (optional)
 */
export function useRequestCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: RequestCacheOptions = {}
) {
  const {
    ttl = 5 * 60 * 1000, // 5 minutes
    staleWhileRevalidate = true,
    maxEntries = 100,
    cacheErrors = false
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(false);
  const [isStale, setIsStale] = useState(false);

  // Global cache shared across all hook instances
  const cache = useRef<Map<string, CacheEntry<any>>>(new Map());
  const pendingRequests = useRef<Map<string, Promise<any>>>(new Map());

  // LRU cache management
  const evictOldEntries = useCallback(() => {
    if (cache.current.size <= maxEntries) return;

    const entries = Array.from(cache.current.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    // Remove oldest entries
    const toRemove = entries.slice(0, entries.length - maxEntries);
    toRemove.forEach(([key]) => cache.current.delete(key));
  }, [maxEntries]);

  // Check if cache entry is valid
  const isCacheValid = useCallback((entry: CacheEntry<T>): boolean => {
    return Date.now() < entry.expiresAt;
  }, []);

  // Get data from cache
  const getCachedData = useCallback((cacheKey: string): CacheEntry<T> | null => {
    const entry = cache.current.get(cacheKey);
    if (!entry) return null;

    // Update access timestamp for LRU
    entry.timestamp = Date.now();
    cache.current.set(cacheKey, entry);

    return entry;
  }, []);

  // Set data in cache
  const setCachedData = useCallback((cacheKey: string, data: T) => {
    const now = Date.now();
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt: now + ttl
    };

    cache.current.set(cacheKey, entry);
    evictOldEntries();
  }, [ttl, evictOldEntries]);

  // Fetch data with deduplication
  const fetchData = useCallback(async (cacheKey: string, force = false): Promise<T> => {
    // Check for pending request
    const pendingRequest = pendingRequests.current.get(cacheKey);
    if (pendingRequest && !force) {
      return pendingRequest;
    }

    // Create new request
    const request = (async () => {
      try {
        const result = await fetcher();
        setCachedData(cacheKey, result);
        pendingRequests.current.delete(cacheKey);
        return result;
      } catch (err) {
        pendingRequests.current.delete(cacheKey);
        
        if (cacheErrors && err instanceof Error) {
          setCachedData(cacheKey, err as any);
        }
        
        throw err;
      }
    })();

    pendingRequests.current.set(cacheKey, request);
    return request;
  }, [fetcher, setCachedData, cacheErrors]);

  // Main fetch function
  const fetch = useCallback(async (force = false) => {
    const cacheKey = key;
    
    // Check cache first
    const cachedEntry = getCachedData(cacheKey);
    
    if (cachedEntry && !force) {
      const isValid = isCacheValid(cachedEntry);
      
      if (isValid) {
        // Cache hit - return cached data
        setData(cachedEntry.data);
        setError(null);
        setIsStale(false);
        return cachedEntry.data;
      } else if (staleWhileRevalidate) {
        // Stale data - return it but fetch fresh data in background
        setData(cachedEntry.data);
        setError(null);
        setIsStale(true);
        
        // Fetch fresh data in background
        fetchData(cacheKey, true)
          .then(freshData => {
            setData(freshData);
            setIsStale(false);
          })
          .catch(err => {
            // Keep stale data on error
            setError(err);
          });
        
        return cachedEntry.data;
      }
    }

    // Cache miss or force refresh
    setLoading(true);
    setError(null);

    try {
      const result = await fetchData(cacheKey, force);
      setData(result);
      setIsStale(false);
      return result;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [key, getCachedData, isCacheValid, staleWhileRevalidate, fetchData]);

  // Auto-fetch on mount and key change
  useEffect(() => {
    fetch();
  }, [fetch]);

  // Invalidate cache entry
  const invalidate = useCallback(() => {
    cache.current.delete(key);
    pendingRequests.current.delete(key);
  }, [key]);

  // Refresh data
  const refresh = useCallback(() => {
    return fetch(true);
  }, [fetch]);

  // Clear all cache
  const clearCache = useCallback(() => {
    cache.current.clear();
    pendingRequests.current.clear();
  }, []);

  return {
    data,
    error,
    loading,
    isStale,
    refresh,
    invalidate,
    clearCache,
    // Cache stats for debugging
    cacheSize: cache.current.size,
    pendingRequests: pendingRequests.current.size
  };
}

/**
 * Simple request deduplication hook for one-off requests
 */
export function useRequestDeduplication<T>(
  fetcher: () => Promise<T>,
  deps: React.DependencyList = []
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(false);

  const pendingRequest = useRef<Promise<T> | null>(null);

  const fetch = useCallback(async () => {
    // Return existing promise if request is already in flight
    if (pendingRequest.current) {
      return pendingRequest.current;
    }

    setLoading(true);
    setError(null);

    const request = fetcher()
      .then(result => {
        setData(result);
        pendingRequest.current = null;
        return result;
      })
      .catch(err => {
        setError(err);
        pendingRequest.current = null;
        throw err;
      })
      .finally(() => {
        setLoading(false);
      });

    pendingRequest.current = request;
    return request;
  }, deps);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, error, loading, refresh: fetch };
}

/**
 * Global cache utilities
 */
export const RequestCache = {
  // Global cache instance
  cache: new Map<string, CacheEntry<any>>(),
  
  // Get cached data
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry || Date.now() >= entry.expiresAt) {
      return null;
    }
    return entry.data;
  },
  
  // Set cached data
  set<T>(key: string, data: T, ttl = 5 * 60 * 1000) {
    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + ttl
    });
  },
  
  // Invalidate cache entry
  invalidate(key: string) {
    this.cache.delete(key);
  },
  
  // Clear all cache
  clear() {
    this.cache.clear();
  },
  
  // Get cache stats
  stats() {
    const now = Date.now();
    const entries = Array.from(this.cache.values());
    const valid = entries.filter(entry => now < entry.expiresAt).length;
    const expired = entries.length - valid;
    
    return {
      total: entries.length,
      valid,
      expired,
      memoryUsage: JSON.stringify(Array.from(this.cache.entries())).length
    };
  }
};
