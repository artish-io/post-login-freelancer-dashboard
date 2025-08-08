/**
 * Circuit Breaker Pattern Implementation
 * 
 * Provides resilience against cascading failures by monitoring
 * service health and temporarily blocking requests when failures exceed threshold.
 */

export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Blocking requests due to failures
  HALF_OPEN = 'HALF_OPEN' // Testing if service has recovered
}

export interface CircuitBreakerConfig {
  failureThreshold: number;    // Number of failures before opening circuit
  recoveryTimeout: number;     // Time to wait before attempting recovery (ms)
  monitoringWindow: number;    // Time window for failure counting (ms)
  successThreshold: number;    // Successes needed in half-open to close circuit
}

export interface CircuitBreakerMetrics {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: number | null = null;
  private lastSuccessTime: number | null = null;
  private totalRequests = 0;
  private totalFailures = 0;
  private totalSuccesses = 0;

  constructor(
    private name: string,
    private config: CircuitBreakerConfig
  ) {}

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    this.totalRequests++;

    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptRecovery()) {
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
        console.log(`🔄 Circuit breaker ${this.name} transitioning to HALF_OPEN`);
      } else {
        throw new Error(`Circuit breaker ${this.name} is OPEN - blocking request`);
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Handle successful operation
   */
  private onSuccess(): void {
    this.lastSuccessTime = Date.now();
    this.totalSuccesses++;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
        console.log(`✅ Circuit breaker ${this.name} recovered - transitioning to CLOSED`);
      }
    } else if (this.state === CircuitState.CLOSED) {
      // Reset failure count on success in closed state
      this.failureCount = 0;
    }
  }

  /**
   * Handle failed operation
   */
  private onFailure(): void {
    this.lastFailureTime = Date.now();
    this.totalFailures++;
    this.failureCount++;

    if (this.state === CircuitState.CLOSED || this.state === CircuitState.HALF_OPEN) {
      if (this.failureCount >= this.config.failureThreshold) {
        this.state = CircuitState.OPEN;
        console.log(`❌ Circuit breaker ${this.name} opened due to ${this.failureCount} failures`);
      }
    }
  }

  /**
   * Check if we should attempt recovery from open state
   */
  private shouldAttemptRecovery(): boolean {
    if (!this.lastFailureTime) return false;
    return Date.now() - this.lastFailureTime >= this.config.recoveryTimeout;
  }

  /**
   * Get current circuit breaker metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses
    };
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    console.log(`🔄 Circuit breaker ${this.name} manually reset`);
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }
}

/**
 * Circuit breaker registry for managing multiple circuit breakers
 */
class CircuitBreakerRegistry {
  private breakers = new Map<string, CircuitBreaker>();

  /**
   * Get or create a circuit breaker
   */
  getBreaker(name: string, config?: CircuitBreakerConfig): CircuitBreaker {
    if (!this.breakers.has(name)) {
      const defaultConfig: CircuitBreakerConfig = {
        failureThreshold: 5,
        recoveryTimeout: 60000, // 1 minute
        monitoringWindow: 300000, // 5 minutes
        successThreshold: 3
      };
      
      this.breakers.set(name, new CircuitBreaker(name, config || defaultConfig));
    }
    
    return this.breakers.get(name)!;
  }

  /**
   * Get all circuit breaker metrics
   */
  getAllMetrics(): Record<string, CircuitBreakerMetrics> {
    const metrics: Record<string, CircuitBreakerMetrics> = {};
    
    this.breakers.forEach((breaker, name) => {
      metrics[name] = breaker.getMetrics();
    });
    
    return metrics;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    this.breakers.forEach(breaker => breaker.reset());
  }
}

// Global registry instance
export const circuitBreakerRegistry = new CircuitBreakerRegistry();

/**
 * Predefined circuit breaker configurations for common services
 */
export const CircuitBreakerConfigs = {
  DATABASE: {
    failureThreshold: 3,
    recoveryTimeout: 30000, // 30 seconds
    monitoringWindow: 120000, // 2 minutes
    successThreshold: 2
  },
  EXTERNAL_API: {
    failureThreshold: 5,
    recoveryTimeout: 60000, // 1 minute
    monitoringWindow: 300000, // 5 minutes
    successThreshold: 3
  },
  FILE_SYSTEM: {
    failureThreshold: 2,
    recoveryTimeout: 15000, // 15 seconds
    monitoringWindow: 60000, // 1 minute
    successThreshold: 1
  },
  INVOICE_GENERATION: {
    failureThreshold: 3,
    recoveryTimeout: 45000, // 45 seconds
    monitoringWindow: 180000, // 3 minutes
    successThreshold: 2
  }
} as const;

/**
 * Utility function to wrap operations with circuit breaker
 */
export function withCircuitBreaker<T>(
  name: string,
  operation: () => Promise<T>,
  config?: CircuitBreakerConfig
): Promise<T> {
  const breaker = circuitBreakerRegistry.getBreaker(name, config);
  return breaker.execute(operation);
}
