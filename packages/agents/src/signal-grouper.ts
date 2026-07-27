import { Signal, SignalCluster } from '@claims-analyst/shared';

interface GrouperConfig {
  drgBaseMap: Map<number, number>;
}

export function groupSignals(signals: Signal[], config: GrouperConfig): SignalCluster[] {
  const clusters = new Map<string, Signal[]>();

  for (const signal of signals) {
    const baseDrg = signal.metrics.zScore ? getBaseDrgForSignal(signal, config) : 0;
    const key = `${signal.providerId}__${baseDrg}__${signal.category}`;

    if (!clusters.has(key)) clusters.set(key, []);
    clusters.get(key)!.push(signal);
  }

  const results: SignalCluster[] = [];
  let idx = 0;

  for (const [, sigs] of clusters) {
    idx++;
    results.push({
      id: `cluster_${String(idx).padStart(3, '0')}`,
      signals: sigs,
      primaryProviderId: sigs[0]!.providerId,
      primaryDrgCode: extractDrgCode(sigs[0]!),
      clusterRationale: `Grouped ${sigs.length} signals from provider ${sigs[0]!.providerId} (category: ${sigs[0]!.category})`,
    });
  }

  return results;
}

function getBaseDrgForSignal(signal: Signal, config: GrouperConfig): number {
  const drg = extractDrgCode(signal);
  if (drg && config.drgBaseMap.has(drg)) {
    return config.drgBaseMap.get(drg)!;
  }
  return drg ?? 0;
}

function extractDrgCode(signal: Signal): number | undefined {
  const match = signal.id.match(/signal_.+?_(\d+)$/);
  return match ? parseInt(match[1]!, 10) : undefined;
}
