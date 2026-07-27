import { describe, it, expect, beforeAll } from 'vitest';
import kuzu from 'kuzu';
import type { QueryResult } from 'kuzu';
import { getGraphDb, resetGraph, seedGraph } from '../src/index.js';
import {
  queryProviderSubgraph,
  queryUpcodingHypotheses,
  queryReadmissionHypotheses,
  queryGeographicHypotheses,
  queryKpiHierarchy,
  queryDrgBySeverity,
  queryDrgPeers,
} from '../src/index.js';

function getAllRows(result: QueryResult | QueryResult[]): Record<string, unknown>[] {
  const res = Array.isArray(result) ? result[0]! : result;
  const rows: Record<string, unknown>[] = [];
  while (res.hasNext()) {
    rows.push(res.getNextSync()!);
  }
  return rows;
}

const testData = {
  providers: [
    { id: 'PROV_A', name: 'Metropolitan General', stateCode: 'NY', teachingHospital: true, bedCount: 400 },
    { id: 'PROV_B', name: 'Riverside Medical', stateCode: 'NY', teachingHospital: false, bedCount: 200 },
    { id: 'PROV_C', name: 'Valley Community', stateCode: 'CA', teachingHospital: true, bedCount: 350 },
  ],
  beneficiaries: [
    { id: 'BEN00001', stateCode: 'NY', sex: '1' },
    { id: 'BEN00002', stateCode: 'NY', sex: '2' },
    { id: 'BEN00003', stateCode: 'CA', sex: '1' },
  ],
  inpatientClaims: [
    { id: 'IP001', beneficiaryId: 'BEN00001', providerId: 'PROV_A', drgCode: 193, paymentAmount: 8990, utilizationDayCount: 5, admissionDate: '2009-01-10', dischargeDate: '2009-01-15' },
    { id: 'IP002', beneficiaryId: 'BEN00001', providerId: 'PROV_A', drgCode: 195, paymentAmount: 4464, utilizationDayCount: 3, admissionDate: '2009-02-01', dischargeDate: '2009-02-04' },
    { id: 'IP003', beneficiaryId: 'BEN00002', providerId: 'PROV_B', drgCode: 193, paymentAmount: 8990, utilizationDayCount: 4, admissionDate: '2009-01-15', dischargeDate: '2009-01-19' },
    { id: 'IP004', beneficiaryId: 'BEN00002', providerId: 'PROV_B', drgCode: 193, paymentAmount: 8990, utilizationDayCount: 4, admissionDate: '2009-02-10', dischargeDate: '2009-02-14' },
    { id: 'IP005', beneficiaryId: 'BEN00003', providerId: 'PROV_C', drgCode: 282, paymentAmount: 4774, utilizationDayCount: 3, admissionDate: '2009-03-01', dischargeDate: '2009-03-04' },
  ],
  outpatientClaims: [
    { id: 'OP001', beneficiaryId: 'BEN00001', providerId: 'PROV_A', paymentAmount: 800 },
    { id: 'OP002', beneficiaryId: 'BEN00002', providerId: 'PROV_B', paymentAmount: 250 },
    { id: 'OP003', beneficiaryId: 'BEN00003', providerId: 'PROV_C', paymentAmount: 800 },
  ],
  drgs: [
    { code: 193, baseDrg: 193, mdc: '04', medicalSurgical: 'medical', severityTier: 'MCC', description: 'Pneumonia with MCC', weight: 1.45 },
    { code: 195, baseDrg: 193, mdc: '04', medicalSurgical: 'medical', severityTier: 'Non-CC', description: 'Pneumonia without CC/MCC', weight: 0.72 },
    { code: 282, baseDrg: 280, mdc: '05', medicalSurgical: 'medical', severityTier: 'Non-CC', description: 'AMI without CC/MCC', weight: 0.77 },
  ],
};

