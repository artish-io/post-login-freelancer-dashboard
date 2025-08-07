// src/app/api/test-openai/route.ts
import OpenAI from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI();

export async function GET() {
 const completion = await openai.chat.completions.create({
  model: 'gpt-3.5-turbo', // ← use this for now
  messages: [{ role: 'user', content: 'What is ARTISH?' }],
});

  return NextResponse.json(completion);
}