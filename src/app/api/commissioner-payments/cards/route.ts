import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/session-guard';
import fs from 'fs/promises';
import path from 'path';

const CARDS_PATH = path.join(process.cwd(), 'data/commissioner-payments/test-cards.json');

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireSession(request);
    
    const cardsData = await fs.readFile(CARDS_PATH, 'utf-8');
    const cards = JSON.parse(cardsData);
    
    const userCards = cards.filter((card: any) => card.commissionerId === userId);
    
    return NextResponse.json({ success: true, cards: userCards });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch cards' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireSession(request);
    const cardData = await request.json();
    
    const cardsData = await fs.readFile(CARDS_PATH, 'utf-8');
    const cards = JSON.parse(cardsData);
    
    const newCard = {
      id: `card_${Date.now()}`,
      commissionerId: userId,
      ...cardData,
      isTestCard: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    cards.push(newCard);
    await fs.writeFile(CARDS_PATH, JSON.stringify(cards, null, 2));
    
    return NextResponse.json({ success: true, card: newCard });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create card' }, { status: 500 });
  }
}
