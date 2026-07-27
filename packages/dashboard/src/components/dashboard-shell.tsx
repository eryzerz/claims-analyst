'use client';

import { useState, useCallback, useEffect } from 'react';
import type { SignalCategory } from '@claims-analyst/shared';
import { StatusBar } from './status-bar';
import { SignalFeed } from './signal-feed';
import { InvestigationPanel } from './investigation-panel';
import { CommandPrompt } from './command-prompt';
import type { DashboardData } from '../lib/data';
import { getFilteredAndSorted } from '../lib/filters';
import { ALL_CATEGORIES } from '../lib/severity';

export function DashboardShell({ data }: { data: DashboardData }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<SignalCategory[]>([...ALL_CATEGORIES]);

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
      setSelectedId((current) => {
        const sorted = getFilteredAndSorted(data.findingCards, activeFilters);
        const idx = sorted.findIndex((f) => f.id === current);
        if (direction === 'down') {
          return idx < sorted.length - 1 ? sorted[idx + 1]!.id : current;
        }
        return idx > 0 ? sorted[idx - 1]!.id : current;
      });
    },
    [data.findingCards, activeFilters],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
        <div className="flex-1 min-w-0" style={{ width: '70%' }}>
          <SignalFeed
            findings={data.findingCards}
            selectedId={selectedId}
            onSelect={setSelectedId}
            activeFilters={activeFilters}
          />
        </div>

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