describe('Graph schema', () => {
  beforeAll(() => {
    resetGraph();
    seedGraph(getGraphDb(), testData);
  });

  it('creates provider nodes', () => {
    const conn = getGraphDb();
    const stmt = conn.prepareSync('MATCH (p:Provider) RETURN count(p) as cnt');
    const result = conn.executeSync(stmt);
    const rows = getAllRows(result);
    expect(rows[0]?.cnt).toBe(3);
  });

  it('creates beneficiary nodes', () => {
    const conn = getGraphDb();
    const stmt = conn.prepareSync('MATCH (b:Beneficiary) RETURN count(b) as cnt');
    const result = conn.executeSync(stmt);
    const rows = getAllRows(result);
    expect(rows[0]?.cnt).toBe(3);
  });

  it('creates inpatient claim nodes with correct DRG links', () => {
    const conn = getGraphDb();
    const stmt = conn.prepareSync(
      'MATCH (ic:InpatientClaim)-[:CLASSIFIED_AS]->(d:DRG {code: 193}) RETURN count(ic) as cnt',
    );
    const result = conn.executeSync(stmt);
    const rows = getAllRows(result);
    expect(rows[0]?.cnt).toBe(3);
  });

  it('creates SUBMITTED_BY edges from claims to providers', () => {
    const conn = getGraphDb();
    const stmt = conn.prepareSync(
      'MATCH (ic:InpatientClaim)-[:SUBMITTED_BY]->(p:Provider {id: "PROV_B"}) RETURN count(ic) as cnt',
    );
    const result = conn.executeSync(stmt);
    const rows = getAllRows(result);
    expect(rows[0]?.cnt).toBe(2);
  });

  it('creates LOCATED_IN edges from providers to regions', () => {
    const conn = getGraphDb();
    const stmt = conn.prepareSync(
      'MATCH (p:Provider)-[:LOCATED_IN]->(r:Region {name: "Northeast"}) RETURN count(p) as cnt',
    );
    const result = conn.executeSync(stmt);
    const rows = getAllRows(result);
    expect(rows[0]?.cnt).toBe(2);
  });
});

describe('KPI hierarchy and hypotheses', () => {
  beforeAll(() => {
    resetGraph();
    seedGraph(getGraphDb(), testData);
  });

  it('creates INFLUENCES edges for KPI hierarchy', () => {
    const conn = getGraphDb();
    const result = queryKpiHierarchy(conn);
    const rows = getAllRows(result);
    expect(rows.length).toBe(6);
  });

  it('creates HYPOTHESIZES edges for upcoding', () => {
    const conn = getGraphDb();
    const result = queryUpcodingHypotheses(conn);
    const rows = getAllRows(result);
    expect(rows.length).toBe(2);
    expect(rows.some((r) => String(r['h.question'] ?? '').includes('MCC'))).toBe(true);
  });

  it('creates HYPOTHESIZES edges for readmission', () => {
    const conn = getGraphDb();
    const result = queryReadmissionHypotheses(conn);
    const rows = getAllRows(result);
    expect(rows.length).toBe(2);
  });

  it('creates HYPOTHESIZES edges for geographic spike', () => {
    const conn = getGraphDb();
    const result = queryGeographicHypotheses(conn);
    const rows = getAllRows(result);
    expect(rows.length).toBe(2);
  });
});

describe('Upcoding scenario subgraph', () => {
  beforeAll(() => {
    resetGraph();
    seedGraph(getGraphDb(), testData);
  });

  it('queryDrgBySeverity returns MCC DRGs sorted by weight', () => {
    const conn = getGraphDb();
    const result = queryDrgBySeverity(conn, 'MCC');
    const rows = getAllRows(result);
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows[0]?.['d.code']).toBe(193);
  });
});

describe('Readmission scenario subgraph', () => {
  beforeAll(() => {
    resetGraph();
    seedGraph(getGraphDb(), testData);
  });

  it('queryProviderSubgraph returns provider with claims', () => {
    const conn = getGraphDb();
    const result = queryProviderSubgraph(conn, 'PROV_A');
    const rows = getAllRows(result);
    expect(rows.length).toBeGreaterThan(0);
  });
});

describe('Geographic spike scenario subgraph', () => {
  beforeAll(() => {
    resetGraph();
    seedGraph(getGraphDb(), testData);
  });

  it('queryDrgPeers returns peers in same region', () => {
    const conn = getGraphDb();
    const result = queryDrgPeers(conn, 193, 'PROV_A');
    const rows = getAllRows(result);
    // PROV_A is in NY (Northeast), PROV_B is also in NY — should be a peer
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });
});
