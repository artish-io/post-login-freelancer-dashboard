// src/app/api/dashboard/invoice-meta/generate-number/route.ts
import { NextResponse } from 'next/server';
import path from 'path';
import { readFile, writeFile } from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAllInvoices } from '@/lib/invoice-storage';
import { UnifiedStorageService } from '@/lib/storage/unified-storage-service';

// Rate limiting for invoice number generation
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // Max 10 invoice numbers per minute per user

const AUDIT_LOG_PATH = path.join(process.cwd(), 'data', 'logs', 'invoice-audit.json');

/**
 * Create a short prefix from the freelancer's full name (e.g. "Margsate Flether" → "MF")
 */
function getInitials(name: string) {
  const parts = name.trim().split(' ');
  const initials = parts.slice(0, 2).map(p => p[0]?.toUpperCase()).join('');
  return initials || 'XX';
}

/**
 * Generate a unique invoice number with user-specific prefix using modern hierarchical storage.
 * Format: TB-001, TB-002, etc. for freelancer "Tobi Philly"
 * Invoice numbers ALWAYS use freelancer initials, never UNQ format.
 */
async function generateUniqueInvoiceNumber(freelancerName: string): Promise<string> {
  const prefix = getInitials(freelancerName);

  // Get all existing invoices using modern hierarchical storage
  const existingInvoices = await getAllInvoices();
  const existingNumbers = new Set(existingInvoices.map((inv: any) => inv.invoiceNumber));

  // Find the highest counter for this prefix
  let maxCounter = 0;
  const pattern = new RegExp(`^${prefix}-(\\d+)$`);

  for (const invoiceNumber of existingNumbers) {
    const match = invoiceNumber.match(pattern);
    if (match) {
      const counter = parseInt(match[1], 10);
      if (counter > maxCounter) {
        maxCounter = counter;
      }
    }
  }

  // Generate next sequential number
  const nextCounter = maxCounter + 1;
  const paddedCounter = nextCounter.toString().padStart(3, '0');
  const invoiceNumber = `${prefix}-${paddedCounter}`;

  return invoiceNumber;
}

/**
 * Write audit trail for traceability.
 * Only logs meaningful status changes, not preview generations.
 */
async function logInvoiceAudit(invoiceNumber: string, status: string) {
  // Don't log preview status to reduce audit spam
  if (status === 'preview') {
    return;
  }

  const auditPathExists = await readFile(AUDIT_LOG_PATH).catch(() => null);
  const auditTrail = auditPathExists ? JSON.parse(auditPathExists.toString()) : [];

  auditTrail.push({
    invoiceNumber,
    status,
    timestamp: new Date().toISOString(),
    uuid: uuidv4(),
  });

  await writeFile(AUDIT_LOG_PATH, JSON.stringify(auditTrail, null, 2));
}

/**
 * Check rate limit for user
 */
function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);

  if (!userLimit || now > userLimit.resetTime) {
    // Reset or initialize rate limit
    rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (userLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  userLimit.count++;
  return true;
}

/**
 * API handler for generating invoice number.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'preview';

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const name = session.user.name || 'Generic User';

    // Check rate limit
    if (!checkRateLimit(userId)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before generating more invoice numbers.' },
        { status: 429 }
      );
    }

    const invoiceNumber = await generateUniqueInvoiceNumber(name);
    await logInvoiceAudit(invoiceNumber, status);

    console.log(`📄 Generated invoice number ${invoiceNumber} for user ${userId} (status: ${status})`);

    return NextResponse.json({ invoiceNumber, status });
  } catch (error) {
    console.error('Error generating invoice number:', error);
    return NextResponse.json({ error: 'Failed to generate invoice number' }, { status: 500 });
  }
}