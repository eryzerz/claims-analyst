export interface InpatientClaim {
  id: string;
  beneficiaryId: string;
  providerId: string;
  claimStartDate: string;
  claimEndDate: string;
  admissionDate: string;
  dischargeDate: string;
  drgCode: number;
  paymentAmount: number;
  primaryPayerPaidAmount: number;
  beneficiaryDeductibleAmount: number;
  beneficiaryCoinsuranceAmount: number;
  utilizationDayCount: number;
  admittingDiagnosisCode: string;
  diagnosisCodes: string[];
  procedureCodes: string[];
  attendingPhysicianNpi: string;
  operatingPhysicianNpi: string | null;
  otherPhysicianNpi: string | null;
}

export interface OutpatientClaim {
  id: string;
  beneficiaryId: string;
  providerId: string;
  claimStartDate: string;
  claimEndDate: string;
  paymentAmount: number;
  diagnosisCodes: string[];
  procedureCodes: string[];
}

export interface CarrierClaim {
  id: string;
  beneficiaryId: string;
  providerId: string;
  claimStartDate: string;
  claimEndDate: string;
  paymentAmount: number;
  diagnosisCodes: string[];
  procedureCodes: string[];
  lineItems: CarrierLineItem[];
}

export interface CarrierLineItem {
  lineNumber: number;
  procedureCode: string;
  diagnosisCode: string;
  linePaymentAmount: number;
}

export interface Beneficiary {
  id: string;
  stateCode: string;
  countyCode: string;
  birthDate: string;
  deathDate: string | null;
  sex: '1' | '2';
  raceCode: string;
  chronicConditions: string[];
  annualReimbursement: number;
}

export interface Provider {
  id: string;
  name: string;
  stateCode: string;
  teachingHospital: boolean;
  bedCount: number;
  peerGroupSize: number;
}
