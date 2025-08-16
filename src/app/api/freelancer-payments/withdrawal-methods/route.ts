import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/session-guard';
import fs from 'fs/promises';
import path from 'path';

const WITHDRAWAL_METHODS_PATH = path.join(process.cwd(), 'data/freelancer-payments/withdrawal-methods.json');

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireSession(request);
    
    const methodsData = await fs.readFile(WITHDRAWAL_METHODS_PATH, 'utf-8');
    const methods = JSON.parse(methodsData);
    
    const userMethods = methods.filter((method: any) => method.freelancerId === userId);
    
    return NextResponse.json({ success: true, withdrawalMethods: userMethods });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch withdrawal methods' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireSession(request);
    const methodData = await request.json();
    
    const methodsData = await fs.readFile(WITHDRAWAL_METHODS_PATH, 'utf-8');
    const methods = JSON.parse(methodsData);
    
    // If this is the first method, make it default
    const userMethods = methods.filter((m: any) => m.freelancerId === userId);
    const isFirstMethod = userMethods.length === 0;
    
    const newMethod = {
      id: `withdraw_${Date.now()}`,
      freelancerId: userId,
      ...methodData,
      isDefault: isFirstMethod || methodData.isDefault,
      isTestAccount: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // If setting as default, unset other defaults
    if (newMethod.isDefault) {
      methods.forEach((method: any) => {
        if (method.freelancerId === userId && method.id !== newMethod.id) {
          method.isDefault = false;
        }
      });
    }
    
    methods.push(newMethod);
    await fs.writeFile(WITHDRAWAL_METHODS_PATH, JSON.stringify(methods, null, 2));
    
    return NextResponse.json({ success: true, withdrawalMethod: newMethod });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create withdrawal method' }, { status: 500 });
  }
}
