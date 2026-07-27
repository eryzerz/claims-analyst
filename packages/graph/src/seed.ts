import type { Connection as KuzuConnection, KuzuValue } from 'kuzu';
import { createSchema } from './schema.js';

export interface GraphSeedResult {
  providers: number;
  beneficiaries: number;
  inpatientClaims: number;
  outpatientClaims: number;
  drgs: number;
  regions: number;
  metrics: number;
  influences: number;
  hypotheses: number;
}

function exec(conn: KuzuConnection, query: string, params?: Record<string, KuzuValue>) {
  const stmt = conn.prepareSync(query);
  return conn.executeSync(stmt, params);
}

export function seedGraph(
  conn: KuzuConnection,
  data: {
    providers: Array<{ id: string; name: string; stateCode: string; teachingHospital: boolean; bedCount: number }>;
    beneficiaries: Array<{ id: string; stateCode: string; sex: string }>;
    inpatientClaims: Array<{
      id: string;
      beneficiaryId: string;
      providerId: string;
      drgCode: number;
      paymentAmount: number;
      utilizationDayCount: number;
      admissionDate: string;
      dischargeDate: string;
    }>;
    outpatientClaims: Array<{
      id: string;
      beneficiaryId: string;
      providerId: string;
      paymentAmount: number;
    }>;
    drgs: Array<{
      code: number;
      baseDrg: number;
      mdc: string;
      medicalSurgical: string;
      severityTier: string;
      description: string;
      weight: number;
    }>;
  },
): GraphSeedResult {
  createSchema(conn);

  for (const p of data.providers) {
    exec(conn,
      `CREATE (n:Provider {id: "${p.id}", name: "${escapeStr(p.name)}", stateCode: "${p.stateCode}", teachingHospital: ${p.teachingHospital}, bedCount: ${p.bedCount}})`,
    );
  }

  for (const b of data.beneficiaries) {
    exec(conn,
      `CREATE (n:Beneficiary {id: "${b.id}", stateCode: "${b.stateCode}", sex: "${b.sex}"})`,
    );
  }

  for (const c of data.inpatientClaims) {
    exec(conn,
      `CREATE (n:InpatientClaim {id: "${c.id}", drgCode: ${c.drgCode}, paymentAmount: ${c.paymentAmount}, utilizationDayCount: ${c.utilizationDayCount}, admissionDate: "${c.admissionDate}", dischargeDate: "${c.dischargeDate}"})`,
    );
  }

  for (const c of data.outpatientClaims) {
    exec(conn,
      `CREATE (n:OutpatientClaim {id: "${c.id}", paymentAmount: ${c.paymentAmount}})`);
  }

  for (const d of data.drgs) {
    exec(conn,
      `CREATE (n:DRG {code: ${d.code}, baseDrg: ${d.baseDrg}, mdc: "${d.mdc}", medicalSurgical: "${d.medicalSurgical}", severityTier: "${d.severityTier}", description: "${escapeStr(d.description)}", weight: ${d.weight}})`,
    );
  }

  const allStateCodes = new Set(data.providers.map((p) => p.stateCode));
  for (const stateCode of allStateCodes) {
    const region = getRegion(stateCode);
    exec(conn, `MERGE (r:Region {name: "${region}"})`);
  }

  // Edges
  for (const c of data.inpatientClaims) {
    exec(conn,
      `MATCH (ic:InpatientClaim {id: "${c.id}"}), (p:Provider {id: "${c.providerId}"}) CREATE (ic)-[:SUBMITTED_BY]->(p)`,
    );
    exec(conn,
      `MATCH (ic:InpatientClaim {id: "${c.id}"}), (b:Beneficiary {id: "${c.beneficiaryId}"}) CREATE (ic)-[:TREATED]->(b)`,
    );
    exec(conn,
      `MATCH (ic:InpatientClaim {id: "${c.id}"}), (d:DRG {code: ${c.drgCode}}) CREATE (ic)-[:CLASSIFIED_AS]->(d)`,
    );
  }

  for (const c of data.outpatientClaims) {
    exec(conn,
      `MATCH (oc:OutpatientClaim {id: "${c.id}"}), (p:Provider {id: "${c.providerId}"}) CREATE (oc)-[:SUBMITTED_BY]->(p)`,
    );
    exec(conn,
      `MATCH (oc:OutpatientClaim {id: "${c.id}"}), (b:Beneficiary {id: "${c.beneficiaryId}"}) CREATE (oc)-[:TREATED]->(b)`,
    );
  }

  for (const p of data.providers) {
    const region = getRegion(p.stateCode);
    exec(conn,
      `MATCH (p:Provider {id: "${p.id}"}), (r:Region {name: "${region}"}) CREATE (p)-[:LOCATED_IN]->(r)`,
    );
  }

  // Metrics
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
    exec(conn,
      `CREATE (n:Metric {id: "${m.id}", name: "${escapeStr(m.name)}"})`,
    );
  }

  // KPI hierarchy: INFLUENCES
  const influences: Array<[string, string, number]> = [
    ['metric_drg_coding_distribution', 'metric_avg_reimbursement', 0.9],
    ['metric_mcc_rate', 'metric_drg_coding_distribution', 0.8],
    ['metric_patient_acuity', 'metric_readmission_rate', 0.7],
    ['metric_readmission_rate', 'metric_avg_reimbursement', 0.6],
    ['metric_length_of_stay', 'metric_avg_reimbursement', 0.5],
    ['metric_provider_peer_group', 'metric_er_visit_volume', 0.4],
  ];

  for (const [from, to, weight] of influences) {
    exec(conn,
      `MATCH (a:Metric {id: "${from}"}), (b:Metric {id: "${to}"}) CREATE (a)-[:INFLUENCES {weight: ${weight}}]->(b)`,
    );
  }

  // Hypothesis edges: HYPOTHESIZES
  const hypotheses: Array<[string, string, string, string, string]> = [
    ['metric_mcc_rate', 'metric_drg_coding_distribution', 'upcoding',
      'Is the provider coding more MCC-qualifying diagnoses than peers with similar patient mix?',
      'MATCH (ic:InpatientClaim)-[:SUBMITTED_BY]->(p:Provider {id: $providerId}), (ic)-[:CLASSIFIED_AS]->(d:DRG) WHERE d.severityTier = "MCC" RETURN count(ic) as mccClaims',
    ],
    ['metric_patient_acuity', 'metric_mcc_rate', 'upcoding',
      'Does the patient mix justify the higher MCC rate, or is this a coding shift?',
      'MATCH (ic:InpatientClaim)-[:SUBMITTED_BY]->(p:Provider {id: $providerId}), (ic)-[:TREATED]->(b:Beneficiary), (ic)-[:CLASSIFIED_AS]->(d:DRG) WHERE d.severityTier = "MCC" RETURN count(DISTINCT b) as uniquePatients',
    ],
    ['metric_readmission_rate', 'metric_length_of_stay', 'readmission',
      'Is the high readmission rate due to quality issues (shorter stays) or patient acuity?',
      'MATCH (ic:InpatientClaim)-[:SUBMITTED_BY]->(p:Provider {id: $providerId}) RETURN avg(ic.utilizationDayCount) as avgLos',
    ],
    ['metric_readmission_rate', 'metric_patient_acuity', 'readmission',
      'Are patients at this provider sicker than peers, explaining the higher readmission rate?',
      'MATCH (ic:InpatientClaim)-[:SUBMITTED_BY]->(p:Provider {id: $providerId}), (ic)-[:TREATED]->(b:Beneficiary) RETURN count(DISTINCT b) as patients',
    ],
    ['metric_er_visit_volume', 'metric_provider_peer_group', 'geographic_spike',
      'Is the ER volume spike explained by miscoding, a disease outbreak, or a new competing facility?',
      'MATCH (p:Provider)-[:LOCATED_IN]->(r:Region {name: $region}) MATCH (oc:OutpatientClaim)-[:SUBMITTED_BY]->(p) RETURN count(oc) as erVisits',
    ],
    ['metric_er_visit_volume', 'metric_readmission_rate', 'geographic_spike',
      'Could the ER volume spike be follow-ups from earlier inpatient stays (readmission cascade)?',
      'MATCH (p:Provider)-[:LOCATED_IN]->(r:Region {name: $region}) MATCH (ic:InpatientClaim)-[:SUBMITTED_BY]->(p) RETURN count(ic) as inpatientClaims',
    ],
  ];

  for (const [from, to, pattern, question, cypherQuery] of hypotheses) {
    exec(conn,
      `MATCH (a:Metric {id: "${from}"}), (b:Metric {id: "${to}"}) CREATE (a)-[:HYPOTHESIZES {pattern: "${pattern}", question: "${escapeStr(question)}", cypherQuery: "${escapeStr(cypherQuery)}"}]->(b)`,
    );
  }

  return {
    providers: data.providers.length,
    beneficiaries: data.beneficiaries.length,
    inpatientClaims: data.inpatientClaims.length,
    outpatientClaims: data.outpatientClaims.length,
    drgs: data.drgs.length,
    regions: allStateCodes.size,
    metrics: metrics.length,
    influences: influences.length,
    hypotheses: hypotheses.length,
  };
}

function getRegion(stateCode: string): string {
  const northeast = ['NY', 'NJ', 'PA', 'CT', 'MA', 'RI', 'VT', 'NH', 'ME'];
  const midwest = ['IL', 'IN', 'OH', 'MI', 'WI', 'MN', 'IA', 'MO', 'KS', 'NE', 'SD', 'ND'];
  const south = ['TX', 'FL', 'GA', 'AL', 'MS', 'LA', 'AR', 'TN', 'KY', 'WV', 'VA', 'NC', 'SC', 'DC', 'DE', 'MD', 'OK'];
  const west = ['CA', 'WA', 'OR', 'NV', 'AZ', 'UT', 'CO', 'NM', 'ID', 'MT', 'WY', 'AK', 'HI'];

  if (northeast.includes(stateCode)) return 'Northeast';
  if (midwest.includes(stateCode)) return 'Midwest';
  if (south.includes(stateCode)) return 'South';
  if (west.includes(stateCode)) return 'West';
  return 'Unknown';
}

function escapeStr(s: string): string {
  return s.replace(/"/g, '\\"').replace(/'/g, "\\'");
}
