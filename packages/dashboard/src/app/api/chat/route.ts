import { streamText } from 'ai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

const aiProvider = createOpenAICompatible({
  name: 'openrouter',
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY || '',
});

const model = aiProvider(process.env.AI_MODEL || 'deepseek/deepseek-v4-flash-0731');

function normalizeMessages(
  msgs: Array<{ role: string; content: string }>,
) {
  const filtered = msgs.filter(
    (m) => m.role === 'user' || m.role === 'assistant',
  );

  const cleaned: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  for (const m of filtered) {
    const role = m.role as 'user' | 'assistant';
    const content = typeof m.content === 'string' ? m.content : String(m.content ?? '');

    const last = cleaned[cleaned.length - 1];
    if (last && last.role === role) {
      cleaned[cleaned.length - 1] = { role, content };
    } else {
      cleaned.push({ role, content });
    }
  }

  return cleaned.length > 0 ? cleaned : [{ role: 'user' as const, content: 'Hello' }];
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, findingContext } = body;

    const systemPrompt = findingContext
      ? `You are a healthcare fraud investigation assistant. Help the auditor understand and investigate findings.

Current finding context:
- Title: ${findingContext.title}
- Severity: ${findingContext.severity}
- Provider: ${findingContext.primaryProvider}
- Summary: ${findingContext.summary}
- Recommendation: ${findingContext.recommendation}

Respond concisely and factually. Reference specific evidence when possible.`
      : 'You are a healthcare fraud investigation assistant. Help the auditor understand and investigate findings from the Claims Analyst system.';

    const normalized = normalizeMessages(messages ?? []);

    const result = streamText({
      model,
      system: systemPrompt,
      messages: normalized,
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error('[chat] Stream failed:', error);
    const message =
      error instanceof Error ? error.message : 'Unknown streaming error';
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}
