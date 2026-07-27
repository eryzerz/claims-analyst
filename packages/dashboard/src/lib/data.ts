import { cache } from 'react';
import type { FindingCard } from '@claims-analyst/shared';
import { runPipeline } from '@claims-analyst/agents';

export interface DashboardData {
  findingCards: FindingCard[];
  signalCount: number;
  clusterCount: number;
}

export const getDashboardData = cache((): DashboardData => {
  const result = runPipeline();
  return {
    findingCards: result.findingCards,
    signalCount: result.signals,
    clusterCount: result.clusters,
  };
});
