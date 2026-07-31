import { NextRequest } from 'next/server';
import { generateText } from 'ai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { FindingCard } from '@/lib/types';

const openrouter = createOpenAICompatible({
  name: 'openrouter',
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY!,
  headers: {
    'HTTP-Referer': 'https://claims-analyst.dev',
    'X-Title': 'Claims Analyst',
  },
});

const MODEL = 'deepseek/deepseek-v4-pro';

function buildSystemPrompt(context?: { mode: 'global' | 'finding'; summaries?: string; finding?: FindingCard }): string {
  let prompt = `You are a healthcare fraud investigation assistant for the Claims Analyst system. You analyze CMS healthcare claims data (SynPUF) to detect fraud, waste, and abuse patterns.

Your role is to help auditors understand detected signals, evaluate hypotheses, and recommend actions.

Current findings:
`;

  if (context?.mode === 'finding' && context.finding) {
    const f = context.finding;
    prompt += `
FOCUS: The user is asking about a specific finding. Here is the full data:

Title: ${f.title}
Severity: ${f.severity.toUpperCase()}
Summary: ${f.summary}

Hypotheses:
${f.hypotheses.map((h, i) => `${i + 1}. "${h.question}" — Score: ${(h.score * 100).toFixed(0)}% — ${h.rationale}`).join('\n')}

Recommendation: ${f.recommendation}

Evidence:
- Signals: ${f.evidencePath.signals.join(', ')}
- Graph edges traversed: ${f.evidencePath.graphEdgesTraversed.join(', ')}
- Queries run: ${f.evidencePath.dataQueriesRun.join(', ')}

Answer the user's question using this finding data. Be specific and reference the scores, hypotheses, and evidence. Suggest concrete next steps when appropriate.
`;
  } else {
    prompt += `
GLOBAL VIEW: The user sees the following findings. For count or severity questions, list the critical ones first.

${context?.summaries ?? 'No findings available.'}

Answer questions about the overall finding landscape. Reference specific findings by their title. Suggest filtering or selecting a specific finding card for deeper investigation.
`;
  }

  return prompt;
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    messages: Array<{ role: string; content: string }>;
    context?: { mode: 'global' | 'finding'; summaries?: string; finding?: FindingCard };
  };

  try {
    const result = await generateText({
      model: openrouter(MODEL),
      system: buildSystemPrompt(body.context),
      messages: body.messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      maxTokens: 2000,
      temperature: 0.3,
    });

    return new Response(
      JSON.stringify({ role: 'assistant', content: result.text }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Chat API error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        role: 'assistant',
        content: `I encountered an error while analyzing the findings. Please try again.\n\nDetails: ${message}`,
      }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  }
}
