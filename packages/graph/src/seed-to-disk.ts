import kuzu from 'kuzu';
import type { QueryResult } from 'kuzu';
import { getDb, runEtl } from '@claims-analyst/data';
import { SIGNAL_CATEGORY } from '@claims-analyst/shared';
import { createSchema } from './schema.js';

const DB_PATH = process.argv[2] ?? '/tmp/claims-graph';
console.log(`Running ETL and seeding Kuzu graph to ${DB_PATH}...`);

// Run ETL to populate in-memory SQLite, then wire to graph
const etlResult = runEtl();
console.log(`ETL ingested: ${etlResult.ingested.beneficiaries} beneficiaries, ${etlResult.ingested.providers} providers, ${etlResult.ingested.inpatientClaims} inpatient, ${etlResult.ingested.outpatientClaims} outpatient`);

const etlDb = getDb();
const conn = new kuzu.Connection(new kuzu.Database(DB_PATH));
createSchema(conn);

// ── Providers ──
const providerRows = etlDb.all<{
  id: string; name: string; state_code: string; teaching_hospital: number; bed_count: number;
}>('SELECT id, name, state_code, teaching_hospital, bed_count FROM providers');
for (const p of providerRows) {
  const stmt = conn.prepareSync(
    `CREATE (n:Provider {id: "${p.id}", name: "${p.name.replace(/"/g, '\\"')}", stateCode: "${p.state_code}", teachingHospital: ${p.teaching_hospital === 1}, bedCount: ${p.bed_count}})`,
  );
  conn.executeSync(stmt);
}
console.log(`  ${providerRows.length} providers`);

// ── Beneficiaries ──
const benRows = etlDb.all<{ id: string; state_code: string; sex: string }>(
  'SELECT id, state_code, sex FROM beneficiaries',
);
for (const b of benRows) {
  const stmt = conn.prepareSync(
    `CREATE (n:Beneficiary {id: "${b.id}", stateCode: "${b.state_code}", sex: "${b.sex}"})`,
  );
  conn.executeSync(stmt);
}
console.log(`  ${benRows.length} beneficiaries`);

// ── DRGs ──
const drgRows = etlDb.all<{
  code: number; base_drg: number; mdc: string; medical_surgical: string; severity_tier: string; description: string; weight: number;
}>('SELECT * FROM drg_definitions');
for (const d of drgRows) {
  const stmt = conn.prepareSync(
    `CREATE (n:DRG {code: ${d.code}, baseDrg: ${d.base_drg}, mdc: "${d.mdc}", medicalSurgical: "${d.medical_surgical}", severityTier: "${d.severity_tier}", description: "${d.description.replace(/"/g, '\\"')}", weight: ${d.weight}})`,
  );
  conn.executeSync(stmt);
}
console.log(`  ${drgRows.length} DRGs`);

// ── Inpatient claims ──
const ipRows = etlDb.all<{
  id: string; beneficiary_id: string; provider_id: string; drg_code: number; payment_amount: number; utilization_day_count: number; admission_date: string; discharge_date: string;
}>('SELECT * FROM inpatient_claims');
for (const c of ipRows) {
  const stmt = conn.prepareSync(
    `CREATE (n:InpatientClaim {id: "${c.id}", drgCode: ${c.drg_code}, paymentAmount: ${c.payment_amount}, utilizationDayCount: ${c.utilization_day_count}, admissionDate: "${c.admission_date}", dischargeDate: "${c.discharge_date}"})`,
  );
  conn.executeSync(stmt);
}
console.log(`  ${ipRows.length} inpatient claims`);

// ── Outpatient claims ──
const opRows = etlDb.all<{
  id: string; beneficiary_id: string; provider_id: string; payment_amount: number;
}>('SELECT * FROM outpatient_claims');
for (const c of opRows) {
  const stmt = conn.prepareSync(
    `CREATE (n:OutpatientClaim {id: "${c.id}", paymentAmount: ${c.payment_amount}})`);
  conn.executeSync(stmt);
}
console.log(`  ${opRows.length} outpatient claims`);

// ── Edges ──

