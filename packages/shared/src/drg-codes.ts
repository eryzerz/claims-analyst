export const MAJOR_DIAGNOSTIC_CATEGORIES = {
  '01': 'Nervous System',
  '02': 'Eye',
  '03': 'Ear, Nose, Mouth and Throat',
  '04': 'Respiratory System',
  '05': 'Circulatory System',
  '06': 'Digestive System',
  '07': 'Hepatobiliary System and Pancreas',
  '08': 'Musculoskeletal System and Connective Tissue',
  '09': 'Skin, Subcutaneous Tissue and Breast',
  '10': 'Endocrine, Nutritional and Metabolic System',
  '11': 'Kidney and Urinary Tract',
  '12': 'Male Reproductive System',
  '13': 'Female Reproductive System',
  '14': 'Pregnancy, Childbirth and Puerperium',
  '15': 'Newborns and Other Neonates',
  '16': 'Blood, Blood Forming Organs and Immunological Disorders',
  '17': 'Myeloproliferative Disorders and Poorly Differentiated Neoplasms',
  '18': 'Infectious and Parasitic Diseases and Disorders',
  '19': 'Mental Diseases and Disorders',
  '20': 'Alcohol/Drug Use and Induced Mental Disorders',
  '21': 'Injuries, Poisonings and Toxic Effects of Drugs',
  '22': 'Burns',
  '23': 'Factors Influencing Health Status',
} as const;

export type MdcCode = keyof typeof MAJOR_DIAGNOSTIC_CATEGORIES;

export const SEVERITY_TIER = {
  NON_CC: 'Non-CC',
  CC: 'CC',
  MCC: 'MCC',
} as const;

export type SeverityTier = (typeof SEVERITY_TIER)[keyof typeof SEVERITY_TIER];

export interface DrgDefinition {
  code: number;
  baseDrg: number;
  mdc: MdcCode;
  medicalSurgical: 'medical' | 'surgical';
  severityTier: SeverityTier;
  description: string;
  weight: number;
}

export const SEEDED_DRGS: DrgDefinition[] = [
  {
    code: 193,
    baseDrg: 193,
    mdc: '04',
    medicalSurgical: 'medical',
    severityTier: 'MCC',
    description: 'Simple Pneumonia & Pleurisy with MCC',
    weight: 1.45,
  },
  {
    code: 194,
    baseDrg: 193,
    mdc: '04',
    medicalSurgical: 'medical',
    severityTier: 'CC',
    description: 'Simple Pneumonia & Pleurisy with CC',
    weight: 1.02,
  },
  {
    code: 195,
    baseDrg: 193,
    mdc: '04',
    medicalSurgical: 'medical',
    severityTier: 'Non-CC',
    description: 'Simple Pneumonia & Pleurisy without CC/MCC',
    weight: 0.72,
  },
  {
    code: 280,
    baseDrg: 280,
    mdc: '05',
    medicalSurgical: 'medical',
    severityTier: 'MCC',
    description: 'Acute Myocardial Infarction, Discharged Alive with MCC',
    weight: 1.52,
  },
  {
    code: 281,
    baseDrg: 280,
    mdc: '05',
    medicalSurgical: 'medical',
    severityTier: 'CC',
    description: 'Acute Myocardial Infarction, Discharged Alive with CC',
    weight: 1.05,
  },
  {
    code: 282,
    baseDrg: 280,
    mdc: '05',
    medicalSurgical: 'medical',
    severityTier: 'Non-CC',
    description: 'Acute Myocardial Infarction, Discharged Alive without CC/MCC',
    weight: 0.77,
  },
  {
    code: 291,
    baseDrg: 291,
    mdc: '05',
    medicalSurgical: 'medical',
    severityTier: 'MCC',
    description: 'Heart Failure & Shock with MCC',
    weight: 1.38,
  },
  {
    code: 292,
    baseDrg: 291,
    mdc: '05',
    medicalSurgical: 'medical',
    severityTier: 'CC',
    description: 'Heart Failure & Shock with CC',
    weight: 1.01,
  },
  {
    code: 293,
    baseDrg: 291,
    mdc: '05',
    medicalSurgical: 'medical',
    severityTier: 'Non-CC',
    description: 'Heart Failure & Shock without CC/MCC',
    weight: 0.69,
  },
  {
    code: 470,
    baseDrg: 470,
    mdc: '08',
    medicalSurgical: 'surgical',
    severityTier: 'Non-CC',
    description: 'Major Joint Replacement or Reattachment of Lower Extremity without MCC',
    weight: 2.01,
  },
  {
    code: 469,
    baseDrg: 470,
    mdc: '08',
    medicalSurgical: 'surgical',
    severityTier: 'MCC',
    description: 'Major Joint Replacement or Reattachment of Lower Extremity with MCC',
    weight: 2.75,
  },
  {
    code: 871,
    baseDrg: 871,
    mdc: '18',
    medicalSurgical: 'medical',
    severityTier: 'MCC',
    description: 'Septicemia or Severe Sepsis with MV >96 Hours',
    weight: 5.12,
  },
  {
    code: 872,
    baseDrg: 871,
    mdc: '18',
    medicalSurgical: 'medical',
    severityTier: 'Non-CC',
    description: 'Septicemia or Severe Sepsis without MV >96 Hours with MCC',
    weight: 1.97,
  },
];
