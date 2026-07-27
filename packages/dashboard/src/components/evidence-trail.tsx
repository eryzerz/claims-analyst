import type { EvidencePath } from '@claims-analyst/shared';

interface EvidenceTrailProps {
  evidencePath: EvidencePath;
}

export function EvidenceTrail({ evidencePath }: EvidenceTrailProps) {
  return (
    <div className="grid gap-2">
      {evidencePath.signals.length > 0 && (
        <div
          className="p-2 text-xs"
          style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border-1)',
            borderRadius: '2px',
          }}
        >
          <div
            className="text-[10px] uppercase tracking-wider mb-1"
            style={{ color: 'var(--text-muted)' }}
          >
            Signals ({evidencePath.signals.length})
          </div>
          <div className="flex flex-wrap gap-1">
            {evidencePath.signals.map((s, i) => (
              <span
                key={i}
                className="text-[11px] px-1.5 py-0.5"
                style={{
                  background: 'var(--surface-3)',
                  color: 'var(--text-secondary)',
                  borderRadius: '2px',
                  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                }}
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {evidencePath.graphEdgesTraversed.length > 0 && (
        <div
          className="p-2 text-xs"
          style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border-1)',
            borderRadius: '2px',
          }}
        >
          <div
            className="text-[10px] uppercase tracking-wider mb-1"
            style={{ color: 'var(--text-muted)' }}
          >
            Graph Edges ({evidencePath.graphEdgesTraversed.length})
          </div>
          <div className="grid gap-0.5">
            {evidencePath.graphEdgesTraversed.map((e, i) => (
              <span
                key={i}
                className="text-[11px]"
                style={{
                  color: 'var(--text-secondary)',
                  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                }}
              >
                {e.includes(' → ') ? (
                  <>
                    <span style={{ color: 'var(--text-muted)' }}>{e.split(' → ')[0]}</span>
                    <span style={{ color: 'var(--accent)' }}> → </span>
                    <span style={{ color: 'var(--text-primary)' }}>{e.split(' → ')[1]}</span>
                  </>
                ) : (
                  e
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {evidencePath.dataQueriesRun.length > 0 && (
        <div
          className="p-2 text-xs"
          style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border-1)',
            borderRadius: '2px',
          }}
        >
          <div
            className="text-[10px] uppercase tracking-wider mb-1"
            style={{ color: 'var(--text-muted)' }}
          >
            Data Queries ({evidencePath.dataQueriesRun.length})
          </div>
          {evidencePath.dataQueriesRun.map((q, i) => (
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

      {evidencePath.signals.length === 0 &&
        evidencePath.graphEdgesTraversed.length === 0 &&
        evidencePath.dataQueriesRun.length === 0 && (
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            No evidence trail recorded
          </span>
        )}
    </div>
  );
}
