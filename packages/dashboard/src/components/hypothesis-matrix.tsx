import type { HypothesisVerdict } from '@claims-analyst/shared';

interface HypothesisMatrixProps {
  hypotheses: HypothesisVerdict[];
}

function scoreColor(score: number): string {
  if (score >= 0.7) return '#ff4444';
  if (score >= 0.5) return '#ff8800';
  if (score >= 0.3) return '#ffcc00';
  return '#44cc44';
}

function scoreBar(score: number): string {
  const pct = Math.round(score * 100);
  return `${pct}%`;
}

export function HypothesisMatrix({ hypotheses }: HypothesisMatrixProps) {
  return (
    <div className="grid gap-2">
      {hypotheses.map((h) => {
        const color = scoreColor(h.score);
        return (
          <div
            key={h.id}
            className="p-3 text-xs"
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border-1)',
              borderRadius: '2px',
            }}
          >
            <div className="flex items-center justify-between mb-1">
              <span
                className="font-medium text-xs"
                style={{ color: 'var(--text-primary)' }}
              >
                {h.hypothesis}
              </span>
              <span
                className="font-bold text-xs tabular-nums ml-2"
                style={{ color, fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}
              >
                {scoreBar(h.score)}
              </span>
            </div>

            <div
              className="w-full h-[4px] mb-2"
              style={{ background: 'var(--border-1)', borderRadius: '2px' }}
            >
              <div
                className="h-full rounded-sm transition-all"
                style={{
                  width: scoreBar(h.score),
                  background: color,
                }}
              />
            </div>

            <p
              className="text-xs leading-relaxed mb-2"
              style={{
                color: 'var(--text-secondary)',
                fontFamily: 'system-ui, sans-serif',
              }}
            >
              {h.rationale}
            </p>

            {h.evidenceQueries.length > 0 && (
              <div>
                <div
                  className="text-[10px] uppercase tracking-wider mb-1"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Queries
                </div>
                {h.evidenceQueries.map((q, i) => (
                  <code
                    key={i}
                    className="block text-[11px] p-1 mb-1"
                    style={{
                      background: 'var(--surface-3)',
                      color: 'var(--text-secondary)',
                      borderRadius: '2px',
                      wordBreak: 'break-all',
                    }}
                  >
                    {q}
                  </code>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