// SUBMITTED_BY + TREATED + CLASSIFIED_AS for inpatient
for (const c of ipRows) {
  conn.executeSync(conn.prepareSync(
    `MATCH (ic:InpatientClaim {id: "${c.id}"}), (p:Provider {id: "${c.provider_id}"}) CREATE (ic)-[:SUBMITTED_BY]->(p)`));
  conn.executeSync(conn.prepareSync(
    `MATCH (ic:InpatientClaim {id: "${c.id}"}), (b:Beneficiary {id: "${c.beneficiary_id}"}) CREATE (ic)-[:TREATED]->(b)`));
  conn.executeSync(conn.prepareSync(
    `MATCH (ic:InpatientClaim {id: "${c.id}"}), (d:DRG {code: ${c.drg_code}}) CREATE (ic)-[:CLASSIFIED_AS]->(d)`));
}
console.log('  inpatient edges created');

// SUBMITTED_BY + TREATED for outpatient
for (const c of opRows) {
  conn.executeSync(conn.prepareSync(
    `MATCH (oc:OutpatientClaim {id: "${c.id}"}), (p:Provider {id: "${c.provider_id}"}) CREATE (oc)-[:SUBMITTED_BY]->(p)`));
  conn.executeSync(conn.prepareSync(
    `MATCH (oc:OutpatientClaim {id: "${c.id}"}), (b:Beneficiary {id: "${c.beneficiary_id}"}) CREATE (oc)-[:TREATED]->(b)`));
}
console.log('  outpatient edges created');

// LOCATED_IN
for (const p of providerRows) {
  const region = getRegion(p.state_code);
  conn.executeSync(conn.prepareSync(
    `MATCH (p:Provider {id: "${p.id}"}), (r:Region {name: "${region}"}) CREATE (p)-[:LOCATED_IN]->(r)`));
}
console.log('  LOCATED_IN edges created');

// ── Regions ──
const allRegions = new Set(providerRows.map(p => getRegion(p.state_code)));
for (const r of allRegions) {
  conn.executeSync(conn.prepareSync(`MERGE (r:Region {name: "${r}"})`));
}
console.log(`  ${allRegions.size} regions`);

// ── Metrics ──
const metrics = [
  { id: 'metric_avg_reimbursement', name: 'Average Reimbursement' },
  { id: 'metric_drg_coding_distribution', name: 'DRG Coding Distribution' },
  { id: 'metric_mcc_rate', name: 'MCC Tier Rate' },
  { id: 'metric_readmission_rate', name: '30-Day Readmission Rate' },
  { id: 'metric_patient_acuity', name: 'Patient Acuity' },
  { id: 'metric_er_visit_volume', name: 'ER Visit Volume' },
  { id: 'metric_provider_peer_group', name: 'Provider Peer Group' },
  { id: 'metric_length_of_stay', name: 'Length of Stay' },
];
for (const m of metrics) {
  conn.executeSync(conn.prepareSync(
    `CREATE (n:Metric {id: "${m.id}", name: "${m.name}"})`));
}

// ── INFLUENCES & HYPOTHESIZES ──
const influences: [string, string, number][] = [
  ['metric_drg_coding_distribution', 'metric_avg_reimbursement', 0.9],
  ['metric_mcc_rate', 'metric_drg_coding_distribution', 0.8],
  ['metric_patient_acuity', 'metric_readmission_rate', 0.7],
  ['metric_readmission_rate', 'metric_avg_reimbursement', 0.6],
  ['metric_length_of_stay', 'metric_avg_reimbursement', 0.5],
  ['metric_provider_peer_group', 'metric_er_visit_volume', 0.4],
];
for (const [from, to, w] of influences) {
  conn.executeSync(conn.prepareSync(
    `MATCH (a:Metric {id: "${from}"}), (b:Metric {id: "${to}"}) CREATE (a)-[:INFLUENCES {weight: ${w}}]->(b)`));
}

