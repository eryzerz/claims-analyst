import { NextRequest } from 'next/server';
import type { FindingCard } from '@/lib/types';

interface ChatRequest {
  messages: Array<{ role: string; content: string }>;
  context?: { mode: 'global' | 'finding'; summaries?: string; finding?: FindingCard };
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as ChatRequest;
  const lastMessage = body.messages[body.messages.length - 1]?.content ?? '';
  const context = body.context;
  const q = lastMessage.toLowerCase();

  if (!context || (!context.finding && !context.summaries)) {
    return new Response(
      JSON.stringify({
        role: 'assistant',
        content: 'No findings data is available. Please refresh the dashboard to load detection results.',
      }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (context.mode === 'finding' && context.finding) {
    return findingMode(context.finding, q);
  }

  return globalMode(context.summaries ?? '', q);
}

function findingMode(finding: FindingCard, question: string): Response {
  const q = question.toLowerCase();
  let content = '';

  if (q.includes('summary') || q.includes('overview')) {
    content = `## ${finding.title}\n\n${finding.summary}\n\n**Severity**: ${finding.severity.toUpperCase()}\n**Hypotheses tested**: ${finding.hypotheses.length}\n**Recommendation**: ${finding.recommendation}`;
  } else if (q.includes('hypothesis') || q.includes('hypotheses') || q.includes('score')) {
    content = `## Hypotheses for this finding

${finding.hypotheses.map((h, i) =>
  `${i + 1}. **${h.question}** — score: ${(h.score * 100).toFixed(0)}%\n   ${h.rationale}`
).join('\n\n')}

The highest-scoring hypothesis is "${finding.hypotheses.sort((a, b) => b.score - a.score)[0]?.question}" at ${(Math.max(...finding.hypotheses.map(h => h.score)) * 100).toFixed(0)}%.`;
  } else if (q.includes('recommend') || q.includes('next') || q.includes('action')) {
    content = `## Recommended Action\n\n${finding.recommendation}`;
  } else if (q.includes('evidence') || q.includes('query') || q.includes('path') || q.includes('signal')) {
    content = `## Evidence Path\n\n**Signals**: ${finding.evidencePath.signals.join(', ')}\n**Graph edges**: ${finding.evidencePath.graphEdgesTraversed.join(', ')}\n**Queries run**: ${finding.evidencePath.dataQueriesRun.join(', ')}`;
  } else {
    content = `## ${finding.title} — ${finding.severity.toUpperCase()}\n\n${finding.summary}\n\n${finding.hypotheses.length} hypotheses tested. Top hypothesis: "${finding.hypotheses.sort((a, b) => b.score - a.score)[0]?.question}" scored at ${(Math.max(...finding.hypotheses.map(h => h.score)) * 100).toFixed(0)}%.\n\n${finding.recommendation}\n\nAsk me about: **hypotheses**, **recommendations**, or **evidence**.`;
  }

  return json(content);
}

function globalMode(summaries: string, question: string): Response {
  const lines = summaries.split('\n').filter(Boolean);
  const findingCount = lines.length;
  const q = question.toLowerCase();

  if (q.includes('count') || q.includes('how many') || q.includes('total')) {
    const criticalCount = lines.filter((l) => l.includes('[CRITICAL]')).length;
    const highCount = lines.filter((l) => l.includes('[HIGH]')).length;
    return json(
      `There are **${findingCount}** findings in the current view.\n- Critical: ${criticalCount}\n- High: ${highCount}\n- Medium/Low: ${findingCount - criticalCount - highCount}\n\nFilter the feed by scenario type or select a specific finding card for a deeper investigation.`,
    );
  }

  if (q.includes('severity') || q.includes('critical') || q.includes('priority')) {
    const criticalLines = lines.filter((l) => l.includes('[CRITICAL]'));
    if (criticalLines.length > 0) {
      return json(`**${criticalLines.length} critical findings** require immediate attention:\n\n${criticalLines.map(l => `- ${l.replace('[CRITICAL] ', '')}`).join('\n')}`);
    }
    return json('No critical findings in the current view. The severity distribution is shown in the signal feed above.');
  }

  if (q.includes('next') || q.includes('action') || q.includes('recommend')) {
    const criticalLines = lines.filter((l) => l.includes('[CRITICAL]'));
    const content = criticalLines.length > 0
      ? `**Priority actions** based on ${findingCount} findings:\n\n${criticalLines.map((l, i) => `${i + 1}. ${l.replace('[CRITICAL] ', '')}`).join('\n')}\n\nSelect a finding card to get specific recommendations for that case.`
      : `No critical findings. Here are all ${findingCount} active findings:\n\n${lines.map((l, i) => `${i + 1}. ${l}`).join('\n')}`;
    return json(content);
  }

  if (lines.length > 10 && (q.includes('summarize') || q.includes('all'))) {
    return json(
      `There are ${findingCount} findings — too many to list individually. Here are the most critical ones:\n\n${lines.slice(0, 5).join('\n')}\n\nFilter by scenario type or select a specific finding for detailed analysis.`,
    );
  }

  return json(
    `## ${findingCount} findings in view\n\n${lines.join('\n')}\n\nAsk about: **severity**, **recommendations**, **count**, or select a finding card for specific details.`,
  );
}

function json(content: string) {
  return new Response(JSON.stringify({ role: 'assistant', content }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
