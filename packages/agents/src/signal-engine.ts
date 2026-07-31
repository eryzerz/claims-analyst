import { getDb } from '@claims-analyst/data';
import { type DrgDistributionEntry } from '@claims-analyst/data';
import { Signal, SIGNAL_CATEGORY } from '@claims-analyst/shared';

const Z_SCORE_THRESHOLD = 2.0;
const READMISSION_Z_THRESHOLD = 2.0;
const GEO_VOLUME_Z_THRESHOLD = 2.5;
const GEO_WOW_THRESHOLD = 1.0;

export function detectSignals(): Signal[] {
  const db = getDb();
  const signals: Signal[] = [];

  // ── Upcoding & readmission from provider baselines ──
  const provRows = db.all<{
    provider_id: string;
    drg_distribution: string;
    readmission_rate: number;
    readmission_peer_mean: number;
    readmission_peer_stddev: number;
  }>('SELECT provider_id, drg_distribution, readmission_rate, readmission_peer_mean, readmission_peer_stddev FROM provider_baselines');

  for (const row of provRows) {
    const drgDist = JSON.parse(row.drg_distribution) as DrgDistributionEntry[];

    // Upcoding: per-DRG z-score check
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
          context: { drgCode: entry.drgCode },
          detectedAt: new Date().toISOString(),
        });
      }
    }

    // Readmission: z-score of readmission rate vs peers
    const readmissionZ =
      row.readmission_peer_stddev > 0
        ? (row.readmission_rate - row.readmission_peer_mean) / row.readmission_peer_stddev
        : 0;

    if (readmissionZ > READMISSION_Z_THRESHOLD && row.readmission_rate > 0) {
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

  // ── Geographic spikes from region baselines ──
  const regionRows = db.all<{
    region: string;
    year_week: string;
    er_volume: number;
    er_volume_mean: number;
    er_volume_stddev: number;
    week_over_week_change: number;
  }>('SELECT region, year_week, er_volume, er_volume_mean, er_volume_stddev, week_over_week_change FROM region_baselines');

  for (const row of regionRows) {
    const absWow = Math.abs(row.week_over_week_change);
    const volumeZ =
      row.er_volume_stddev > 0
        ? (row.er_volume - row.er_volume_mean) / row.er_volume_stddev
        : 0;

    if (Math.abs(volumeZ) > GEO_VOLUME_Z_THRESHOLD || absWow > GEO_WOW_THRESHOLD) {
      signals.push({
        id: `signal_geo_${row.region}_${row.year_week}`,
        category: SIGNAL_CATEGORY.GEOGRAPHIC_SPIKE,
        providerId: `region:${row.region}`,
        description:
          `ER visit volume spike in ${row.region}: ${row.er_volume} visits (week ${row.year_week}), WoW change ${(row.week_over_week_change * 100).toFixed(1)}% (σ = ${row.er_volume_stddev.toFixed(1)})`,
        confidence: Math.min(absWow / 5, 0.95),
        metrics: {
          zScore: row.week_over_week_change,
          peerMean: row.er_volume_mean,
          providerValue: row.er_volume,
          peerStdDev: row.er_volume_stddev,
        },
        context: { region: row.region, yearWeek: row.year_week },
        detectedAt: new Date().toISOString(),
      });
    }
  }

  return signals;
}
