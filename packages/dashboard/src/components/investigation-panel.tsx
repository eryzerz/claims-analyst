import type { FindingCard } from '@claims-analyst/shared';
import { FindingDetail } from './finding-detail';
import { SEVERITY_COLOR } from '../lib/severity';
import type { Severity } from '../lib/severity';

interface InvestigationPanelProps {
  finding: FindingCard | null;
  totalFindings: number;
  severityCounts: Record<string, number>;
}

export function InvestigationPanel({
  finding,
  totalFindings,
  severityCounts,
}: InvestigationPanelProps) {
  return (
    <aside
      className="h-full overflow-y-auto flex-shrink-0"
      style={{
        width: '30%',
        minWidth: '320px',
        borderLeft: '1px solid var(--border-1)',
        background: 'var(--surface-1)',
        fontFamily: "'JetBrains Mono', 'Fira Code', ui-monospace, monospace",
      }}
    >
      {finding ? (
        <FindingDetail finding={finding} />
      ) : (
        <div className="p-4">
          <div
            className="text-xs uppercase tracking-wider mb-4"
            style={{ color: 'var(--text-muted)' }}
          >
            System Overview
          </div>

          <div
            className="text-[10px] uppercase tracking-wider mb-2"
            style={{ color: 'var(--text-muted)' }}
          >
            Findings
          </div>
          <div className="mb-4">
            <div
              className="flex justify-between py-1 text-xs"
              style={{ borderBottom: '1px solid var(--border-1)' }}
            >
              <span style={{ color: 'var(--text-secondary)' }}>Total</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                {totalFindings}
              </span>
            </div>
            {(['critical', 'high', 'medium', 'low'] as Severity[]).map((sev) => {
              const count = severityCounts[sev] ?? 0;
              return (
                <div
                  key={sev}
                  className="flex justify-between py-1 text-xs"
                  style={{ borderBottom: '1px solid var(--border-1)' }}
                >
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {sev.toUpperCase()}
                  </span>
                  <span style={{ color: SEVERITY_COLOR[sev], fontWeight: 500 }}>
                    {count}
                  </span>
                </div>
              );
            })}
          </div>

          <div
            className="text-[10px] uppercase tracking-wider mb-2"
            style={{ color: 'var(--text-muted)' }}
          >
            Pipeline Status
          </div>
          <div
            className="py-1 text-xs"
            style={{ color: '#44cc44', borderBottom: '1px solid var(--border-1)' }}
          >
            ACTIVE
          </div>

          <div
            className="mt-4 p-3 text-xs"
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border-1)',
              borderRadius: '2px',
              color: 'var(--text-secondary)',
            }}
          >
            <div className="mb-1" style={{ color: 'var(--text-muted)' }}>
              KEYBOARD
            </div>
            <div className="grid gap-0.5" style={{ gridTemplateColumns: 'auto 1fr' }}>
              <span style={{ color: 'var(--accent)' }}>j/k</span>
              <span>navigate findings</span>
              <span style={{ color: 'var(--accent)' }}>Enter</span>
              <span>select / open detail</span>
              <span style={{ color: 'var(--accent)' }}>e</span>
              <span>escalate</span>
              <span style={{ color: 'var(--accent)' }}>d</span>
              <span>dismiss</span>
              <span style={{ color: 'var(--accent)' }}>/</span>
              <span>chat with agent</span>
              <span style={{ color: 'var(--accent)' }}>Esc</span>
              <span>close / deselect</span>
              <span style={{ color: 'var(--accent)' }}>f</span>
              <span>filter menu</span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
