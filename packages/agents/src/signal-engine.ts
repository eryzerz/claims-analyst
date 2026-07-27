import { getDb } from '@claims-analyst/data';
import { type DrgDistributionEntry } from '@claims-analyst/data';
import { Signal, SIGNAL_CATEGORY } from '@claims-analyst/shared';

const Z_SCORE_THRESHOLD = 2.0;

export function detectSignals(): Signal[] {
  const db = getDb();

  const rows = db.all<{
    provider_id: string;
    drg_distribution: string;
    readmission_rate: number;
    readmission_peer_mean: number;
    readmission_peer_stddev: number;
  }>('SELECT provider_id, drg_distribution, readmission_rate, readmission_peer_mean, readmission_peer_stddev FROM provider_baselines');

  const signals: Signal[] = [];

  for (const row of rows) {
    const drgDist = JSON.parse(row.drg_distribution) as DrgDistributionEntry[];

    for (const entry of drgDist) {
      const absZ = Math.abs(entry.zScore);

      if (absZ > Z_SCORE_THRESHOLD) {
        const isUpcoding = entry.zScore > 0 && entry.rate > entry.peerMeanRate;

        signals.push({
          id: `signal_${row.provider_id}_${entry.drgCode}`,
          category: isUpcoding ? SIGNAL_CATEGORY.UPCODING : SIGNAL_CATEGORY.UPCODING,
          providerId: row.provider_id,
          description: isUpcoding
            ? `DRG ${entry.drgCode}: provider rate ${(entry.rate * 100).toFixed(1)}% exceeds peer mean ${(entry.peerMeanRate * 100).toFixed(1)}% (z = ${entry.zScore.toFixed(2)})`
            : `DRG ${entry.drgCode}: anomalous coding distribution (z = ${entry.zScore.toFixed(2)})`,
          confidence: Math.min(Math.abs(entry.zScore) / 5, 0.95),
          metrics: {
            zScore: entry.zScore,
            peerMean: entry.peerMeanRate,
            providerValue: entry.rate,
            peerStdDev: entry.peerStdDev,
          },
          detectedAt: new Date().toISOString(),
        });
      }
    }

    // Readmission signal
    const readmissionZ =
      row.readmission_peer_stddev > 0
        ? (row.readmission_rate - row.readmission_peer_mean) / row.readmission_peer_stddev
        : 0;

    if (Math.abs(readmissionZ) > Z_SCORE_THRESHOLD && row.readmission_rate > 0) {
      signals.push({
        id: `signal_${row.provider_id}_readmission`,
        category: SIGNAL_CATEGORY.READMISSION,
        providerId: row.provider_id,
        description:
          `Readmission rate ${(row.readmission_rate * 100).toFixed(1)}% vs peer mean ${(row.readmission_peer_mean * 100).toFixed(1)}% (z = ${readmissionZ.toFixed(2)})`,
        confidence: Math.min(Math.abs(readmissionZ) / 3, 0.95),
        metrics: {
          zScore: readmissionZ,
          peerMean: row.readmission_peer_mean,
          providerValue: row.readmission_rate,
          peerStdDev: row.readmission_peer_stddev,
        },
        detectedAt: new Date().toISOString(),
      });
    }
  }

  return signals;
}
