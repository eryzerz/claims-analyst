'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { SignalCategory } from '@claims-analyst/shared';
import { StatusBar } from './status-bar';
import { SignalFeed } from './signal-feed';
import { InvestigationPanel } from './investigation-panel';
import { CommandPrompt } from './command-prompt';
import type { DashboardData } from '../lib/data';
import { getFilteredAndSorted } from '../lib/filters';
import { ALL_CATEGORIES } from '../lib/severity';

function isInputFocused(): boolean {
  const tag = document.activeElement?.tagName?.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select';
}

export function DashboardShell({ data }: { data: DashboardData }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<SignalCategory[]>([...ALL_CATEGORIES]);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const feedRef = useRef<HTMLDivElement>(null);

  const selectedFinding = selectedId
    ? data.findingCards.find((f) => f.id === selectedId) ?? null
    : null;

  const toggleFilter = useCallback((category: SignalCategory) => {
    setActiveFilters((prev) => {
      if (prev.includes(category)) {
        const next = prev.filter((c) => c !== category);
        return next.length === 0 ? prev : next;
      }
      return [...prev, category];
    });
  }, []);

  const navigateFindings = useCallback(
    (direction: 'up' | 'down') => {
      if (isInputFocused()) return;
      const sorted = getFilteredAndSorted(data.findingCards, activeFilters);
      if (sorted.length === 0) return;

      setFocusedIndex((prev) => {
        if (direction === 'down') {
          return prev < sorted.length - 1 ? prev + 1 : prev;
        }
        return prev > 0 ? prev - 1 : prev;
      });

      setSelectedId((current) => {
        const idx = sorted.findIndex((f) => f.id === current);
        const nextIdx = direction === 'down'
          ? Math.min(idx + 1, sorted.length - 1)
          : Math.max(idx - 1, 0);
        const nextId = sorted[nextIdx]!.id;

        requestAnimationFrame(() => {
          const el = document.getElementById(`finding-${nextId}`);
          el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        });

        return nextId;
      });
    },
    [data.findingCards, activeFilters],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isInputFocused()) return;
      if (e.key === 'j') {
        e.preventDefault();
        navigateFindings('down');
      }
      if (e.key === 'k') {
        e.preventDefault();
        navigateFindings('up');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigateFindings]);

  const severityCounts = data.findingCards.reduce(
    (acc, f) => {
      acc[f.severity] = (acc[f.severity] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--ground)' }}>
      <StatusBar
        signalCount={data.signalCount}
        clusterCount={data.clusterCount}
        activeFilters={activeFilters}
        onToggleFilter={toggleFilter}
      />

      <div className="flex-1 flex min-h-0">
        <main id="main-content" className="flex-1 min-w-0" style={{ width: '70%' }}>
          <SignalFeed
            findings={data.findingCards}
            selectedId={selectedId}
            focusedIndex={focusedIndex}
            onSelect={setSelectedId}
            activeFilters={activeFilters}
          />
        </main>

        <InvestigationPanel
          finding={selectedFinding}
          totalFindings={data.findingCards.length}
          severityCounts={severityCounts}
        />
      </div>

      <CommandPrompt activeFinding={selectedFinding} />
    </div>
  );
}
