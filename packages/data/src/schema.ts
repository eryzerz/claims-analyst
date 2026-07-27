import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const beneficiaries = sqliteTable('beneficiaries', {
  id: text('id').primaryKey(),
  stateCode: text('state_code').notNull(),
  countyCode: text('county_code').notNull(),
  birthDate: text('birth_date').notNull(),
  deathDate: text('death_date'),
  sex: text('sex', { enum: ['1', '2'] }).notNull(),
  raceCode: text('race_code').notNull(),
  chronicConditions: text('chronic_conditions').notNull(),
  annualReimbursement: real('annual_reimbursement').notNull(),
});

export const providers = sqliteTable('providers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  stateCode: text('state_code').notNull(),
  teachingHospital: integer('teaching_hospital', { mode: 'boolean' }).notNull(),
  bedCount: integer('bed_count').notNull(),
});

export const inpatientClaims = sqliteTable('inpatient_claims', {
  id: text('id').primaryKey(),
  beneficiaryId: text('beneficiary_id')
    .notNull()
    .references(() => beneficiaries.id),
  providerId: text('provider_id')
    .notNull()
    .references(() => providers.id),
  claimStartDate: text('claim_start_date').notNull(),
  claimEndDate: text('claim_end_date').notNull(),
  admissionDate: text('admission_date').notNull(),
  dischargeDate: text('discharge_date').notNull(),
  drgCode: integer('drg_code').notNull(),
  paymentAmount: real('payment_amount').notNull(),
  utilizationDayCount: integer('utilization_day_count').notNull(),
  admittingDiagnosisCode: text('admitting_diagnosis_code').notNull(),
  diagnosisCodes: text('diagnosis_codes').notNull(),
  procedureCodes: text('procedure_codes').notNull(),
});

export const outpatientClaims = sqliteTable('outpatient_claims', {
  id: text('id').primaryKey(),
  beneficiaryId: text('beneficiary_id')
    .notNull()
    .references(() => beneficiaries.id),
  providerId: text('provider_id')
    .notNull()
    .references(() => providers.id),
  claimStartDate: text('claim_start_date').notNull(),
  claimEndDate: text('claim_end_date').notNull(),
  paymentAmount: real('payment_amount').notNull(),
  diagnosisCodes: text('diagnosis_codes').notNull(),
  procedureCodes: text('procedure_codes').notNull(),
});

export const drgDefinitions = sqliteTable('drg_definitions', {
  code: integer('code').primaryKey(),
  baseDrg: integer('base_drg').notNull(),
  mdc: text('mdc').notNull(),
  medicalSurgical: text('medical_surgical', { enum: ['medical', 'surgical'] }).notNull(),
  severityTier: text('severity_tier', { enum: ['Non-CC', 'CC', 'MCC'] }).notNull(),
  description: text('description').notNull(),
  weight: real('weight').notNull(),
});

export const providerBaselines = sqliteTable('provider_baselines', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  providerId: text('provider_id')
    .notNull()
    .references(() => providers.id),
  drgDistribution: text('drg_distribution').notNull(),
  readmissionRate: real('readmission_rate').notNull(),
  readmissionPeerMean: real('readmission_peer_mean').notNull(),
  readmissionPeerStdDev: real('readmission_peer_stddev').notNull(),
  patientAcuityMean: real('patient_acuity_mean').notNull(),
  totalClaims: integer('total_claims').notNull(),
  computedAt: text('computed_at').notNull(),
});

export const regionBaselines = sqliteTable('region_baselines', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  region: text('region').notNull(),
  yearWeek: text('year_week').notNull(),
  erVolume: real('er_volume').notNull(),
  erVolumeMean: real('er_volume_mean').notNull(),
  erVolumeStdDev: real('er_volume_stddev').notNull(),
  weekOverWeekChange: real('week_over_week_change').notNull(),
  computedAt: text('computed_at').notNull(),
});
