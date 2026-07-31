import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDb } from './db.js';
import { beneficiaries, providers, inpatientClaims, outpatientClaims, drgDefinitions } from './schema.js';

declare var __dirname: string | undefined;

function getSeedsDir(): string {
  // Webpack/Next.js bundling: __dirname points to .next/server output dir.
  // Resolve from cwd using monorepo sibling-package convention instead.
  if (typeof __dirname !== 'undefined' && __dirname.includes('.next')) {
    return resolve(process.cwd(), '..', 'data', 'seeds');
  }

  // Native ESM (tsx, node, vitest): import.meta.dirname is the source dir
  if (typeof import.meta.dirname === 'string') {
    return resolve(import.meta.dirname, '..', 'seeds');
  }

  // ESM __dirname via fileURLToPath (older Node, some bundlers)
  return resolve(dirname(fileURLToPath(import.meta.url)), '..', 'seeds');
}

const SEEDS_DIR = getSeedsDir();

function parseCsv(content: string): { headers: string[]; rows: string[][] } {
  const lines = content.trim().split('\n');
  const headers = lines[0]!.split(',').map((h) => h.trim());

  const rows: string[][] = [];
  for (let i = 1; i < lines.length; i++) {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;
    const line = lines[i]!;

    for (let j = 0; j < line.length; j++) {
      const ch = line[j]!;
      if (inQuotes) {
        if (ch === '"') {
          if (j + 1 < line.length && line[j + 1] === '"') {
            current += '"';
            j++;
          } else {
            inQuotes = false;
          }
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',') {
          fields.push(current.trim());
          current = '';
        } else {
          current += ch;
        }
      }
    }
    fields.push(current.trim());
    rows.push(fields);
  }
  return { headers, rows };
}

function readCsv(name: string) {
  const path = resolve(SEEDS_DIR, name);
  return parseCsv(readFileSync(path, 'utf-8'));
}

export function ingestBeneficiaries() {
  const db = getDb();
  const { rows } = readCsv('beneficiaries.csv');

  const records = rows.map((r) => ({
    id: r[0]!,
    stateCode: r[1]!,
    countyCode: r[2]!,
    birthDate: r[3]!,
    deathDate: r[4] || null,
    sex: r[5] as '1' | '2',
    raceCode: r[6]!,
    chronicConditions: r[7]!,
    annualReimbursement: parseFloat(r[8]!),
  }));

  if (records.length > 0) {
    db.insert(beneficiaries).values(records).run();
  }
  return records.length;
}

export function ingestProviders() {
  const db = getDb();
  const { rows } = readCsv('providers.csv');

  const records = rows.map((r) => ({
    id: r[0]!,
    name: r[1]!,
    stateCode: r[2]!,
    teachingHospital: r[3] === 'true',
    bedCount: parseInt(r[4]!, 10),
  }));

  if (records.length > 0) {
    db.insert(providers).values(records).run();
  }
  return records.length;
}

export function ingestDrgDefinitions() {
  const db = getDb();
  const { rows } = readCsv('drg_definitions.csv');

  const records = rows.map((r) => ({
    code: parseInt(r[0]!, 10),
    baseDrg: parseInt(r[1]!, 10),
    mdc: r[2]!,
    medicalSurgical: r[3] as 'medical' | 'surgical',
    severityTier: r[4] as 'Non-CC' | 'CC' | 'MCC',
    description: r[5]!,
    weight: parseFloat(r[6]!),
  }));

  if (records.length > 0) {
    db.insert(drgDefinitions).values(records).run();
  }
  return records.length;
}

export function ingestInpatientClaims() {
  const db = getDb();
  const { rows } = readCsv('inpatient_claims.csv');

  const records = rows.map((r) => ({
    id: r[0]!,
    beneficiaryId: r[1]!,
    providerId: r[2]!,
    claimStartDate: r[3]!,
    claimEndDate: r[4]!,
    admissionDate: r[5]!,
    dischargeDate: r[6]!,
    drgCode: parseInt(r[7]!, 10),
    paymentAmount: parseFloat(r[8]!),
    utilizationDayCount: parseInt(r[9]!, 10),
    admittingDiagnosisCode: r[10]!,
    diagnosisCodes: r[11]!,
    procedureCodes: r[12]!,
  }));

  if (records.length > 0) {
    db.insert(inpatientClaims).values(records).run();
  }
  return records.length;
}

export function ingestOutpatientClaims() {
  const db = getDb();
  const { rows } = readCsv('outpatient_claims.csv');

  const records = rows.map((r) => ({
    id: r[0]!,
    beneficiaryId: r[1]!,
    providerId: r[2]!,
    claimStartDate: r[3]!,
    claimEndDate: r[4]!,
    paymentAmount: parseFloat(r[5]!),
    diagnosisCodes: r[6]!,
    procedureCodes: r[7]!,
  }));

  if (records.length > 0) {
    db.insert(outpatientClaims).values(records).run();
  }
  return records.length;
}

export function ingestAll() {
  return {
    beneficiaries: ingestBeneficiaries(),
    providers: ingestProviders(),
    drgDefinitions: ingestDrgDefinitions(),
    inpatientClaims: ingestInpatientClaims(),
    outpatientClaims: ingestOutpatientClaims(),
  };
}
