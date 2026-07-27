// SynPUF ingestion — reads real CMS DE-SynPUF CSV files and maps them to our internal schema.
//
// Real SynPUF column names (from CMS codebook) vs our internal schema:
//
//   DESYNPUF_ID                → beneficiaryId
//   CLM_ID                     → id
//   CLM_FROM_DT                → claimStartDate
//   CLM_THRU_DT                → claimEndDate
//   PRVDR_NUM                  → providerId
//   CLM_PMT_AMT                → paymentAmount
//   NCH_PRMRY_PYR_CLM_PD_AMT   → primaryPayerPaidAmount
//   AT_PHYSN_NPI               → attendingPhysicianNpi
//   OP_PHYSN_NPI               → operatingPhysicianNpi
//   OT_PHYSN_NPI               → otherPhysicianNpi
//   CLM_ADMSN_DT               → admissionDate
//   ADMTNG_ICD9_DGNS_CD        → admittingDiagnosisCode
//   NCH_BENE_DSCHRG_DT          → dischargeDate
//   CLM_DRG_CD                 → drgCode
//   CLM_UTLZTN_DAY_CNT         → utilizationDayCount
//   ICD9_DGNS_CD_1..10         → diagnosisCodes (array)
//   ICD9_PRCDR_CD_1..6         → procedureCodes (array)
//   NCH_BENE_IP_DDCTBL_AMT     → beneficiaryDeductibleAmount
//   NCH_BENE_PTA_COINSRNC_LBLTY_AM → beneficiaryCoinsuranceAmount
//   NCH_BENE_BLOOD_DDCTBL_LBLTY_AM → _(not mapped)_
//   CLM_PASS_THRU_PER_DIEM_AMT → _(not mapped)_
//   SEGMENT                    → _(not mapped)_
//
// Wire this up when real SynPUF CSVs are available.

export function ingestSynPufInpatient(_csvPath: string): number {
  throw new Error(
    'SynPUF ingestion not yet implemented. Use ingestMockInpatientClaims() with mock data instead.',
  );
}
