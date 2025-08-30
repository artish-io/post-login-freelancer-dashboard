import { useEffect, useRef, useCallback, useMemo } from 'react';

/**
 * Optimized useEffect hook that prevents unnecessary re-renders
 * by using stable references and dependency optimization
 */

interface OptimizedEffectOptions {
  /** Whether to enable the effect (default: true) */
  enabled?: boolean;
  /** Debounce delay in milliseconds */
  debounce?: number;
  /** Whether to run effect only once (default: false) */
  once?: boolean;
  /** Custom comparison function for dependencies */
  compare?: (prev: any[], next: any[]) => boolean;
}

/**
 * Enhanced useEffect with performance optimizations
 */
export function useOptimizedEffect(
  effect: () => void | (() => void),
  deps: React.DependencyList,
  options: OptimizedEffectOptions = {}
) {
  const {
    enabled = true,
    debounce = 0,
    once = false,
    compare
  } = options;

  const hasRunRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const prevDepsRef = useRef<React.DependencyList>();
  const cleanupRef = useRef<(() => void) | void>();

  // Custom dependency comparison
  const depsChanged = useMemo(() => {
    if (!prevDepsRef.current) return true;
    
    if (compare) {
      return compare(prevDepsRef.current, deps);
    }
    
    // Default shallow comparison
    if (prevDepsRef.current.length !== deps.length) return true;
    
    return deps.some((dep, index) => 
      !Object.is(dep, prevDepsRef.current![index])
    );
  }, deps);

  const runEffect = useCallback(() => {
    if (!enabled) return;
    if (once && hasRunRef.current) return;

    // Cleanup previous effect
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = undefined;
    }

    // Run new effect
    cleanupRef.current = effect();
    hasRunRef.current = true;
    prevDepsRef.current = deps;
  }, [effect, enabled, once, deps]);

  useEffect(() => {
    if (!depsChanged) return;

    if (debounce > 0) {
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout
      timeoutRef.current = setTimeout(runEffect, debounce);

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    } else {
      runEffect();
    }
  }, [depsChanged, runEffect, debounce]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
}

/**
 * Debounced effect hook
 */
export function useDebouncedEffect(
  effect: () => void | (() => void),
  deps: React.DependencyList,
  delay: number = 300
) {
  return useOptimizedEffect(effect, deps, { debounce: delay });
}

/**
 * Effect that runs only once
 */
export function useOnceEffect(
  effect: () => void | (() => void),
  deps: React.DependencyList = []
) {
  return useOptimizedEffect(effect, deps, { once: true });
}

/**
 * Effect with custom dependency comparison
 */
export function useDeepCompareEffect(
  effect: () => void | (() => void),
  deps: React.DependencyList
) {
  return useOptimizedEffect(effect, deps, {
    compare: (prev, next) => {
      return JSON.stringify(prev) !== JSON.stringify(next);
    }
  });
}

/**
 * Stable callback hook that prevents unnecessary re-renders
 */
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T {
  const callbackRef = useRef<T>(callback);
  const stableCallback = useRef<T>();

  // Update callback ref when dependencies change
  useOptimizedEffect(() => {
    callbackRef.current = callback;
  }, deps);

  // Create stable callback reference
  if (!stableCallback.current) {
    stableCallback.current = ((...args: any[]) => {
      return callbackRef.current(...args);
    }) as T;
  }

  return stableCallback.current;
}

/**
 * Optimized data fetching hook
 */
export function useOptimizedDataFetch<T>(
  fetcher: () => Promise<T>,
  deps: React.DependencyList,
  options: {
    enabled?: boolean;
    debounce?: number;
    onSuccess?: (data: T) => void;
    onError?: (error: Error) => void;
  } = {}
) {
  const { enabled = true, debounce = 0, onSuccess, onError } = options;
  const abortControllerRef = useRef<AbortController>();

  const stableFetcher = useStableCallback(fetcher, deps);
  const stableOnSuccess = useStableCallback(onSuccess || (() => {}), [onSuccess]);
  const stableOnError = useStableCallback(onError || (() => {}), [onError]);

  useOptimizedEffect(() => {
    if (!enabled) return;

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    const fetchData = async () => {
      try {
        const data = await stableFetcher();
        
        if (!signal.aborted) {
          stableOnSuccess(data);
        }
      } catch (error) {
        if (!signal.aborted && error instanceof Error) {
          stableOnError(error);
        }
      }
    };

    fetchData();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, deps, { enabled, debounce });
}

/**
 * Hook to prevent unnecessary re-renders by memoizing values
 */
export function useStableValue<T>(value: T, compare?: (prev: T, next: T) => boolean): T {
  const ref = useRef<T>(value);
  
  const hasChanged = compare 
    ? compare(ref.current, value)
    : !Object.is(ref.current, value);
  
  if (hasChanged) {
    ref.current = value;
  }
  
  return ref.current;
}

/**
 * Performance monitoring hook for effects
 */
export function useEffectPerformance(
  name: string,
  effect: () => void | (() => void),
  deps: React.DependencyList
) {
  return useOptimizedEffect(() => {
    const startTime = performance.now();
    
    const cleanup = effect();
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    if (duration > 16) { // More than one frame (16ms)
      console.warn(`Slow effect "${name}": ${duration.toFixed(2)}ms`);
    }
    
    return cleanup;
  }, deps);
}

/**
 * Batch state updates to prevent multiple re-renders
 */
export function useBatchedUpdates() {
  const updatesRef = useRef<(() => void)[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const batchUpdate = useCallback((update: () => void) => {
    updatesRef.current.push(update);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      const updates = updatesRef.current;
      updatesRef.current = [];
      
      // Execute all updates in a single batch
      updates.forEach(update => update());
    }, 0);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return batchUpdate;
}
