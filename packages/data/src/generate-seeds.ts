import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

declare var __dirname: string | undefined;

function getSeedsDir(): string {
  const base =
    typeof __dirname !== 'undefined'
      ? __dirname
      : import.meta.dirname ?? dirname(fileURLToPath(import.meta.url));
  return resolve(base, '..', 'seeds');
}

// Deterministic seed data generation for three fraud scenarios.
// To regenerate: npx tsx src/generate-seeds.ts
// Output: CSV files in ../seeds/

const SEEDS_DIR = getSeedsDir();
if (!existsSync(SEEDS_DIR)) mkdirSync(SEEDS_DIR, { recursive: true });

function csvLine(fields: unknown[]): string {
  return fields.map((f) => (typeof f === 'string' ? `"${f.replace(/"/g, '""')}"` : String(f ?? ''))).join(',');
}

function writeCsv(name: string, headers: string[], rows: unknown[][]) {
  const content = [headers.join(','), ...rows.map(csvLine), ''].join('\n');
  writeFileSync(resolve(SEEDS_DIR, name), content);
}

// ── Beneficiaries (100) ──
const states = ['NY', 'NY', 'NY', 'CA', 'CA', 'TX', 'TX', 'FL', 'IL', 'PA'];
const beneficiaryRows: unknown[][] = [];
for (let i = 1; i <= 100; i++) {
  const id = `BEN${String(i).padStart(5, '0')}`;
  const state = states[i % states.length]!;
  const county = `${state}00${(i % 5) + 1}`;
  const birthYear = 1940 + (i % 30);
  const chronic = i % 3 === 0 ? '["DIABETES","HYPERTENSION"]' : i % 5 === 0 ? '["CHF","COPD"]' : '[]';
  beneficiaryRows.push([
    id,
    state,
    county,
    `${birthYear}-01-15`,
    i > 95 ? '2011-01-01' : '',
    i % 2 === 0 ? '1' : '2',
    '1',
    chronic,
    (5000 + (i % 10) * 2000).toFixed(2),
  ]);
}
writeCsv('beneficiaries.csv', [
  'id', 'state_code', 'county_code', 'birth_date', 'death_date',
  'sex', 'race_code', 'chronic_conditions', 'annual_reimbursement',
], beneficiaryRows);

// ── Providers (5) ──
const providerRows: unknown[][] = [
  ['PROV_A', 'Metropolitan General',     'NY', 'true',  400],
  ['PROV_B', 'Riverside Medical Center', 'NY', 'false', 200],  // upcoding suspect
  ['PROV_C', 'Valley Community Hospital','CA', 'true',  350],
  ['PROV_D', 'Oakwood Regional',         'TX', 'false', 150],  // readmission suspect
  ['PROV_E', 'Pineview Health',          'FL', 'false', 180],  // ER abuse suspect
];
writeCsv('providers.csv', [
  'id', 'name', 'state_code', 'teaching_hospital', 'bed_count',
], providerRows);

// ── DRG definitions (from shared SEEDED_DRGS) ──
const drgRows: unknown[][] = [
  [193, 193, '04', 'medical', 'MCC',    'Simple Pneumonia & Pleurisy with MCC',              1.45],
  [194, 193, '04', 'medical', 'CC',     'Simple Pneumonia & Pleurisy with CC',               1.02],
  [195, 193, '04', 'medical', 'Non-CC', 'Simple Pneumonia & Pleurisy without CC/MCC',        0.72],
  [280, 280, '05', 'medical', 'MCC',    'Acute Myocardial Infarction, Discharged Alive with MCC',    1.52],
  [281, 280, '05', 'medical', 'CC',     'Acute Myocardial Infarction, Discharged Alive with CC',     1.05],
  [282, 280, '05', 'medical', 'Non-CC', 'Acute Myocardial Infarction, Discharged Alive without CC/MCC', 0.77],
  [291, 291, '05', 'medical', 'MCC',    'Heart Failure & Shock with MCC',                    1.38],
  [292, 291, '05', 'medical', 'CC',     'Heart Failure & Shock with CC',                     1.01],
  [293, 291, '05', 'medical', 'Non-CC', 'Heart Failure & Shock without CC/MCC',              0.69],
  [470, 470, '08', 'surgical', 'Non-CC', 'Major Joint Replacement without MCC',               2.01],
  [469, 470, '08', 'surgical', 'MCC',   'Major Joint Replacement with MCC',                  2.75],
  [871, 871, '18', 'medical', 'MCC',    'Septicemia with MV >96 Hours',                      5.12],
  [872, 871, '18', 'medical', 'Non-CC', 'Septicemia without MV >96 Hours with MCC',          1.97],
];
writeCsv('drg_definitions.csv', [
  'code','base_drg','mdc','medical_surgical','severity_tier','description','weight',
], drgRows);

