import { Signal, SignalCluster, SIGNAL_CATEGORY } from '@claims-analyst/shared';

interface GrouperConfig {
  drgBaseMap: Map<number, number>;
}

export function groupSignals(signals: Signal[], config: GrouperConfig): SignalCluster[] {
  const clusters = new Map<string, Signal[]>();

  for (const signal of signals) {
    let key: string;

    if (signal.category === SIGNAL_CATEGORY.GEOGRAPHIC_SPIKE) {
      const region = (signal.context as { region?: string })?.region ?? signal.providerId;
      key = `geo__${region}`;
    } else if (signal.category === SIGNAL_CATEGORY.READMISSION) {
      key = `readmit__${signal.providerId}`;
    } else {
      const drgCode = (signal.context as { drgCode?: number })?.drgCode;
      const baseDrg = drgCode && config.drgBaseMap.has(drgCode)
        ? config.drgBaseMap.get(drgCode)!
        : (drgCode ?? 0);
      key = `${signal.providerId}__${baseDrg}__${signal.category}`;
    }

    if (!clusters.has(key)) clusters.set(key, []);
    clusters.get(key)!.push(signal);
  }

  const results: SignalCluster[] = [];
  let idx = 0;

  for (const [, sigs] of clusters) {
    idx++;
    const first = sigs[0]!;
    results.push({
      id: `cluster_${String(idx).padStart(3, '0')}`,
      signals: sigs,
      primaryProviderId: first.providerId,
      primaryDrgCode: (first.context as { drgCode?: number })?.drgCode,
      primaryRegion: (first.context as { region?: string })?.region,
      clusterRationale: `Grouped ${sigs.length} ${first.category} signals for ${first.providerId}`,
    });
  }

  return results;
}
