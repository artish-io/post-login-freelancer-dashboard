/**
 * System Health Monitoring API
 * 
 * Provides real-time system health metrics, alerts, and monitoring data
 * for operational visibility and debugging.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { systemHealthMonitor, HealthChecks } from '@/lib/monitoring/system-health';
import { circuitBreakerRegistry } from '@/lib/resilience/circuit-breaker';
import { ok, err, ErrorCodes, withErrorHandling } from '@/lib/http/envelope';

async function handleSystemHealth(request: NextRequest) {
  // Check authentication
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      err(ErrorCodes.UNAUTHORIZED, 'Authentication required', 401),
      { status: 401 }
    );
  }

  // TODO: Add admin role check when role system is implemented
  
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'status';

  switch (action) {
    case 'status':
      return await getSystemStatus();
    
    case 'metrics':
      return await getDetailedMetrics();
    
    case 'alerts':
      return await getSystemAlerts();
    
    case 'circuit-breakers':
      return await getCircuitBreakerStatus();
    
    case 'health-check':
      return await runHealthChecks();
    
    default:
      return NextResponse.json(
        err(ErrorCodes.INVALID_INPUT, `Invalid action: ${action}`, 400),
        { status: 400 }
      );
  }
}

async function getSystemStatus() {
  const healthReport = systemHealthMonitor.getHealthReport();
  
  return NextResponse.json(
    ok({
      entities: {
        systemHealth: {
          overall: healthReport.overall,
          timestamp: healthReport.timestamp,
          metricsCount: healthReport.metrics.length,
          activeAlerts: healthReport.alerts.length,
          circuitBreakersCount: Object.keys(healthReport.circuitBreakers).length
        }
      },
      message: `System status: ${healthReport.overall}`
    })
  );
}

async function getDetailedMetrics() {
  // Collect fresh metrics
  await systemHealthMonitor.collectSystemMetrics();
  
  const healthReport = systemHealthMonitor.getHealthReport();
  
  return NextResponse.json(
    ok({
      entities: {
        metrics: healthReport.metrics,
        circuitBreakers: healthReport.circuitBreakers,
        summary: {
          totalMetrics: healthReport.metrics.length,
          healthyMetrics: healthReport.metrics.filter(m => m.status === 'healthy').length,
          warningMetrics: healthReport.metrics.filter(m => m.status === 'warning').length,
          criticalMetrics: healthReport.metrics.filter(m => m.status === 'critical').length
        }
      },
      message: 'Detailed system metrics retrieved'
    })
  );
}

async function getSystemAlerts() {
  const healthReport = systemHealthMonitor.getHealthReport();
  
  return NextResponse.json(
    ok({
      entities: {
        alerts: healthReport.alerts,
        summary: {
          total: healthReport.alerts.length,
          critical: healthReport.alerts.filter(a => a.severity === 'critical').length,
          warning: healthReport.alerts.filter(a => a.severity === 'warning').length,
          info: healthReport.alerts.filter(a => a.severity === 'info').length
        }
      },
      message: `${healthReport.alerts.length} active alerts`
    })
  );
}

async function getCircuitBreakerStatus() {
  const breakerMetrics = circuitBreakerRegistry.getAllMetrics();
  
  const summary = Object.entries(breakerMetrics).reduce((acc, [name, metrics]) => {
    acc[metrics.state.toLowerCase()]++;
    return acc;
  }, { closed: 0, open: 0, half_open: 0 } as Record<string, number>);
  
  return NextResponse.json(
    ok({
      entities: {
        circuitBreakers: breakerMetrics,
        summary
      },
      message: 'Circuit breaker status retrieved'
    })
  );
}

async function runHealthChecks() {
  const checks = await Promise.allSettled([
    HealthChecks.checkFileSystemHealth(),
    HealthChecks.checkDataStructureHealth()
  ]);
  
  const results = checks.map((check, index) => {
    const checkNames = ['filesystem', 'data_structure'];
    return {
      name: checkNames[index],
      status: check.status,
      result: check.status === 'fulfilled' ? check.value : null,
      error: check.status === 'rejected' ? check.reason : null
    };
  });
  
  const allHealthy = results.every(r => 
    r.status === 'fulfilled' && r.result?.status === 'healthy'
  );
  
  return NextResponse.json(
    ok({
      entities: {
        healthChecks: results,
        overall: allHealthy ? 'healthy' : 'unhealthy'
      },
      message: `Health checks completed - ${allHealthy ? 'all systems healthy' : 'issues detected'}`
    })
  );
}

async function handleSystemHealthPost(request: NextRequest) {
  // Check authentication
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      err(ErrorCodes.UNAUTHORIZED, 'Authentication required', 401),
      { status: 401 }
    );
  }

  const { action, alertId } = await request.json();

  switch (action) {
    case 'resolve-alert':
      if (!alertId) {
        return NextResponse.json(
          err(ErrorCodes.MISSING_REQUIRED_FIELD, 'Alert ID is required', 400),
          { status: 400 }
        );
      }
      
      systemHealthMonitor.resolveAlert(alertId);
      
      return NextResponse.json(
        ok({
          entities: { resolvedAlert: alertId },
          message: 'Alert resolved successfully'
        })
      );
    
    case 'reset-circuit-breakers':
      circuitBreakerRegistry.resetAll();
      
      return NextResponse.json(
        ok({
          entities: { action: 'reset-circuit-breakers' },
          message: 'All circuit breakers reset successfully'
        })
      );
    
    case 'collect-metrics':
      await systemHealthMonitor.collectSystemMetrics();
      
      return NextResponse.json(
        ok({
          entities: { action: 'collect-metrics' },
          message: 'System metrics collected successfully'
        })
      );
    
    default:
      return NextResponse.json(
        err(ErrorCodes.INVALID_INPUT, `Invalid action: ${action}`, 400),
        { status: 400 }
      );
  }
}

// Wrap handlers with error handling
export const GET = withErrorHandling(handleSystemHealth);
export const POST = withErrorHandling(handleSystemHealthPost);
