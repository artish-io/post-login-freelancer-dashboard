/**
 * System Health Monitoring
 * 
 * Provides real-time monitoring of system health metrics,
 * error rates, and performance indicators.
 */

import { circuitBreakerRegistry } from '@/lib/resilience/circuit-breaker';
import { idGenerationMonitor } from '@/lib/utils/id-generation';

export interface HealthMetric {
  name: string;
  value: number;
  unit: string;
  status: 'healthy' | 'warning' | 'critical';
  timestamp: string;
  details?: Record<string, any>;
}

export interface SystemHealthReport {
  overall: 'healthy' | 'warning' | 'critical';
  timestamp: string;
  metrics: HealthMetric[];
  circuitBreakers: Record<string, any>;
  alerts: HealthAlert[];
}

export interface HealthAlert {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: string;
  component: string;
  resolved: boolean;
}

class SystemHealthMonitor {
  private alerts: HealthAlert[] = [];
  private metrics: Map<string, HealthMetric> = new Map();

  /**
   * Record a health metric
   */
  recordMetric(metric: HealthMetric): void {
    this.metrics.set(metric.name, metric);
    
    // Check for alerts based on metric
    this.checkMetricAlerts(metric);
  }

  /**
   * Get current system health report
   */
  getHealthReport(): SystemHealthReport {
    const metrics = Array.from(this.metrics.values());
    const circuitBreakers = circuitBreakerRegistry.getAllMetrics();
    
    // Determine overall health
    const criticalMetrics = metrics.filter(m => m.status === 'critical');
    const warningMetrics = metrics.filter(m => m.status === 'warning');
    
    let overall: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (criticalMetrics.length > 0) {
      overall = 'critical';
    } else if (warningMetrics.length > 0) {
      overall = 'warning';
    }

    return {
      overall,
      timestamp: new Date().toISOString(),
      metrics,
      circuitBreakers,
      alerts: this.getActiveAlerts()
    };
  }

  /**
   * Add a health alert
   */
  addAlert(alert: Omit<HealthAlert, 'id' | 'timestamp' | 'resolved'>): void {
    const newAlert: HealthAlert = {
      ...alert,
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      resolved: false
    };
    
    this.alerts.push(newAlert);
    
    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
    }
  }

  /**
   * Get active (unresolved) alerts
   */
  getActiveAlerts(): HealthAlert[] {
    return this.alerts.filter(a => !a.resolved);
  }

  /**
   * Check metric for alert conditions
   */
  private checkMetricAlerts(metric: HealthMetric): void {
    if (metric.status === 'critical') {
      this.addAlert({
        severity: 'critical',
        message: `Critical metric: ${metric.name} = ${metric.value} ${metric.unit}`,
        component: metric.name
      });
    } else if (metric.status === 'warning') {
      this.addAlert({
        severity: 'warning',
        message: `Warning metric: ${metric.name} = ${metric.value} ${metric.unit}`,
        component: metric.name
      });
    }
  }

  /**
   * Collect system metrics
   */
  async collectSystemMetrics(): Promise<void> {
    // Memory usage
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memUsage = process.memoryUsage();
      this.recordMetric({
        name: 'memory_usage_mb',
        value: Math.round(memUsage.heapUsed / 1024 / 1024),
        unit: 'MB',
        status: memUsage.heapUsed > 500 * 1024 * 1024 ? 'warning' : 'healthy',
        timestamp: new Date().toISOString(),
        details: memUsage
      });
    }

    // ID generation metrics
    const idMetrics = idGenerationMonitor.getMetrics();
    this.recordMetric({
      name: 'id_generation_collisions',
      value: idMetrics.collisions,
      unit: 'count',
      status: idMetrics.collisions > 10 ? 'warning' : 'healthy',
      timestamp: new Date().toISOString(),
      details: idMetrics
    });

    // Circuit breaker health
    const breakerMetrics = circuitBreakerRegistry.getAllMetrics();
    Object.entries(breakerMetrics).forEach(([name, metrics]) => {
      const failureRate = metrics.totalRequests > 0 
        ? (metrics.totalFailures / metrics.totalRequests) * 100 
        : 0;
      
      this.recordMetric({
        name: `circuit_breaker_${name}_failure_rate`,
        value: Math.round(failureRate * 100) / 100,
        unit: '%',
        status: failureRate > 20 ? 'critical' : failureRate > 10 ? 'warning' : 'healthy',
        timestamp: new Date().toISOString(),
        details: metrics
      });
    });
  }

  /**
   * Start periodic health monitoring
   */
  startMonitoring(intervalMs: number = 60000): void {
    setInterval(() => {
      this.collectSystemMetrics().catch(error => {
        console.error('Error collecting system metrics:', error);
      });
    }, intervalMs);
  }
}

// Global health monitor instance
export const systemHealthMonitor = new SystemHealthMonitor();

/**
 * Health check utilities
 */
export const HealthChecks = {
  /**
   * Check if a service is responding
   */
  async checkServiceHealth(name: string, healthCheck: () => Promise<boolean>): Promise<HealthMetric> {
    const startTime = Date.now();
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    let responseTime = 0;
    
    try {
      const isHealthy = await healthCheck();
      responseTime = Date.now() - startTime;
      
      if (!isHealthy) {
        status = 'critical';
      } else if (responseTime > 5000) {
        status = 'warning';
      }
      
      return {
        name: `${name}_health`,
        value: isHealthy ? 1 : 0,
        unit: 'boolean',
        status,
        timestamp: new Date().toISOString(),
        details: { responseTime, isHealthy }
      };
    } catch (error) {
      responseTime = Date.now() - startTime;
      return {
        name: `${name}_health`,
        value: 0,
        unit: 'boolean',
        status: 'critical',
        timestamp: new Date().toISOString(),
        details: { responseTime, error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  },

  /**
   * Check file system health
   */
  async checkFileSystemHealth(): Promise<HealthMetric> {
    return this.checkServiceHealth('filesystem', async () => {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      try {
        const testFile = path.join(process.cwd(), 'data', '.health-check');
        await fs.writeFile(testFile, 'health-check');
        await fs.unlink(testFile);
        return true;
      } catch {
        return false;
      }
    });
  },

  /**
   * Check data directory structure health
   */
  async checkDataStructureHealth(): Promise<HealthMetric> {
    return this.checkServiceHealth('data_structure', async () => {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      try {
        const requiredDirs = [
          'data/projects',
          'data/project-tasks', 
          'data/invoices',
          'data/logs'
        ];
        
        for (const dir of requiredDirs) {
          await fs.access(path.join(process.cwd(), dir));
        }
        return true;
      } catch {
        return false;
      }
    });
  }
};

/**
 * Initialize system monitoring
 */
export function initializeSystemMonitoring(): void {
  // Start periodic monitoring
  systemHealthMonitor.startMonitoring();
  
  console.log('🔍 System health monitoring initialized');
}
