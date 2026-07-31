import type { SignalCategory } from '@claims-analyst/shared';
import { CATEGORY_STYLES, ALL_CATEGORIES } from '../lib/severity';

interface StatusBarProps {
  signalCount: number;
  clusterCount: number;
  activeFilters: SignalCategory[];
  onToggleFilter: (category: SignalCategory) => void;
}

const CATEGORY_ARIA_LABELS: Record<SignalCategory, string> = {
  upcoding: 'Filter by upcoding',
  readmission: 'Filter by readmission',
  geographic_spike: 'Filter by geographic spikes',
};

export function StatusBar({
  signalCount,
  clusterCount,
  activeFilters,
  onToggleFilter,
}: StatusBarProps) {
  return (
    <header
      className="flex items-center justify-between px-4 h-[36px] border-b flex-shrink-0 select-none"
      style={{ borderColor: 'var(--border-1)', background: 'var(--surface-1)' }}
    >
      <div className="flex items-center gap-3">
        <h1
          className="font-mono text-xs tracking-wider uppercase"
          style={{ color: 'var(--text-secondary)' }}
        >
          Claims Analyst
        </h1>
        <span aria-hidden className="font-mono text-xs" style={{ color: 'var(--border-2)' }}>
          |
        </span>
        <div className="flex items-center gap-2">
          {ALL_CATEGORIES.map((cat) => {
            const active = activeFilters.includes(cat);
            const style = CATEGORY_STYLES[cat];
            return (
              <button
                key={cat}
                type="button"
                aria-pressed={active}
                aria-label={CATEGORY_ARIA_LABELS[cat]}
                onClick={() => onToggleFilter(cat)}
                className="font-mono text-[11px] px-2 py-[3px] transition-colors cursor-pointer hover:brightness-125"
                style={{
                  background: active ? style.bg : 'transparent',
                  border: `1px solid ${active ? style.border : 'var(--border-1)'}`,
                  color: active ? style.border : 'var(--text-muted)',
                  borderRadius: '2px',
                }}
              >
                {style.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
            SIG
          </span>
          <span className="font-mono text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
            {signalCount}
          </span>
        </div>
        <span aria-hidden style={{ color: 'var(--border-2)' }}>|</span>
        <div className="flex items-center gap-1">
          <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
            CLU
          </span>
          <span className="font-mono text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
            {clusterCount}
          </span>
        </div>
        <span aria-hidden style={{ color: 'var(--border-2)' }}>|</span>
        <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
          {new Date().toLocaleTimeString('en-US', { hour12: false })}
        </span>
      </div>
    </header>
  );
}
