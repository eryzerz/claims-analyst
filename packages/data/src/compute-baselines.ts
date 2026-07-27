import { Stats } from 'als-statistics';
import { TimeSeries } from 'pond-ts';
import { getDb } from './db.js';
import {
  beneficiaries,
  providers,
  inpatientClaims,
  outpatientClaims,
  drgDefinitions,
  providerBaselines,
  regionBaselines,
} from './schema.js';
import { eq, and, isNotNull } from 'drizzle-orm';

const db = () => getDb();

export interface DrgDistributionEntry {
  drgCode: number;
  count: number;
  rate: number;
  peerMeanRate: number;
  peerStdDev: number;
  zScore: number;
}

export interface ProviderBaseline {
  providerId: string;
  drgDistribution: DrgDistributionEntry[];
  readmissionRate: number;
  readmissionPeerMean: number;
  readmissionPeerStdDev: number;
  patientAcuityMean: number;
  totalClaims: number;
}

export interface RegionWeekBaseline {
  region: string;
  yearWeek: string;
  erVolume: number;
  erVolumeMean: number;
  erVolumeStdDev: number;
  weekOverWeekChange: number;
}

export function computeProviderBaselines(): ProviderBaseline[] {
  const d = db();

  const allProviders = d.select({ id: providers.id }).from(providers).all();
  const allDrgs = d.select({ code: drgDefinitions.code }).from(drgDefinitions).all();

  if (allProviders.length === 0 || allDrgs.length === 0) return [];

  const drgCountsByProvider = new Map<string, Map<number, number>>();
  const totalClaimsByProvider = new Map<string, number>();

  for (const p of allProviders) {
    drgCountsByProvider.set(p.id, new Map());
    totalClaimsByProvider.set(p.id, 0);
  }

  const claims = d
    .select({
      providerId: inpatientClaims.providerId,
      drgCode: inpatientClaims.drgCode,
    })
    .from(inpatientClaims)
    .all();

  for (const c of claims) {
    const map = drgCountsByProvider.get(c.providerId)!;
    map.set(c.drgCode, (map.get(c.drgCode) ?? 0) + 1);
    totalClaimsByProvider.set(c.providerId, (totalClaimsByProvider.get(c.providerId) ?? 0) + 1);
  }

  const results: ProviderBaseline[] = [];

  for (const p of allProviders) {
    const totalClaims = totalClaimsByProvider.get(p.id) ?? 0;
    const providerRates = new Map<number, number>();

    for (const drg of allDrgs) {
      const count = drgCountsByProvider.get(p.id)?.get(drg.code) ?? 0;
      providerRates.set(drg.code, totalClaims > 0 ? count / totalClaims : 0);
    }

    const drgDistribution: DrgDistributionEntry[] = [];
    for (const drg of allDrgs) {
      const rates: number[] = [];
      for (const peer of allProviders) {
        if (peer.id === p.id) continue;
        const peerTotal = totalClaimsByProvider.get(peer.id) ?? 0;
        const peerCount = drgCountsByProvider.get(peer.id)?.get(drg.code) ?? 0;
        if (peerTotal > 0) {
          rates.push(peerCount / peerTotal);
        }
      }

      const peerMean = rates.length > 0 ? Stats.mean({ values: rates }) : 0;
      const peerStdDev =
        rates.length > 1 ? Stats.stdDevSample({ values: rates }) : 0;
      const providerRate = providerRates.get(drg.code) ?? 0;
      const zScore = Stats.zScore({ mean: peerMean, stdDev: peerStdDev, values: rates }, providerRate);

      drgDistribution.push({
        drgCode: drg.code,
        count: drgCountsByProvider.get(p.id)?.get(drg.code) ?? 0,
        rate: providerRate,
        peerMeanRate: peerMean,
        peerStdDev,
        zScore,
      });
    }

    const readmission = computeReadmissionRate(p.id);
    const allReadmissionRates = allProviders
      .filter((pp) => pp.id !== p.id)
      .map((pp) => computeReadmissionRate(pp.id));
    const readmissionPeerMean =
      allReadmissionRates.length > 0 ? Stats.mean({ values: allReadmissionRates }) : 0;
    const readmissionPeerStdDev =
      allReadmissionRates.length > 1
        ? Stats.stdDevSample({ values: allReadmissionRates })
        : 0;

    const acuity = computePatientAcuity(p.id);

    results.push({
      providerId: p.id,
      drgDistribution,
      readmissionRate: readmission,
      readmissionPeerMean,
      readmissionPeerStdDev,
      patientAcuityMean: acuity,
      totalClaims,
    });
  }

  return results;
}