// ── Inpatient claims (~200) ──
// Upcoding data: PROV_A has balanced DRG mix, PROV_B skews toward MCC-tier
// Readmission data: PROV_D has high readmission rate
const inpatientRows: unknown[][] = [];
let claimId = 0;

// Seeded distribution helpers
function weightedPick<T>(items: T[], weights: number[], idx: number): T {
  let sum = 0;
  for (const w of weights) sum += w;
  let r = ((idx * 7919 + 104729) % 10000) / 10000 * sum; // simple deterministic hash
  for (let i = 0; i < items.length; i++) {
    r -= weights[i]!;
    if (r <= 0) return items[i]!;
  }
  return items[items.length - 1]!;
}

// PROV_A: balanced coding
const provA_DrgWeights = [0.3, 0.25, 0.2, 0.15, 0.1]; // base DRG codes 193,280,291,470,871
const provA_Drgs = [
  [195, 194, 193], // pneumonia: more non-CC and CC, less MCC
  [282, 281, 280],
  [293, 292, 291],
  [470, 469],
  [872, 871],
];

// PROV_B: upcoding — skews toward MCC tier
const provB_Drgs = [
  [193, 194, 195], // pneumonia: more MCC
  [280, 281, 282],
  [291, 292, 293],
  [469, 470],
  [871, 872],
];

// PROV_C: balanced, CA
// PROV_D: readmission suspect — shorter stays, more claims per patient
// PROV_E: geographic spike — many ER/outpatient claims

const allProviders = [
  { id: 'PROV_A', drgs: provA_Drgs, diagBase: ['486','428','410','715','038'] },
  { id: 'PROV_B', drgs: provB_Drgs, diagBase: ['486','428','410','715','038'] },
  { id: 'PROV_C', drgs: provA_Drgs, diagBase: ['486','428','410','715','038'] },
  { id: 'PROV_D', drgs: provA_Drgs, diagBase: ['486','428','410','715','038'] },
  { id: 'PROV_E', drgs: provA_Drgs, diagBase: ['486','428','410','715','038'] },
];

for (let pi = 0; pi < allProviders.length; pi++) {
  const prov = allProviders[pi]!;
  const claimCount = pi === 3 ? 60 : (pi === 4 ? 25 : 40); // PROV_D more claims (readmission), PROV_E fewer inpatients

  for (let c = 0; c < claimCount; c++) {
    claimId++;
    const benIdx = (pi * 20 + c) % 100;
    const benId = `BEN${String(benIdx + 1).padStart(5, '0')}`;
    const drgFamilyIdx = c % prov.drgs.length;
    const tierIdx = pi === 1 ? 0 : (c < claimCount * 0.3 ? 0 : c < claimCount * 0.6 ? 1 : 2); // PROV_B: skew MCC
    const tierIdxEffective = Math.min(tierIdx, prov.drgs[drgFamilyIdx]!.length - 1);
    const drgCode = prov.drgs[drgFamilyIdx]![tierIdxEffective]!;

    const baseDate = new Date(2009, 0, 1);
    const admitDate = new Date(baseDate.getTime() + (pi * 90 + c * 3) * 86400000);
    // PROV_D: shorter stays, more readmissions — discharge after ~2-3 days
    const los = pi === 3 ? 2 + (c % 2) : 3 + (c % 7);
    const dischargeDate = new Date(admitDate.getTime() + los * 86400000);

    const drgDef = drgRows.find(r => r[0] === drgCode)!;
    const payment = drgDef ? (Number(drgDef[6]) * 6200).toFixed(2) : '5000.00';

    inpatientRows.push([
      `IP${String(claimId).padStart(6, '0')}`,
      benId,
      prov.id,
      admitDate.toISOString().split('T')[0]!,
      dischargeDate.toISOString().split('T')[0]!,
      admitDate.toISOString().split('T')[0]!,
      dischargeDate.toISOString().split('T')[0]!,
      drgCode,
      payment,
      los,
      prov.diagBase[drgFamilyIdx]!,
      `["${prov.diagBase[drgFamilyIdx]}"]`,
      '[]',
    ]);
  }
}

