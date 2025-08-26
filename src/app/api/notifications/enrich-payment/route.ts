/**
 * Payment Enrichment API Endpoint
 * 
 * Uses the proper API-backed enrichment system to create milestone payment notifications
 * instead of hardcoded JSON manipulation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { enrichPaymentData } from '@/lib/notifications/payment-enrichment';
import { emitMilestonePaymentNotifications } from '@/lib/notifications/payment-notification-gateway';

export async function POST(request: NextRequest) {
  try {
    // Only allow in development for now
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Enrichment endpoint not available in production' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { actorId, targetId, projectId, invoiceNumber, amount } = body;

    console.log(`[enrich-payment] Processing payment: ${projectId}/${invoiceNumber}`);

    // Use the proper enrichment system
    const enrichedData = await enrichPaymentData({
      actorId,
      targetId,
      projectId,
      invoiceNumber,
      amount
    });

    if (!enrichedData) {
      return NextResponse.json({
        success: false,
        error: 'Enrichment failed - could not resolve payment data'
      });
    }

    console.log(`[enrich-payment] Enriched data:`, {
      projectId: enrichedData.projectId,
      invoiceNumber: enrichedData.invoiceNumber,
      amount: enrichedData.amount,
      freelancerName: enrichedData.freelancerName,
      organizationName: enrichedData.organizationName,
      remainingBudget: enrichedData.remainingBudget
    });

    // Emit proper notifications through the gateway
    await emitMilestonePaymentNotifications(enrichedData);

    return NextResponse.json({
      success: true,
      projectId: enrichedData.projectId,
      invoiceNumber: enrichedData.invoiceNumber,
      amount: enrichedData.amount,
      freelancerName: enrichedData.freelancerName,
      organizationName: enrichedData.organizationName,
      taskTitle: enrichedData.taskTitle,
      projectTitle: enrichedData.projectTitle,
      remainingBudget: enrichedData.remainingBudget
    });

  } catch (error) {
    console.error('[enrich-payment] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Enrichment failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
