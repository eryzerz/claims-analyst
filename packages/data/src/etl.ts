import { getDb, getRawDb, resetDb } from './db.js';
import { ingestAll } from './ingest-mock.js';
import { storeBaselines } from './compute-baselines.js';

export interface EtlResult {
  ingested: {
    beneficiaries: number;
    providers: number;
    drgDefinitions: number;
    inpatientClaims: number;
    outpatientClaims: number;
  };
  baselines: {
    providerBaselines: number;
    regionBaselines: number;
  };
}

export function runEtl(options: { dbPath?: string } = {}): EtlResult {
  resetDb();
  const db = getDb(options.dbPath);

  // Create tables
  const createStatements = [
    `CREATE TABLE IF NOT EXISTS beneficiaries (
      id TEXT PRIMARY KEY, state_code TEXT NOT NULL, county_code TEXT NOT NULL,
      birth_date TEXT NOT NULL, death_date TEXT, sex TEXT NOT NULL,
      race_code TEXT NOT NULL, chronic_conditions TEXT NOT NULL,
      annual_reimbursement REAL NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS providers (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, state_code TEXT NOT NULL,
      teaching_hospital INTEGER NOT NULL, bed_count INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS drg_definitions (
      code INTEGER PRIMARY KEY, base_drg INTEGER NOT NULL, mdc TEXT NOT NULL,
      medical_surgical TEXT NOT NULL, severity_tier TEXT NOT NULL,
      description TEXT NOT NULL, weight REAL NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS inpatient_claims (
      id TEXT PRIMARY KEY, beneficiary_id TEXT NOT NULL, provider_id TEXT NOT NULL,
      claim_start_date TEXT NOT NULL, claim_end_date TEXT NOT NULL,
      admission_date TEXT NOT NULL, discharge_date TEXT NOT NULL,
      drg_code INTEGER NOT NULL, payment_amount REAL NOT NULL,
      utilization_day_count INTEGER NOT NULL, admitting_diagnosis_code TEXT NOT NULL,
      diagnosis_codes TEXT NOT NULL, procedure_codes TEXT NOT NULL,
      FOREIGN KEY (beneficiary_id) REFERENCES beneficiaries(id),
      FOREIGN KEY (provider_id) REFERENCES providers(id)
    )`,
    `CREATE TABLE IF NOT EXISTS outpatient_claims (
      id TEXT PRIMARY KEY, beneficiary_id TEXT NOT NULL, provider_id TEXT NOT NULL,
      claim_start_date TEXT NOT NULL, claim_end_date TEXT NOT NULL,
      payment_amount REAL NOT NULL, diagnosis_codes TEXT NOT NULL,
      procedure_codes TEXT NOT NULL,
      FOREIGN KEY (beneficiary_id) REFERENCES beneficiaries(id),
      FOREIGN KEY (provider_id) REFERENCES providers(id)
    )`,
    `CREATE TABLE IF NOT EXISTS provider_baselines (
      id INTEGER PRIMARY KEY AUTOINCREMENT, provider_id TEXT NOT NULL,
      drg_distribution TEXT NOT NULL, readmission_rate REAL NOT NULL,
      readmission_peer_mean REAL NOT NULL, readmission_peer_stddev REAL NOT NULL,
      patient_acuity_mean REAL NOT NULL, total_claims INTEGER NOT NULL,
      computed_at TEXT NOT NULL,
      FOREIGN KEY (provider_id) REFERENCES providers(id)
    )`,
    `CREATE TABLE IF NOT EXISTS region_baselines (
      id INTEGER PRIMARY KEY AUTOINCREMENT, region TEXT NOT NULL,
      year_week TEXT NOT NULL, er_volume REAL NOT NULL,
      er_volume_mean REAL NOT NULL, er_volume_stddev REAL NOT NULL,
      week_over_week_change REAL NOT NULL, computed_at TEXT NOT NULL
    )`,
  ];

  for (const sql of createStatements) {
    getRawDb().exec(sql);
  }

  // Ingest CSVs
  const ingested = ingestAll();

  // Compute and store baselines
  const baselines = storeBaselines();

  return { ingested, baselines };
}
