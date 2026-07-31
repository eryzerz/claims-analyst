import type { FindingCard } from '@claims-analyst/shared';
import { HypothesisMatrix } from './hypothesis-matrix';
import { EvidenceTrail } from './evidence-trail';
import { SEVERITY_COLOR } from '../lib/severity';
import type { Severity } from '../lib/severity';

interface FindingDetailProps {
  finding: FindingCard;
}

export function FindingDetail({ finding }: FindingDetailProps) {
  const sevColor = SEVERITY_COLOR[finding.severity as Severity] ?? '#44cc44';
  return (
    <div>
      <div
        className="px-4 py-3"
        style={{
            borderBottom: `2px solid ${sevColor}`,
            background: 'var(--surface-2)',
          }}
        >
          <div
            className="text-[10px] uppercase tracking-wider mb-1"
            style={{ color: sevColor }}
          >
          {finding.severity}
        </div>
        <h2
          className="text-sm font-bold mb-1"
          style={{ color: 'var(--text-primary)' }}
        >
          {finding.title}
        </h2>
        <div
          className="text-xs mb-2"
          style={{ color: 'var(--text-muted)' }}
        >
          {finding.id}
        </div>
      </div>

      <div className="p-4">
        <h3
          className="text-[10px] uppercase tracking-wider mb-2 font-normal"
          style={{ color: 'var(--text-muted)' }}
        >
          Summary
        </h3>
        <p
          className="text-xs leading-relaxed mb-4"
          style={{ color: 'var(--text-secondary)', fontFamily: 'system-ui, sans-serif' }}
        >
          {finding.summary}
        </p>

        <h3
          className="text-[10px] uppercase tracking-wider mb-2 font-normal"
          style={{ color: 'var(--text-muted)' }}
        >
          Hypotheses ({finding.hypotheses.length})
        </h3>
        <HypothesisMatrix hypotheses={finding.hypotheses} />

        <h3
          className="text-[10px] uppercase tracking-wider mb-2 mt-4 font-normal"
          style={{ color: 'var(--text-muted)' }}
        >
          Evidence Path
        </h3>
        <EvidenceTrail evidencePath={finding.evidencePath} />

        <h3
          className="text-[10px] uppercase tracking-wider mb-2 mt-4 font-normal"
          style={{ color: 'var(--text-muted)' }}
        >
          Recommendation
        </h3>
        <div
          className="p-3 text-xs leading-relaxed"
          style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border-1)',
            borderRadius: '2px',
            color: 'var(--text-primary)',
            borderLeft: `2px solid ${SEVERITY_COLOR[finding.severity]}`,
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          {finding.recommendation}
        </div>
      </div>
    </div>
  );
}
