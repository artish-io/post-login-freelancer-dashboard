import { NextResponse, NextRequest } from 'next/server';
// ✅ SAFE: Reuse shared infrastructure only
import { requireSession, assert } from '@/lib/auth/session-guard';
import { sanitizeApiInput } from '@/lib/security/input-sanitizer';
import { withErrorHandling, ok, err } from '@/lib/http/envelope';
// import { CompletionCalculationService } from '../../../services/completion-calculation-service'; // Module not found

// 🚨 CRITICAL: This is a COMPLETELY NEW route - does not modify existing calculation routes

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    // ✅ SAFE: Reuse auth infrastructure
    const { userId } = await requireSession(req);
    const body = await req.json();
    const { calculationType, projectId, totalBudget, totalTasks } = sanitizeApiInput(body);
    
    assert(calculationType, 'Calculation type is required', 400);
    
    switch (calculationType) {
      case 'upfront':
        return await handleUpfrontCalculation(totalBudget);
        
      case 'manual_invoice':
        return await handleManualInvoiceCalculation(totalBudget, totalTasks);
        
      case 'remaining_budget':
        return await handleRemainingBudgetCalculation(projectId, totalBudget);
        
      case 'validate_state':
        return await handleValidateState(projectId);
        
      case 'project_progress':
        return await handleProjectProgress(projectId);
        
      default:
        return NextResponse.json(err('Invalid calculation type', '400'), { status: 400 });
    }
  });
}

export async function GET(req: NextRequest) {
  return withErrorHandling(async () => {
    // ✅ SAFE: Reuse auth infrastructure
    const { userId } = await requireSession(req);
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    
    if (!projectId) {
      return NextResponse.json(err('Project ID is required', '400'), { status: 400 });
    }
    
    // Return comprehensive calculation summary for a project
    // TODO: Implement CompletionCalculationService or use alternative approach
    const validation = { isValid: true, errors: [] };
    const progress = { completed: 0, total: 0, percentage: 0 };
    
    return NextResponse.json(ok({
      validation,
      progress,
      calculations: {
        upfrontPercentage: 12,
        remainingPercentage: 88,
        manualInvoiceFormula: '(Total Budget × 0.88) ÷ Total Tasks',
        finalPaymentFormula: '(Total Budget × 0.88) - Manual Payments Total'
      }
    } as any));
  });
}

// Handler functions for each calculation type
async function handleUpfrontCalculation(totalBudget: number) {
  assert(totalBudget && totalBudget > 0, 'Valid total budget is required', 400);
  
  try {
    const upfrontAmount = totalBudget * 0.12; // 12% upfront calculation
    
    return NextResponse.json(ok({
      totalBudget,
      upfrontAmount,
      percentage: 12,
      formula: 'Total Budget × 0.12'
    } as any));
  } catch (error) {
    return NextResponse.json(err(error instanceof Error ? error.message : 'Calculation failed', '400'), { status: 400 });
  }
}

async function handleManualInvoiceCalculation(totalBudget: number, totalTasks: number) {
  assert(totalBudget && totalBudget > 0, 'Valid total budget is required', 400);
  assert(totalTasks && totalTasks > 0, 'Valid total tasks is required', 400);
  
  try {
    const remainingBudget = totalBudget * 0.88;
    const invoiceAmount = remainingBudget / totalTasks; // Manual calculation

    return NextResponse.json(ok({
      totalBudget,
      totalTasks,
      remainingBudget,
      invoiceAmount,
      formula: '(Total Budget × 0.88) ÷ Total Tasks'
    } as any));
  } catch (error) {
    return NextResponse.json(err(error instanceof Error ? error.message : 'Calculation failed', '400'), { status: 400 });
  }
}

async function handleRemainingBudgetCalculation(projectId: string, totalBudget: number) {
  assert(projectId, 'Project ID is required', 400);
  assert(totalBudget && totalBudget > 0, 'Valid total budget is required', 400);
  
  try {
    const remainingBudget = totalBudget * 0.88;
    const remainingAmount = remainingBudget; // TODO: Calculate actual remaining amount
    const manualPaymentsTotal = remainingBudget - remainingAmount;

    return NextResponse.json(ok({
      totalBudget,
      remainingBudget,
      manualPaymentsTotal,
      remainingAmount,
      formula: '(Total Budget × 0.88) - Manual Payments Total'
    } as any));
  } catch (error) {
    return NextResponse.json(err(error instanceof Error ? error.message : 'Calculation failed', '400'), { status: 400 });
  }
}

async function handleValidateState(projectId: string) {
  assert(projectId, 'Project ID is required', 400);
  
  try {
    const validation = { isValid: true, errors: [] }; // TODO: Implement validation logic

    return NextResponse.json(ok({
      validation
    } as any));
  } catch (error) {
    return NextResponse.json(err(error instanceof Error ? error.message : 'Validation failed', '400'), { status: 400 });
  }
}

async function handleProjectProgress(projectId: string) {
  assert(projectId, 'Project ID is required', 400);
  
  try {
    const progress = { completed: 0, total: 0, percentage: 0 }; // TODO: Implement progress calculation

    return NextResponse.json(ok({
      progress
    } as any));
  } catch (error) {
    return NextResponse.json(err(error instanceof Error ? error.message : 'Progress calculation failed', '400'), { status: 400 });
  }
}
