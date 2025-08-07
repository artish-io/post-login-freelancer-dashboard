

import { OpenAI } from 'openai';
import { agentSystemInstructions } from './system-instructions';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function routePromptToIntent(prompt: string, userContext: any) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4-1106-preview',
    messages: [
      { role: 'system', content: agentSystemInstructions },
      { role: 'user', content: `Prompt: "${prompt}"\nUser: ${JSON.stringify(userContext)}` }
    ],
    functions: [
      {
        name: 'create_custom_proposal',
        description: 'Create a proposal from a prompt.',
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
        description: 'List a new digital product.',
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
        description: 'Help a freelancer bill a client.',
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
        description: 'Commissioner wants to post a new gig opportunity.',
        parameters: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            type: { type: 'string' }
          },
          required: ['title', 'type']
        }
      },
      {
        name: 'browse_freelancers',
        description: 'Commissioner browsing potential freelancers to hire.',
        parameters: {
          type: 'object',
          properties: {
            specialization: { type: 'string' }
          },
          required: ['specialization']
        }
      },
      {
        name: 'review_project_status',
        description: 'Review progress of an ongoing project.',
        parameters: {
          type: 'object',
          properties: {
            projectId: { type: 'string' }
          },
          required: ['projectId']
        }
      },
      {
        name: 'approve_milestone',
        description: 'Commissioner approves a submitted milestone.',
        parameters: {
          type: 'object',
          properties: {
            milestoneId: { type: 'string' }
          },
          required: ['milestoneId']
        }
      }
    ],
    function_call: 'auto'
  });

  return response.choices[0].message;
}