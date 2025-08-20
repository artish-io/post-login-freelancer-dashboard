import { NextResponse, NextRequest } from 'next/server';
// ✅ SAFE: Reuse shared infrastructure only
import { requireSession, assert } from '@/lib/auth/session-guard';
import { sanitizeApiInput } from '@/lib/security/input-sanitizer';
import { withErrorHandling, ok, err } from '@/lib/http/envelope';
import { CompletionCalculationService } from '../../../services/completion-calculation-service';

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
        return NextResponse.json(err('Invalid calculation type', 400), { status: 400 });
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
      return NextResponse.json(err('Project ID is required', 400), { status: 400 });
    }
    
    // Return comprehensive calculation summary for a project
    const [validation, progress] = await Promise.all([
      CompletionCalculationService.validatePaymentState(projectId),
      CompletionCalculationService.calculateProjectProgress(projectId)
    ]);
    
    return NextResponse.json(ok({
      projectId,
      validation,
      progress,
      calculations: {
        upfrontPercentage: 12,
        remainingPercentage: 88,
        manualInvoiceFormula: '(Total Budget × 0.88) ÷ Total Tasks',
        finalPaymentFormula: '(Total Budget × 0.88) - Manual Payments Total'
      }
    }));
  });
}

// Handler functions for each calculation type
async function handleUpfrontCalculation(totalBudget: number) {
  assert(totalBudget && totalBudget > 0, 'Valid total budget is required', 400);
  
  try {
    const upfrontAmount = CompletionCalculationService.calculateUpfrontAmount(totalBudget);
    
    return NextResponse.json(ok({
      calculationType: 'upfront',
      totalBudget,
      upfrontAmount,
      percentage: 12,
      formula: 'Total Budget × 0.12'
    }));
  } catch (error) {
    return NextResponse.json(err(error instanceof Error ? error.message : 'Calculation failed', 400), { status: 400 });
  }
}

async function handleManualInvoiceCalculation(totalBudget: number, totalTasks: number) {
  assert(totalBudget && totalBudget > 0, 'Valid total budget is required', 400);
  assert(totalTasks && totalTasks > 0, 'Valid total tasks is required', 400);
  
  try {
    const invoiceAmount = CompletionCalculationService.calculateManualInvoiceAmount(totalBudget, totalTasks);
    const remainingBudget = totalBudget * 0.88;
    
    return NextResponse.json(ok({
      calculationType: 'manual_invoice',
      totalBudget,
      totalTasks,
      remainingBudget,
      invoiceAmount,
      formula: '(Total Budget × 0.88) ÷ Total Tasks'
    }));
  } catch (error) {
    return NextResponse.json(err(error instanceof Error ? error.message : 'Calculation failed', 400), { status: 400 });
  }
}

async function handleRemainingBudgetCalculation(projectId: string, totalBudget: number) {
  assert(projectId, 'Project ID is required', 400);
  assert(totalBudget && totalBudget > 0, 'Valid total budget is required', 400);
  
  try {
    const remainingAmount = await CompletionCalculationService.calculateRemainingBudget(projectId, totalBudget);
    const remainingBudget = totalBudget * 0.88;
    const manualPaymentsTotal = remainingBudget - remainingAmount;
    
    return NextResponse.json(ok({
      calculationType: 'remaining_budget',
      projectId,
      totalBudget,
      remainingBudget,
      manualPaymentsTotal,
      remainingAmount,
      formula: '(Total Budget × 0.88) - Manual Payments Total'
    }));
  } catch (error) {
    return NextResponse.json(err(error instanceof Error ? error.message : 'Calculation failed', 400), { status: 400 });
  }
}

async function handleValidateState(projectId: string) {
  assert(projectId, 'Project ID is required', 400);
  
  try {
    const validation = await CompletionCalculationService.validatePaymentState(projectId);
    
    return NextResponse.json(ok({
      calculationType: 'validate_state',
      projectId,
      validation
    }));
  } catch (error) {
    return NextResponse.json(err(error instanceof Error ? error.message : 'Validation failed', 400), { status: 400 });
  }
}

async function handleProjectProgress(projectId: string) {
  assert(projectId, 'Project ID is required', 400);
  
  try {
    const progress = await CompletionCalculationService.calculateProjectProgress(projectId);
    
    return NextResponse.json(ok({
      calculationType: 'project_progress',
      projectId,
      progress
    }));
  } catch (error) {
    return NextResponse.json(err(error instanceof Error ? error.message : 'Progress calculation failed', 400), { status: 400 });
  }
}
