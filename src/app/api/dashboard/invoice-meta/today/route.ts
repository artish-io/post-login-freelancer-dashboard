// src/app/api/dashboard/invoice-meta/today/route.ts

import { NextResponse } from 'next/server';

export async function GET() {
  const today = new Date();
  const isoDate = today.toISOString().split('T')[0]; // yyyy-mm-dd

  return NextResponse.json({ date: isoDate });
}