function computeReadmissionRate(providerId: string): number {
  const d = db();

  const discharges = d
    .select({
      beneficiaryId: inpatientClaims.beneficiaryId,
      dischargeDate: inpatientClaims.dischargeDate,
    })
    .from(inpatientClaims)
    .where(
      and(
        eq(inpatientClaims.providerId, providerId),
        isNotNull(inpatientClaims.dischargeDate),
      ),
    )
    .orderBy(inpatientClaims.beneficiaryId, inpatientClaims.dischargeDate)
    .all();

  if (discharges.length === 0) return 0;

  let readmissionCount = 0;
  let indexAdmissionCount = 0;

  const byPatient = new Map<string, string[]>();
  for (const d of discharges) {
    if (!byPatient.has(d.beneficiaryId)) byPatient.set(d.beneficiaryId, []);
    byPatient.get(d.beneficiaryId)!.push(d.dischargeDate);
  }

  for (const [, dates] of byPatient) {
    for (let i = 0; i < dates.length; i++) {
      if (i === 0) {
        indexAdmissionCount++;
      } else {
        const prevDate = new Date(dates[i - 1]!);
        const currDate = new Date(dates[i]!);
        const daysBetween = (currDate.getTime() - prevDate.getTime()) / 86400000;
        if (daysBetween <= 30) {
          readmissionCount++;
        }
      }
    }
  }

  return indexAdmissionCount > 0 ? readmissionCount / indexAdmissionCount : 0;
}

function computePatientAcuity(providerId: string): number {
  const d = db();

  const rows = d
    .selectDistinct({
      beneficiaryId: inpatientClaims.beneficiaryId,
    })
    .from(inpatientClaims)
    .where(eq(inpatientClaims.providerId, providerId))
    .all();

  if (rows.length === 0) return 0;

  let totalConditions = 0;
  for (const row of rows) {
    const ben = d
      .select({ chronicConditions: beneficiaries.chronicConditions })
      .from(beneficiaries)
      .where(eq(beneficiaries.id, row.beneficiaryId))
      .get();

    if (ben) {
      try {
        const conditions = JSON.parse(ben.chronicConditions) as string[];
        totalConditions += conditions.length;
      } catch {
        // ignore parse errors
      }
    }
  }

  return totalConditions / rows.length;
}

