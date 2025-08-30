import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { assert } from '../../../../../lib/auth/session-guard';

/**
 * Execute upfront payment for proposal acceptance
 * 
 * Key difference from gig request upfront payment:
 * - Commissioner triggers the payment (authorization)
 * - Commissioner is charged (payment execution)
 * - Used when commissioner accepts a proposal
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 PROPOSAL UPFRONT PAYMENT: Starting execute-upfront route...');
    
    // Parse request
    console.log('📄 PROPOSAL UPFRONT PAYMENT: Parsing request body...');
    const { projectId, freelancerId, commissionerId } = await request.json();
    
    // Validate session - commissioner must be authenticated
    console.log('🔐 PROPOSAL UPFRONT PAYMENT: Starting auth check...');
    const session = await getServerSession(authOptions);
    assert(session?.user?.id, 'Unauthorized', 401);
    
    const sessionUserId = parseInt(session.user.id);
    console.log('✅ PROPOSAL UPFRONT PAYMENT: Auth successful, sessionUserId:', sessionUserId);
    
    // Validate that the authenticated user is the commissioner
    assert(sessionUserId === commissionerId, 'Unauthorized: Only the commissioner can trigger proposal payment', 403);
    console.log('✅ PROPOSAL UPFRONT PAYMENT: Commissioner authorization validated');

    // Delegate to the general completion upfront payment handler
    // Since commissioner is both authenticated and paying, we can use the general route
    console.log('🔄 PROPOSAL UPFRONT PAYMENT: Delegating to completion upfront payment...');
    
    const completionResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/payments/completion/execute-upfront`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
        'Cookie': request.headers.get('Cookie') || ''
      },
      body: JSON.stringify({ 
        projectId,
        context: 'proposal_acceptance',
        freelancerId,
        commissionerId
      })
    });

    if (!completionResponse.ok) {
      const errorText = await completionResponse.text();
      console.error(`❌ PROPOSAL UPFRONT PAYMENT: Completion payment failed with status ${completionResponse.status}:`, errorText);
      
      return NextResponse.json({
        success: false,
        error: 'Payment execution failed',
        details: errorText
      }, { status: completionResponse.status });
    }

    const completionResult = await completionResponse.json();
    console.log('✅ PROPOSAL UPFRONT PAYMENT: Completion payment successful:', completionResult);

    // Add proposal-specific context to the response
    const proposalResult = {
      ...completionResult,
      context: 'proposal_acceptance',
      trigger: 'commissioner',
      paymentFlow: 'commissioner_to_freelancer'
    };

    console.log('✅ PROPOSAL UPFRONT PAYMENT: Route completed successfully');
    return NextResponse.json(proposalResult);

  } catch (error: any) {
    console.error('❌ PROPOSAL UPFRONT PAYMENT: Route failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error',
      context: 'proposal_acceptance'
    }, { status: 500 });
  }
}
