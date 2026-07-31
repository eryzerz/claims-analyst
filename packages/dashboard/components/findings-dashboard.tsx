'use client';

import { useState, useMemo } from 'react';

interface Hypothesis {
  id: string;
  hypothesis: string;
  question: string;
  score: number;
  rationale: string;
  evidenceQueries: string[];
}

interface FindingCard {
  id: string;
  signalClusterId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  summary: string;
  hypotheses: Hypothesis[];
  recommendation: string;
  evidencePath: {
    signals: string[];
    graphEdgesTraversed: string[];
    dataQueriesRun: string[];
  };
}

const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
const severityColors: Record<string, string> = {
  critical: 'bg-red-900 text-red-100 border-red-800',
  high: 'bg-orange-800 text-orange-100 border-orange-700',
  medium: 'bg-yellow-800 text-yellow-100 border-yellow-700',
  low: 'bg-slate-700 text-slate-200 border-slate-600',
};
const severityDots: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-slate-500',
};

export default function FindingsDashboard({ findings }: { findings: FindingCard[] }) {
  const [filter, setFilter] = useState<string>('all');
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let result = findings;
    if (filter === 'upcoding') result = findings.filter((c) => c.title.includes('Upcoding'));
    if (filter === 'readmission') result = findings.filter((c) => c.title.includes('Readmission'));
    if (filter === 'geographic') result = findings.filter((c) => c.title.includes('Geographic'));
    return result.sort(
      (a, b) => severityOrder[a.severity as keyof typeof severityOrder] - severityOrder[b.severity as keyof typeof severityOrder],
    );
  }, [findings, filter]);

  const tabs = [
    { key: 'all', label: 'All Signals', count: findings.length },
    { key: 'upcoding', label: 'Upcoding', count: findings.filter((c) => c.title.includes('Upcoding')).length },
    { key: 'readmission', label: 'Readmission', count: findings.filter((c) => c.title.includes('Readmission')).length },
    { key: 'geographic', label: 'Geographic', count: findings.filter((c) => c.title.includes('Geographic')).length },
  ];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight mb-1">Claims Analyst</h1>
        <p className="text-muted-foreground text-sm">AI-powered healthcare fraud detection — signal feed</p>
      </header>

      <nav className="flex gap-1 mb-6 border-b border-border pb-px overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-3 py-2 text-sm font-medium rounded-t-md transition-colors whitespace-nowrap ${
              filter === tab.key
                ? 'bg-card text-foreground border border-border border-b-card -mb-px'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
            <span className="ml-1.5 text-xs text-muted-foreground">{tab.count}</span>
          </button>
        ))}
      </nav>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8 text-center">No findings for this filter.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((card) => {
            const isExpanded = expandedCard === card.id;
            return (
              <article
                key={card.id}
                className="border border-border rounded-lg bg-card overflow-hidden transition-shadow hover:shadow-sm"
              >
                <button
                  onClick={() => setExpandedCard(isExpanded ? null : card.id)}
                  className="w-full text-left p-4 flex items-start gap-3"
                >
                  <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${severityDots[card.severity]}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-xs px-1.5 py-0.5 rounded border ${severityColors[card.severity]}`}>
                        {card.severity.toUpperCase()}
                      </span>
                      <h3 className="text-sm font-medium truncate">{card.title}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{card.summary}</p>
                  </div>
                  <svg
                    className={`w-4 h-4 mt-1 flex-shrink-0 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isExpanded && (
                  <div className="border-t border-border px-4 py-4 space-y-4 bg-muted/30">
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                        Hypotheses ({card.hypotheses.length})
                      </h4>
                      <div className="space-y-2">
                        {card.hypotheses.map((hyp) => (
                          <div key={hyp.id} className="border border-border rounded-md p-3 bg-card">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-sm font-medium">{hyp.question}</p>
                              <span
                                className={`text-xs px-1.5 py-0.5 rounded font-mono ${
                                  hyp.score >= 0.7 ? 'bg-red-900 text-red-100' : hyp.score >= 0.5 ? 'bg-yellow-800 text-yellow-100' : 'bg-slate-700 text-slate-200'
                                }`}
                              >
                                {(hyp.score * 100).toFixed(0)}%
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">{hyp.rationale}</p>
                            {hyp.evidenceQueries.length > 0 && (
                              <details className="mt-2">
                                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                                  Evidence query ({hyp.evidenceQueries.length})
                                </summary>
                                <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-x-auto">{hyp.evidenceQueries[0]}</pre>
                              </details>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                        Recommendation
                      </h4>
                      <p className="text-sm">{card.recommendation}</p>
                    </div>

                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                        Evidence Path
                      </h4>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li><strong>Signals:</strong> {card.evidencePath.signals.join(', ')}</li>
                        <li><strong>Graph edges:</strong> {card.evidencePath.graphEdgesTraversed.join(', ')}</li>
                        <li><strong>Queries:</strong> {card.evidencePath.dataQueriesRun.join(', ')}</li>
                      </ul>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
