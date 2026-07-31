import { NextResponse } from 'next/server';

const findings = [
  {
    id: 'finding_cluster_001',
    signalClusterId: 'cluster_001',
    severity: 'critical',
    title: 'Upcoding Risk: Provider PROV_B — 3 DRG anomalies detected',
    summary: 'Provider PROV_B shows 3 DRG coding anomalies with significant deviation from peer mean. Agent tested 2 hypotheses with 85% average confidence. Multiple DRGs affected, suggesting systematic coding shift.',
    hypotheses: [
      {
        id: 'hyp_001',
        hypothesis: 'Metric relationship: Is the provider coding more MCC-qualifying diagnoses than peers with similar patient mix?',
        question: 'Is the provider coding more MCC-qualifying diagnoses than peers with similar patient mix?',
        score: 0.85,
        rationale: 'Strong upcoding signal: provider codes significantly more high-weight DRGs than peers (z = 16.04). Peer group has 4 comparable providers.',
        evidenceQueries: ['MATCH (ic:InpatientClaim)-[:SUBMITTED_BY]->(p:Provider {id: $providerId}), (ic)-[:CLASSIFIED_AS]->(d:DRG) WHERE d.severityTier = "MCC" RETURN count(ic) as mccClaims'],
      },
      {
        id: 'hyp_002',
        hypothesis: 'Metric relationship: Does the patient mix justify the higher MCC rate, or is this a coding shift?',
        question: 'Does the patient mix justify the higher MCC rate, or is this a coding shift?',
        score: 0.60,
        rationale: 'Patient mix analysis: elevated DRG weighting above peers. Should investigate whether patient demographics explain the coding pattern.',
        evidenceQueries: ['MATCH (ic:InpatientClaim)-[:SUBMITTED_BY]->(p:Provider {id: $providerId}), (ic)-[:TREATED]->(b:Beneficiary), (ic)-[:CLASSIFIED_AS]->(d:DRG) WHERE d.severityTier = "MCC" RETURN count(DISTINCT b) as uniquePatients'],
      },
    ],
    recommendation: 'PRIORITY REVIEW: Provider\'s coding patterns deviate significantly from peers. Recommend audit of medical records for DRG validation and patient mix analysis. Focus on 2 identified hypothesis areas.',
    evidencePath: {
      signals: ['signal_PROV_B_193', 'signal_PROV_B_280', 'signal_PROV_B_291'],
      graphEdgesTraversed: [
        'DRG Coding Distribution → Average Reimbursement',
        'MCC Tier Rate → DRG Coding Distribution',
        'MCC Tier Rate → DRG Coding Distribution [upcoding]',
      ],
      dataQueriesRun: ['SELECT provider_id, drg_distribution FROM provider_baselines'],
    },
  },
  {
    id: 'finding_cluster_002',
    signalClusterId: 'cluster_002',
    severity: 'critical',
    title: 'Readmission Spiral: Provider PROV_D — elevated 30-day readmission rate',
    summary: 'Provider PROV_D has 30-day readmission rate of 8.3% vs peer mean of 1.3% (z = 2.83). Agent tested 2 hypotheses (quality, acuity, follow-up gap) with 73% average confidence.',
    hypotheses: [
      {
        id: 'hyp_003',
        hypothesis: 'Metric relationship: Is the high readmission rate due to quality issues (shorter stays) or patient acuity?',
        question: 'Is the high readmission rate due to quality issues (shorter stays) or patient acuity?',
        score: 0.85,
        rationale: 'Quality assessment: readmission rate 8.3% vs peer mean 1.3% (z = 2.83). Strong evidence of potential quality-of-care issues.',
        evidenceQueries: ['MATCH (ic:InpatientClaim)-[:SUBMITTED_BY]->(p:Provider {id: $providerId}) RETURN avg(ic.utilizationDayCount) as avgLos'],
      },
      {
        id: 'hyp_004',
        hypothesis: 'Metric relationship: Are patients at this provider sicker than peers, explaining the higher readmission rate?',
        question: 'Are patients at this provider sicker than peers, explaining the higher readmission rate?',
        score: 0.60,
        rationale: 'Acuity analysis: patient population may be sicker than peers, partially explaining the elevated readmission rate. Recommend comorbidity-adjusted comparison.',
        evidenceQueries: ['MATCH (ic:InpatientClaim)-[:SUBMITTED_BY]->(p:Provider {id: $providerId}), (ic)-[:TREATED]->(b:Beneficiary) RETURN count(DISTINCT b) as patients'],
      },
    ],
    recommendation: 'PRIORITY REVIEW: Elevated readmission rate requires investigation of discharge practices, post-discharge follow-up protocols, and patient acuity adjustment. Recommend chart audit of 2 identified hypothesis areas.',
    evidencePath: {
      signals: ['signal_PROV_D_readmission'],
      graphEdgesTraversed: [
        'Patient Acuity → 30-Day Readmission Rate',
        '30-Day Readmission Rate → Average Reimbursement',
        '30-Day Readmission Rate → Average Reimbursement [readmission]',
      ],
      dataQueriesRun: ['SELECT provider_id, readmission_rate FROM provider_baselines'],
    },
  },
  {
    id: 'finding_cluster_003',
    signalClusterId: 'cluster_003',
    severity: 'medium',
    title: 'Geographic Spike: South — 1 ER volume anomalies detected',
    summary: 'South region shows ER visit volume spike (WoW change 200.0%, z = 2.00). Agent tested 2 hypotheses (miscoding, outbreak, new facility) with 40% average confidence.',
    hypotheses: [
      {
        id: 'hyp_005',
        hypothesis: 'Metric relationship: Is the ER volume spike explained by miscoding, a disease outbreak, or a new competing facility?',
        question: 'Is the ER volume spike explained by miscoding, a disease outbreak, or a new competing facility?',
        score: 0.35,
        rationale: 'ER volume spike in South: WoW change 200.0% (z = 2.00). Possible explanations: miscoding inflated visit counts.',
        evidenceQueries: ['MATCH (p:Provider)-[:LOCATED_IN]->(r:Region {name: $region}) MATCH (oc:OutpatientClaim)-[:SUBMITTED_BY]->(p) RETURN count(oc) as erVisits'],
      },
      {
        id: 'hyp_006',
        hypothesis: 'Metric relationship: Could the ER volume spike be follow-ups from earlier inpatient stays?',
        question: 'Could the ER volume spike be follow-ups from earlier inpatient stays?',
        score: 0.45,
        rationale: 'Cascade analysis: ER spike in South (WoW 200.0%) may be downstream of earlier inpatient discharges — readmission-to-ER cascade pattern detected.',
        evidenceQueries: ['MATCH (p:Provider)-[:LOCATED_IN]->(r:Region {name: $region}) MATCH (ic:InpatientClaim)-[:SUBMITTED_BY]->(p) RETURN count(ic) as inpatientClaims'],
      },
    ],
    recommendation: 'MONITOR: Continue tracking the South region for emerging ER utilization patterns. Cross-reference with inpatient admission data to rule out readmission cascade.',
    evidencePath: {
      signals: ['signal_geo_South_2009-W40'],
      graphEdgesTraversed: [
        'ER Visit Volume → Provider Peer Group [geographic_spike]',
        'ER Visit Volume → 30-Day Readmission Rate [geographic_spike]',
      ],
      dataQueriesRun: ['SELECT region, er_volume FROM region_baselines'],
    },
  },
];

export async function GET() {
  return NextResponse.json(findings);
}
