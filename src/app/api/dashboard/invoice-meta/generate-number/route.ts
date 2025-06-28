// src/app/api/dashboard/invoice-meta/generate-number/route.ts
import { NextResponse } from 'next/server';
import path from 'path';
import { readFile, writeFile } from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const INVOICES_PATH = path.join(process.cwd(), 'data', 'invoices.json');
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
 * Generate a unique invoice number with user-specific prefix.
 */
async function generateUniqueInvoiceNumber(freelancerName: string): Promise<string> {
  let invoiceNumber = '';
  let isUnique = false;
  const prefix = getInitials(freelancerName);

  const existingData = await readFile(INVOICES_PATH, 'utf-8');
  const invoices = JSON.parse(existingData);
  const existingNumbers = new Set(invoices.map((inv: any) => inv.invoiceNumber));

  while (!isUnique) {
    const suffix = Math.random().toString(36).slice(2, 7).toUpperCase(); // 5-char base36
    invoiceNumber = `${prefix}-${suffix}`;
    isUnique = !existingNumbers.has(invoiceNumber);
  }

  return invoiceNumber;
}

/**
 * Write audit trail for traceability.
 */
async function logInvoiceAudit(invoiceNumber: string, status: string) {
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
 * API handler for generating invoice number.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'preview';

  try {
    const session = await getServerSession(authOptions);
    const name = session?.user?.name || 'Generic User';

    const invoiceNumber = await generateUniqueInvoiceNumber(name);
    await logInvoiceAudit(invoiceNumber, status);

    return NextResponse.json({ invoiceNumber, status });
  } catch (error) {
    console.error('Error generating invoice number:', error);
    return NextResponse.json({ error: 'Failed to generate invoice number' }, { status: 500 });
  }
}