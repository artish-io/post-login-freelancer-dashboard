import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { agentSystemInstructions } from '../../../../../agent/system-instructions';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!
});

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(10, '10 s') // max 10 requests per 10 seconds
});

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'anonymous';
    const { success } = await ratelimit.limit(ip.toString());
    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }
    const { prompt, user } = await req.json();

    const response = await openai.chat.completions.create({
      model: 'gpt-4-1106-preview',
      messages: [
        {
          role: 'system',
          content: agentSystemInstructions
        },
        {
          role: 'user',
          content: `Prompt: "${prompt}"\nUser: ${JSON.stringify(user)}`
        }
      ],
      functions: [
        {
          name: 'create_custom_proposal',
          description: 'Create a proposal from a user-defined prompt',
          parameters: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              category: { type: 'string' }
            },
            required: ['title', 'category']
          }
        },
        {
          name: 'list_product',
          description: 'List a new digital product in the marketplace',
          parameters: {
            type: 'object',
            properties: {
              productTitle: { type: 'string' },
              category: { type: 'string' }
            },
            required: ['productTitle', 'category']
          }
        },
        {
          name: 'generate_invoice',
          description: 'Generate an invoice from a prompt',
          parameters: {
            type: 'object',
            properties: {
              projectTitle: { type: 'string' },
              amount: { type: 'number' }
            },
            required: ['projectTitle', 'amount']
          }
        },
        {
          name: 'post_gig',
          description: 'Post a new project listing as a commissioner',
          parameters: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              scope: { type: 'string' }
            },
            required: ['title', 'scope']
          }
        },
        {
          name: 'browse_freelancers',
          description: 'Find and match freelancers to a gig',
          parameters: {
            type: 'object',
            properties: {
              skills: {
                type: 'array',
                items: { type: 'string' }
              }
            },
            required: ['skills']
          }
        }
      ],
      function_call: 'auto'
    });

    return NextResponse.json(response.choices[0].message);
  } catch (err) {
    console.error('[AGENT_ROUTE_ERROR]', err);
    return NextResponse.json({ error: 'Agent failed to process request' }, { status: 500 });
  }
}
