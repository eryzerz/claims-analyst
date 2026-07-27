import type { FindingCard, SignalCategory } from '@claims-analyst/shared';
import { SEVERITY_ORDER, detectCategory } from './severity';
import type { Severity } from './severity';

export function filterFindings(
  findings: FindingCard[],
  activeFilters: SignalCategory[],
): FindingCard[] {
  if (activeFilters.length >= 3) return findings;
  return findings.filter((f) => {
    const category = detectCategory(f.title);
    return activeFilters.includes(category);
  });
}

export function sortBySeverity(findings: FindingCard[]): FindingCard[] {
  return [...findings].sort((a, b) => {
    const aOrder = SEVERITY_ORDER[a.severity as Severity] ?? 4;
    const bOrder = SEVERITY_ORDER[b.severity as Severity] ?? 4;
    return aOrder - bOrder;
  });
}

export function getFilteredAndSorted(
  findings: FindingCard[],
  activeFilters: SignalCategory[],
): FindingCard[] {
  return sortBySeverity(filterFindings(findings, activeFilters));
}
