import { runEtl, getDb } from '@claims-analyst/data';
import { getGraphDb, seedGraph, resetGraph } from '@claims-analyst/graph';
import type { FindingCard, SignalCluster } from '@claims-analyst/shared';
import { detectSignals } from './signal-engine.js';
import { groupSignals } from './signal-grouper.js';
import { enrichCluster } from './graph-enricher.js';
import { reason } from './reasoning-agent.js';

export interface PipelineResult {
  signals: number;
  clusters: number;
  findingCards: FindingCard[];
}

export function runPipeline(): PipelineResult {
  // 1. ETL: seed CSVs → SQLite baselines
  const etl = runEtl();

  // 2. Graph: SQLite → Kuzu
  resetGraph();
  const conn = getGraphDb();

  const db = getDb();
  const rawProviders = db.all<{ id: string; name: string; state_code: string; teaching_hospital: number; bed_count: number }>(
    'SELECT id, name, state_code, teaching_hospital, bed_count FROM providers',
  );
  const rawBens = db.all<{ id: string; state_code: string; sex: string }>(
    'SELECT id, state_code, sex FROM beneficiaries',
  );
  const rawIp = db.all<{
    id: string; beneficiary_id: string; provider_id: string; drg_code: number; payment_amount: number; utilization_day_count: number; admission_date: string; discharge_date: string;
  }>('SELECT * FROM inpatient_claims');
  const rawOp = db.all<{
    id: string; beneficiary_id: string; provider_id: string; payment_amount: number;
  }>('SELECT * FROM outpatient_claims');
  const rawDrgs = db.all<{
    code: number; base_drg: number; mdc: string; medical_surgical: string; severity_tier: string; description: string; weight: number;
  }>('SELECT * FROM drg_definitions');

  const seedResult = seedGraph(conn, {
    providers: rawProviders.map((p) => ({
      id: p.id,
      name: p.name,
      stateCode: p.state_code,
      teachingHospital: p.teaching_hospital === 1,
      bedCount: p.bed_count,
    })),
    beneficiaries: rawBens.map((b) => ({
      id: b.id,
      stateCode: b.state_code,
      sex: b.sex,
    })),
    inpatientClaims: rawIp.map((c) => ({
      id: c.id,
      beneficiaryId: c.beneficiary_id,
      providerId: c.provider_id,
      drgCode: c.drg_code,
      paymentAmount: c.payment_amount,
      utilizationDayCount: c.utilization_day_count,
      admissionDate: c.admission_date,
      dischargeDate: c.discharge_date,
    })),
    outpatientClaims: rawOp.map((c) => ({
      id: c.id,
      beneficiaryId: c.beneficiary_id,
      providerId: c.provider_id,
      paymentAmount: c.payment_amount,
    })),
    drgs: rawDrgs.map((d) => ({
      code: d.code,
      baseDrg: d.base_drg,
      mdc: d.mdc,
      medicalSurgical: d.medical_surgical,
      severityTier: d.severity_tier,
      description: d.description,
      weight: d.weight,
    })),
  });

  // 3. Signals: detect statistical anomalies
  const signals = detectSignals();

  // 4. Group: cluster related signals
  const drgBaseMap = new Map<number, number>();
  for (const d of rawDrgs) {
    drgBaseMap.set(d.code, d.base_drg);
  }
  const clusters = groupSignals(signals, { drgBaseMap });

  // 5. Enrich: attach graph context
  const findingCards: FindingCard[] = [];
  for (const cluster of clusters) {
    const enriched = enrichCluster(conn, cluster);
    const card = reason(enriched);
    findingCards.push(card);
  }

  return {
    signals: signals.length,
    clusters: clusters.length,
    findingCards,
  };
}