const hypotheses: [string, string, string, string, string][] = [
  ['metric_mcc_rate', 'metric_drg_coding_distribution', SIGNAL_CATEGORY.UPCODING,
    'Is the provider coding more MCC-qualifying diagnoses than peers with similar patient mix?',
    'MATCH (ic:InpatientClaim)-[:SUBMITTED_BY]->(p:Provider {id: $providerId}), (ic)-[:CLASSIFIED_AS]->(d:DRG) WHERE d.severityTier = "MCC" RETURN count(ic) as mccClaims'],
  ['metric_patient_acuity', 'metric_mcc_rate', SIGNAL_CATEGORY.UPCODING,
    'Does the patient mix justify the higher MCC rate, or is this a coding shift?',
    'MATCH (ic:InpatientClaim)-[:SUBMITTED_BY]->(p:Provider {id: $providerId}), (ic)-[:TREATED]->(b:Beneficiary), (ic)-[:CLASSIFIED_AS]->(d:DRG) WHERE d.severityTier = "MCC" RETURN count(DISTINCT b) as uniquePatients'],
  ['metric_readmission_rate', 'metric_length_of_stay', SIGNAL_CATEGORY.READMISSION,
    'Is the high readmission rate due to quality issues (shorter stays) or patient acuity?',
    'MATCH (ic:InpatientClaim)-[:SUBMITTED_BY]->(p:Provider {id: $providerId}) RETURN avg(ic.utilizationDayCount) as avgLos'],
  ['metric_readmission_rate', 'metric_patient_acuity', SIGNAL_CATEGORY.READMISSION,
    'Are patients at this provider sicker than peers, explaining the higher readmission rate?',
    'MATCH (ic:InpatientClaim)-[:SUBMITTED_BY]->(p:Provider {id: $providerId}), (ic)-[:TREATED]->(b:Beneficiary) RETURN count(DISTINCT b) as patients'],
  ['metric_er_visit_volume', 'metric_provider_peer_group', SIGNAL_CATEGORY.GEOGRAPHIC_SPIKE,
    'Is the ER volume spike explained by miscoding, a disease outbreak, or a new competing facility?',
    'MATCH (p:Provider)-[:LOCATED_IN]->(r:Region {name: $region}) MATCH (oc:OutpatientClaim)-[:SUBMITTED_BY]->(p) RETURN count(oc) as erVisits'],
  ['metric_er_visit_volume', 'metric_readmission_rate', SIGNAL_CATEGORY.GEOGRAPHIC_SPIKE,
    'Could the ER volume spike be follow-ups from earlier inpatient stays?',
    'MATCH (p:Provider)-[:LOCATED_IN]->(r:Region {name: $region}) MATCH (ic:InpatientClaim)-[:SUBMITTED_BY]->(p) RETURN count(ic) as inpatientClaims'],
];
for (const [from, to, pattern, question, cypherQuery] of hypotheses) {
  conn.executeSync(conn.prepareSync(
    `MATCH (a:Metric {id: "${from}"}), (b:Metric {id: "${to}"}) CREATE (a)-[:HYPOTHESIZES {pattern: "${pattern}", question: "${question.replace(/"/g, '\\"')}", cypherQuery: "${cypherQuery.replace(/"/g, '\\"')}"}]->(b)`));
}

console.log('  metrics, influences, and hypotheses created');

// ── Verify ──
const countStmt = conn.prepareSync('MATCH (n) RETURN count(n) as cnt');
const result = conn.executeSync(countStmt);
const res: QueryResult = Array.isArray(result) ? result[0]! : result;
const row = res.getNextSync();
console.log(`\nDone! ${row?.cnt} total nodes in graph.`);
conn.close();

function getRegion(s: string): string {
  const ne = ['NY','NJ','PA','CT','MA','RI','VT','NH','ME'];
  const mw = ['IL','IN','OH','MI','WI','MN','IA','MO','KS','NE','SD','ND'];
  const s_ = ['TX','FL','GA','AL','MS','LA','AR','TN','KY','WV','VA','NC','SC','DC','DE','MD','OK'];
  const w = ['CA','WA','OR','NV','AZ','UT','CO','NM','ID','MT','WY','AK','HI'];
  if (ne.includes(s)) return 'Northeast';
  if (mw.includes(s)) return 'Midwest';
  if (s_.includes(s)) return 'South';
  if (w.includes(s)) return 'West';
  return 'Unknown';
}
