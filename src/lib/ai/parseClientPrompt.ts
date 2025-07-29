import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function parseClientPrompt(prompt: string, budget?: string) {
  const fullPrompt = `
You are a freelance project assistant helping a client define their project.

Given this request: "${prompt}"
${budget ? `They mention a budget of: "${budget}".` : ''}

Please return a structured project plan including:
- Project title
- Suggested roles
- Estimated duration
- Suggested milestone breakdown
- Optional rate range
`;

  const res = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'You are a helpful RFP and freelance project assistant.' },
      { role: 'user', content: fullPrompt },
    ],
    max_tokens: 1000,
  });

  return res.choices[0].message.content;
}