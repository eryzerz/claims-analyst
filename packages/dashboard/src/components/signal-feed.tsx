import type { FindingCard, SignalCategory } from '@claims-analyst/shared';
import { FindingRow } from './finding-row';
import { getFilteredAndSorted } from '../lib/filters';

interface SignalFeedProps {
  findings: FindingCard[];
  selectedId: string | null;
  focusedIndex: number;
  onSelect: (id: string) => void;
  activeFilters: SignalCategory[];
}

export function SignalFeed({
  findings,
  selectedId,
  focusedIndex,
  onSelect,
  activeFilters,
}: SignalFeedProps) {
  const sorted = getFilteredAndSorted(findings, activeFilters);

  if (sorted.length === 0) {
    const allFiltered = activeFilters.length < 3;
    return (
      <div
        className="flex items-center justify-center h-full"
        role="status"
        style={{ color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}
      >
        <div className="text-center">
          <div className="text-sm mb-2">NO SIGNALS</div>
          <div className="text-xs">
            {allFiltered ? 'Filter selection returned no results' : 'Pipeline has not detected any signals'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      role="listbox"
      aria-label="Finding signals list"
      aria-activedescendant={selectedId ? `finding-${selectedId}` : undefined}
      className="overflow-y-auto h-full"
      style={{ fontFamily: "'JetBrains Mono', 'Fira Code', ui-monospace, monospace" }}
    >
      <div
        aria-hidden
        className="grid px-2 text-[10px] uppercase tracking-wider select-none"
        style={{
          gridTemplateColumns: '32px 6px 140px 40px 1fr auto',
          padding: '4px 8px',
          color: 'var(--text-muted)',
          borderBottom: '1px solid var(--border-2)',
          position: 'sticky',
          top: 0,
          background: 'var(--ground)',
          zIndex: 1,
        }}
      >
        <span>SEV</span>
        <span />
        <span>TITLE</span>
        <span className="text-center">CAT</span>
        <span>SUMMARY</span>
        <span className="text-right">HYP</span>
      </div>
      {sorted.map((f, i) => (
        <FindingRow
          key={f.id}
          finding={f}
          isSelected={f.id === selectedId}
          isFocused={i === focusedIndex}
          onClick={() => onSelect(f.id)}
          index={i}
        />
      ))}
    </div>
  );
}