// ── Readmission seeds for PROV_D ──
// Add explicit readmissions: same patient, new admission within 30 days of a prior discharge
const readmitBeneficiaries = ['BEN00061', 'BEN00062', 'BEN00063', 'BEN00064', 'BEN00065'];
for (const benId of readmitBeneficiaries) {
  // Find the first claim for this beneficiary at PROV_D
  const existingClaims = inpatientRows.filter(
    (r) => r[1] === benId && r[2] === 'PROV_D',
  );
  if (existingClaims.length < 1) continue;

  const firstClaim = existingClaims[0]!;
  const firstDischarge = new Date(firstClaim[6] as string);
  const readmitDate = new Date(firstDischarge.getTime() + 14 * 86400000); // readmit 14 days later
  const readmitDischarge = new Date(readmitDate.getTime() + 3 * 86400000);

  claimId++;
  inpatientRows.push([
    `IP${String(claimId).padStart(6, '0')}`,
    benId,
    'PROV_D',
    readmitDate.toISOString().split('T')[0]!,
    readmitDischarge.toISOString().split('T')[0]!,
    readmitDate.toISOString().split('T')[0]!,
    readmitDischarge.toISOString().split('T')[0]!,
    293, // Heart Failure without CC/MCC
    (0.69 * 6200).toFixed(2),
    3,
    '428',
    '["428"]',
    '[]',
  ]);
}

writeCsv('inpatient_claims.csv', [
  'id','beneficiary_id','provider_id','claim_start_date','claim_end_date',
  'admission_date','discharge_date','drg_code','payment_amount','utilization_day_count',
  'admitting_diagnosis_code','diagnosis_codes','procedure_codes',
], inpatientRows);

// ── Outpatient claims (~300, skewed per provider for geographic spike) ──
const outpatientRows: unknown[][] = [];
let opId = 0;
const opProviders = ['PROV_A','PROV_B','PROV_C','PROV_D','PROV_E'];
// PROV_E (FL) has the highest outpatient volume for geographic spike
const opWeights = [1, 1, 1, 1, 8]; // PROV_E spikes

for (let pi = 0; pi < opProviders.length; pi++) {
  const count = opWeights[pi]! * 25;
  for (let c = 0; c < count; c++) {
    opId++;
    const benId = `BEN${String((pi * 25 + c) % 100 + 1).padStart(5, '0')}`;
    const baseDate = new Date(2009, 0, 1);
    const svcDate = new Date(baseDate.getTime() + (pi * 90 + c * 2) * 86400000);
    // ER visit spike: PROV_E in weeks 20-24 has extra volume
    const isEr = opProviders[pi] === 'PROV_E' ? true : (c % 3 === 0);
    const diagCode = isEr ? '78900' : '4019';

    outpatientRows.push([
      `OP${String(opId).padStart(6, '0')}`,
      benId,
      opProviders[pi]!,
      svcDate.toISOString().split('T')[0]!,
      svcDate.toISOString().split('T')[0]!,
      isEr ? '800.00' : '250.00',
      `["${diagCode}"]`,
      isEr ? '["99284"]' : '["99213"]',
    ]);
  }
}
writeCsv('outpatient_claims.csv', [
  'id','beneficiary_id','provider_id','claim_start_date','claim_end_date',
  'payment_amount','diagnosis_codes','procedure_codes',
], outpatientRows);

// Print summary
const counts = {
  beneficiaries: beneficiaryRows.length,
  providers: providerRows.length,
  drg_definitions: drgRows.length,
  inpatient_claims: inpatientRows.length,
  outpatient_claims: outpatientRows.length,
};

console.log('Seed CSVs generated:');
for (const [name, count] of Object.entries(counts)) {
  console.log(`  ${name}.csv: ${count} rows`);
}
