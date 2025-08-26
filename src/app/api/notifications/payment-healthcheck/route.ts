/**
 * Payment Notifications Healthcheck API Endpoint
 * 
 * Dev-only endpoint for monitoring payment notification system health
 * Returns current feature flag states, handler counts, and rollout stage
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHealthcheckResponse, getPaymentNotificationsHealthcheck, validatePaymentNotificationsState } from '@/lib/notifications/payment-notifications-healthcheck';

export async function GET(request: NextRequest) {
  try {
    // Only allow in non-production environments for security
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Healthcheck endpoint not available in production' },
        { status: 403 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'simple';
    const validate = searchParams.get('validate') === 'true';

    if (format === 'detailed') {
      // Return full healthcheck details
      const health = getPaymentNotificationsHealthcheck();
      const validation = validate ? validatePaymentNotificationsState() : null;

      return NextResponse.json({
        ...health,
        validation
      });
    } else {
      // Return simple healthcheck response
      const response = createHealthcheckResponse();
      return NextResponse.json(response);
    }
  } catch (error) {
    console.error('[payment-healthcheck] Error:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        error: 'Healthcheck failed',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Only allow in non-production environments
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Healthcheck controls not available in production' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, stage } = body;

    if (action === 'simulate' && stage) {
      const { simulateRolloutStage } = await import('@/lib/notifications/payment-notifications-healthcheck');
      simulateRolloutStage(stage);
      
      return NextResponse.json({
        success: true,
        message: `Simulated rollout stage: ${stage}`,
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'emergency_disable') {
      const { emergencyDisablePaymentNotifications } = await import('@/lib/notifications/payment-notifications-healthcheck');
      emergencyDisablePaymentNotifications();
      
      return NextResponse.json({
        success: true,
        message: 'Emergency disable activated',
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[payment-healthcheck] POST Error:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        error: 'Healthcheck action failed',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
