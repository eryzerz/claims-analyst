import { streamText } from 'ai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

const aiProvider = createOpenAICompatible({
  name: 'claims-analyst',
  baseURL: process.env.OPENAI_BASE_URL || 'http://localhost:11434/v1',
  apiKey: process.env.OPENAI_API_KEY || 'ollama',
});

const model = aiProvider(process.env.AI_MODEL || 'qwen2.5');

export async function POST(req: Request) {
  const { messages, findingContext } = await req.json();

  const systemPrompt = findingContext
    ? `You are a healthcare fraud investigation assistant. Help the auditor understand and investigate findings.

Current finding context:
- Title: ${findingContext.title}
- Severity: ${findingContext.severity}
- Provider: ${findingContext.primaryProvider}
- Summary: ${findingContext.summary}
- Recommendation: ${findingContext.recommendation}

Respond concisely and factually. Reference specific evidence when possible.`
    : `You are a healthcare fraud investigation assistant. Help the auditor understand and investigate findings from the Claims Analyst system.`;

  const result = streamText({
    model,
    system: systemPrompt,
    messages: messages.filter(
      (m: { role: string }) => m.role === 'user' || m.role === 'assistant',
    ),
  });

  return result.toDataStreamResponse();
}