export function computeRegionBaselines(): RegionWeekBaseline[] {
  const d = db();

  const visits = d
    .select({
      providerId: outpatientClaims.providerId,
      claimStartDate: outpatientClaims.claimStartDate,
    })
    .from(outpatientClaims)
    .all();

  const providerRegion = new Map<string, string>();
  const allProviders = d.select().from(providers).all();
  for (const p of allProviders) {
    if (!providerRegion.has(p.id)) providerRegion.set(p.id, getRegion(p.stateCode));
  }

  const filtered = visits.filter((v) => providerRegion.has(v.providerId));
  if (filtered.length === 0) return [];

  // Build pond-ts TimeSeries indexed by claim timestamps
  const timestamps = filtered.map((v) => new Date(v.claimStartDate).getTime() / 1000);
  const counts = filtered.map(() => 1);

  const ts = TimeSeries.fromColumns({
    name: 'er_visits',
    schema: [{ name: 'time', kind: 'time' }, { name: 'count', kind: 'number' }],
    columns: { time: timestamps, count: counts },
  });

  // Aggregate into region-week buckets
  const regionWeekVolumes = new Map<string, number>();
  const points = ts.toPoints();

  for (let i = 0; i < points.length; i++) {
    const pt = points[i]!;
    if ((pt as { ts?: number }).ts === undefined) continue;
    const timestamp = (pt as { ts: number }).ts;
    const date = new Date(timestamp * 1000);
    const year = date.getFullYear();
    const week = getWeekNumber(date);
    const yearWeek = `${year}-W${String(week).padStart(2, '0')}`;
    const region = providerRegion.get(filtered[i]!.providerId) ?? 'Unknown';
    const key = `${region}|${yearWeek}`;
    regionWeekVolumes.set(key, (regionWeekVolumes.get(key) ?? 0) + 1);
  }

  // Compute region-level stats using als-statistics
  const regionVolumes = new Map<string, number[]>();
  for (const [key, volume] of regionWeekVolumes) {
    const [region] = key.split('|');
    if (!regionVolumes.has(region!)) regionVolumes.set(region!, []);
    regionVolumes.get(region!)!.push(volume);
  }

  const results: RegionWeekBaseline[] = [];
  const sortedEntries = [...regionWeekVolumes.entries()].sort();

  for (const [key, volume] of sortedEntries) {
    const [region, yearWeek] = key.split('|');
    const volumes = regionVolumes.get(region!) ?? [];

    const mean = volumes.length > 0 ? Stats.mean({ values: volumes }) : 0;
    const stdDev =
      volumes.length > 1 ? Stats.stdDevSample({ values: volumes }) : 0;

    const prevWeek = getPreviousWeekKey(yearWeek!);
    const prevVolume = regionWeekVolumes.get(`${region}|${prevWeek}`) ?? mean;
    const wowChange = prevVolume > 0 ? (volume - prevVolume) / prevVolume : 0;

    results.push({
      region: region!,
      yearWeek: yearWeek!,
      erVolume: volume,
      erVolumeMean: mean,
      erVolumeStdDev: stdDev,
      weekOverWeekChange: wowChange,
    });
  }

  return results;
}

function getRegion(stateCode: string): string {
  const northeast = ['NY', 'NJ', 'PA', 'CT', 'MA', 'RI', 'VT', 'NH', 'ME'];
  const midwest = ['IL', 'IN', 'OH', 'MI', 'WI', 'MN', 'IA', 'MO', 'KS', 'NE', 'SD', 'ND'];
  const south = ['TX', 'FL', 'GA', 'AL', 'MS', 'LA', 'AR', 'TN', 'KY', 'WV', 'VA', 'NC', 'SC', 'DC', 'DE', 'MD', 'OK'];
  const west = ['CA', 'WA', 'OR', 'NV', 'AZ', 'UT', 'CO', 'NM', 'ID', 'MT', 'WY', 'AK', 'HI'];

  if (northeast.includes(stateCode)) return 'Northeast';
  if (midwest.includes(stateCode)) return 'Midwest';
  if (south.includes(stateCode)) return 'South';
  if (west.includes(stateCode)) return 'West';
  return 'Unknown';
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function getPreviousWeekKey(yearWeek: string): string {
  const [yearStr, weekStr] = yearWeek.split('-W');
  const year = parseInt(yearStr!, 10);
  const week = parseInt(weekStr!, 10);
  if (week === 1) {
    return `${year - 1}-W52`;
  }
  return `${year}-W${String(week - 1).padStart(2, '0')}`;
}

export function storeBaselines() {
  const d = db();

  d.delete(providerBaselines).run();
  d.delete(regionBaselines).run();

  const now = new Date().toISOString();

  const provBls = computeProviderBaselines();
  for (const bl of provBls) {
    d.insert(providerBaselines)
      .values({
        providerId: bl.providerId,
        drgDistribution: JSON.stringify(bl.drgDistribution),
        readmissionRate: bl.readmissionRate,
        readmissionPeerMean: bl.readmissionPeerMean,
        readmissionPeerStdDev: bl.readmissionPeerStdDev,
        patientAcuityMean: bl.patientAcuityMean,
        totalClaims: bl.totalClaims,
        computedAt: now,
      })
      .run();
  }

  const regionBls = computeRegionBaselines();
  for (const bl of regionBls) {
    d.insert(regionBaselines)
      .values({
        region: bl.region,
        yearWeek: bl.yearWeek,
        erVolume: bl.erVolume,
        erVolumeMean: bl.erVolumeMean,
        erVolumeStdDev: bl.erVolumeStdDev,
        weekOverWeekChange: bl.weekOverWeekChange,
        computedAt: now,
      })
      .run();
  }

  return { providerBaselines: provBls.length, regionBaselines: regionBls.length };
}
