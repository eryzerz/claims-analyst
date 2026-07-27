import type { FindingCard } from '@claims-analyst/shared';
import { SEVERITY_BG, SEVERITY_COLOR, SEVERITY_LABEL, CATEGORY_STYLES, detectCategory } from '../lib/severity';

interface FindingRowProps {
  finding: FindingCard;
  isSelected: boolean;
  onClick: () => void;
  index: number;
}

export function FindingRow({ finding, isSelected, onClick, index }: FindingRowProps) {
  const category = detectCategory(finding.title);
  const catStyle = CATEGORY_STYLES[category];

  const rowStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '32px 6px 140px 40px 1fr auto',
    alignItems: 'center',
    height: '28px',
    padding: '0 8px',
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontFamily: "'JetBrains Mono', 'Fira Code', ui-monospace, monospace",
    borderBottom: '1px solid var(--border-1)',
    borderLeft: isSelected ? '2px solid var(--accent)' : '2px solid transparent',
    background: isSelected ? 'var(--surface-2)' : index % 2 === 0 ? 'transparent' : 'var(--surface-1)',
    transition: 'background 80ms ease',
  };

  return (
    <div style={rowStyle} onClick={onClick} onKeyDown={(e) => { if (e.key === 'Enter') onClick(); }} role="row" tabIndex={0}>
      <div
        className="flex items-center justify-center"
        style={{
          width: '20px',
          height: '20px',
          borderRadius: '2px',
          background: SEVERITY_BG[finding.severity],
          color: SEVERITY_COLOR[finding.severity],
          fontSize: '0.625rem',
          fontWeight: 700,
        }}
      >
        {SEVERITY_LABEL[finding.severity]}
      </div>

      <div
        className="w-[6px] h-[14px]"
        style={{
          background: SEVERITY_COLOR[finding.severity],
          borderRadius: '1px',
        }}
      />

      <span
        style={{ color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
      >
        {finding.title}
      </span>

      <span className="text-center" style={{ color: catStyle.border, fontSize: '0.625rem', fontWeight: 700 }}>
        {catStyle.label}
      </span>

      <span style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {finding.summary}
      </span>

      <span style={{ color: 'var(--text-muted)', fontSize: '0.625rem', paddingLeft: '12px', whiteSpace: 'nowrap' }}>
        {finding.hypotheses.length}H
      </span>
    </div>
  );
}
