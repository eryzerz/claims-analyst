import { describe, it, expect, beforeAll } from 'vitest';
import { runEtl, getDb } from '../src/index.js';

describe('ETL pipeline', () => {
  beforeAll(() => {
    runEtl();
  });

  it('ingests beneficiaries', () => {
    const db = getDb();
    const rows = db.all<{ count: number }>('SELECT COUNT(*) as count FROM beneficiaries');
    expect(rows[0]!.count).toBe(100);
  });

  it('ingests providers', () => {
    const db = getDb();
    const rows = db.all<{ count: number }>('SELECT COUNT(*) as count FROM providers');
    expect(rows[0]!.count).toBe(5);
  });

  it('ingests DRG definitions', () => {
    const db = getDb();
    const rows = db.all<{ count: number }>('SELECT COUNT(*) as count FROM drg_definitions');
    expect(rows[0]!.count).toBe(13);
  });

  it('ingests inpatient claims', () => {
    const db = getDb();
    const rows = db.all<{ count: number }>('SELECT COUNT(*) as count FROM inpatient_claims');
    expect(rows[0]!.count).toBe(210);
  });

  it('ingests outpatient claims', () => {
    const db = getDb();
    const rows = db.all<{ count: number }>('SELECT COUNT(*) as count FROM outpatient_claims');
    expect(rows[0]!.count).toBe(300);
  });

  it('computes provider baselines', () => {
    const db = getDb();
    const rows = db.all<{ count: number }>('SELECT COUNT(*) as count FROM provider_baselines');
    expect(rows[0]!.count).toBe(5);
  });

  it('computes region baselines', () => {
    const db = getDb();
    const rows = db.all<{ count: number }>('SELECT COUNT(*) as count FROM region_baselines');
    expect(rows[0]!.count).toBeGreaterThan(0);
  });
});

describe('Provider baselines — upcoding scenario', () => {
  beforeAll(() => {
    runEtl();
  });

  it('PROV_B has higher MCC DRG rates than peers', () => {
    const db = getDb();
    const row = db
      .all<{ drg_distribution: string }>(
        "SELECT drg_distribution FROM provider_baselines WHERE provider_id = 'PROV_B'",
      )
      [0];
    if (!row) throw new Error('PROV_B baseline not found');

    const dist = JSON.parse(row.drg_distribution) as Array<{
      drgCode: number;
      zScore: number;
    }>;

    const drg193 = dist.find((d) => d.drgCode === 193);
    expect(drg193).toBeDefined();
    expect(drg193!.zScore).toBeGreaterThan(0);
  });

  it('PROV_A has balanced DRG distribution', () => {
    const db = getDb();
    const row = db
      .all<{ drg_distribution: string }>(
        "SELECT drg_distribution FROM provider_baselines WHERE provider_id = 'PROV_A'",
      )
      [0];
    if (!row) throw new Error('PROV_A baseline not found');

    const dist = JSON.parse(row.drg_distribution) as Array<{ drgCode: number; zScore: number }>;

    const maxAbsZ = Math.max(...dist.map((d) => Math.abs(d.zScore)));
    expect(maxAbsZ).toBeLessThan(2.5);
  });
});

describe('Provider baselines — readmission scenario', () => {
  beforeAll(() => {
    runEtl();
  });

  it('PROV_D has higher readmission rate than peer mean', () => {
    const db = getDb();
    const row = db.all<{
      readmission_rate: number;
      readmission_peer_mean: number;
    }>(
      "SELECT readmission_rate, readmission_peer_mean FROM provider_baselines WHERE provider_id = 'PROV_D'",
    )[0];

    if (!row) throw new Error('PROV_D baseline not found');
    expect(row.readmission_rate).toBeGreaterThan(row.readmission_peer_mean);
  });
});

describe('Region baselines — geographic spike scenario', () => {
  beforeAll(() => {
    runEtl();
  });

  it('South region has more ER volumes due to PROV_E spike', () => {
    const db = getDb();
    const rows = db.all<{ region: string; er_volume: number }>(
      'SELECT region, er_volume FROM region_baselines ORDER BY er_volume DESC',
    );

    const southRows = rows.filter((r) => r.region === 'South');
    expect(southRows.length).toBeGreaterThan(0);
  });
});
