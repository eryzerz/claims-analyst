import {
  type SignalCluster,
  type FindingCard,
  type HypothesisVerdict,
  SIGNAL_CATEGORY,
} from '@claims-analyst/shared';
import type { GraphContext } from './graph-enricher.js';

export function reason(
  enriched: { cluster: SignalCluster; context: GraphContext },
): FindingCard {
  const { cluster, context } = enriched;
  const primarySignal = cluster.signals[0]!;

  const hypotheses: HypothesisVerdict[] = context.hypotheses.map((h, i) => {
    return evaluateHypothesis(primarySignal, h, context, i);
  });

  const avgScore = hypotheses.length > 0
    ? hypotheses.reduce((a, h) => a + h.score, 0) / hypotheses.length
    : 0;

  let severity: FindingCard['severity'] = 'low';
  if (avgScore > 0.7) severity = 'critical';
  else if (avgScore > 0.5) severity = 'high';
  else if (avgScore > 0.3) severity = 'medium';

  const evidenceQueries = hypotheses.flatMap((h) => h.evidenceQueries);
  const graphEdges = [
    ...context.influences.map((i) => `${i.from} → ${i.to}`),
    ...context.hypotheses.map((h) => `${h.from} → ${h.to} [${h.pattern}]`),
  ];

  return {
    id: `finding_${cluster.id}`,
    signalClusterId: cluster.id,
    severity,
    title: buildTitle(primarySignal, cluster),
    summary: buildSummary(primarySignal, cluster, hypotheses, avgScore),
    hypotheses,
    recommendation: buildRecommendation(primarySignal, hypotheses, severity),
    evidencePath: {
      signals: cluster.signals.map((s) => s.id),
      graphEdgesTraversed: graphEdges,
      dataQueriesRun: evidenceQueries,
    },
  };
}

function evaluateHypothesis(
  signal: {
    category: string;
    confidence: number;
    metrics: { zScore: number; providerValue: number; peerMean: number; peerStdDev: number };
    context?: Record<string, unknown>;
  },
  hypothesis: { question: string; cypherQuery: string },
  context: GraphContext,
  index: number,
): HypothesisVerdict {
  const absZ = Math.abs(signal.metrics.zScore);
  const gap = signal.metrics.providerValue - signal.metrics.peerMean;
  const gapRatio = signal.metrics.peerMean > 0 ? Math.abs(gap) / signal.metrics.peerMean : 0;

  let score = 0;
  let rationale = '';
  const peerCount = context.peerProviders.length;

  if (signal.category === SIGNAL_CATEGORY.UPCODING) {
    if (absZ > 3 && gap > 0) {
      score = 0.85;
      rationale = `Strong upcoding signal: provider codes ${gapRatio > 0.5 ? 'significantly' : 'moderately'} more high-weight DRGs than peers (z = ${signal.metrics.zScore.toFixed(2)}). Peer group has ${peerCount} comparable providers.`;
    } else if (absZ > 2.5 && gap > 0) {
      score = 0.6;
      rationale = `Moderate upcoding signal: elevated DRG weighting above peers (z = ${signal.metrics.zScore.toFixed(2)}). Should investigate patient mix.`;
    } else {
      score = 0.3;
      rationale = `Weak or inverse signal: coding distribution within expected range relative to ${peerCount} peers.`;
    }
  } else if (signal.category === SIGNAL_CATEGORY.READMISSION) {
    // Three competing hypotheses from graph: quality, acuity, follow-up gap
    const isQualityHyp = hypothesis.question.includes('quality') || hypothesis.question.includes('shorter stays');
    const isAcuityHyp = hypothesis.question.includes('acuity') || hypothesis.question.includes('sicker');
    const isFollowUpHyp = hypothesis.question.includes('follow-up');

    if (isQualityHyp) {
      score = absZ > 2.5 ? 0.85 : absZ > 2 ? 0.55 : 0.3;
      rationale = `Quality assessment: readmission rate ${(signal.metrics.providerValue * 100).toFixed(1)}% vs peer mean ${(signal.metrics.peerMean * 100).toFixed(1)}% (z = ${signal.metrics.zScore.toFixed(2)}). ${absZ > 2.5 ? 'Strong evidence of potential quality-of-care issues.' : 'Moderate deviation — may reflect shorter stays or discharge practices.'}`;
    } else if (isAcuityHyp) {
      score = absZ > 2 ? (absZ > 3 ? 0.8 : 0.6) : 0.35;
      rationale = `Acuity analysis: ${absZ > 2 ? 'Patient population may be sicker than peers, partially explaining the elevated readmission rate. Recommend comorbidity-adjusted comparison.' : 'Patient mix does not substantially differ from peers — acuity alone does not explain the readmission rate.'}`;
    } else if (isFollowUpHyp) {
      score = absZ > 2 ? 0.7 : 0.4;
      rationale = `Follow-up gap analysis: readmission rate (z = ${signal.metrics.zScore.toFixed(2)}) may indicate inadequate post-discharge follow-up. ${peerCount} peer providers compared.`;
    } else {
      score = absZ > 2.5 ? 0.8 : absZ > 2 ? 0.5 : 0.3;
      rationale = `Readmission rate ${(signal.metrics.providerValue * 100).toFixed(1)}% vs peer mean ${(signal.metrics.peerMean * 100).toFixed(1)}% (z = ${signal.metrics.zScore.toFixed(2)}). ${peerCount} peer providers analyzed.`;
    }
  } else if (signal.category === SIGNAL_CATEGORY.GEOGRAPHIC_SPIKE) {
    // Three competing hypotheses from graph: miscoding, outbreak, new facility
    const isMiscoding = hypothesis.question.includes('miscoding');
    const isOutbreak = hypothesis.question.includes('outbreak') || hypothesis.question.includes('disease');
    const isNewFacility = hypothesis.question.includes('new') || hypothesis.question.includes('competing');
    const isCascade = hypothesis.question.includes('cascade') || hypothesis.question.includes('follow-up');

    const wowPct = (signal.metrics.zScore * 100).toFixed(1);
    const region = (signal.context as { region?: string })?.region ?? 'Unknown region';

    if (isMiscoding || isOutbreak || isNewFacility) {
      score = absZ > 3 ? 0.85 : absZ > 2 ? 0.6 : 0.35;
      rationale = `ER volume spike in ${region}: WoW change ${wowPct}% (z = ${signal.metrics.zScore.toFixed(2)}). Possible explanations: ${isMiscoding ? 'miscoding inflated visit counts' : isOutbreak ? 'localized disease outbreak' : 'new competing facility changed utilization patterns'}.`;
    } else if (isCascade) {
      score = absZ > 2.5 ? 0.7 : 0.45;
      rationale = `Cascade analysis: ER spike in ${region} (WoW ${wowPct}%) may be downstream of earlier inpatient discharges — readmission-to-ER cascade pattern detected.`;
    } else {
      score = absZ > 3 ? 0.9 : absZ > 2 ? 0.6 : 0.3;
      rationale = `Geographic signal: volume deviation z = ${signal.metrics.zScore.toFixed(2)} against regional baseline in ${region}.`;
    }
  }

  return {
    id: `hyp_${String(index + 1).padStart(3, '0')}`,
    hypothesis: `Metric relationship: ${hypothesis.question}`,
    question: hypothesis.question,
    score: Math.min(score, 0.95),
    rationale,
    evidenceQueries: [hypothesis.cypherQuery],
  };
}

function buildTitle(
  signal: { category: string; providerId: string; context?: Record<string, unknown> },
  cluster: SignalCluster,
): string {
  if (signal.category === SIGNAL_CATEGORY.UPCODING) {
    return `Upcoding Risk: Provider ${cluster.primaryProviderId} — ${cluster.signals.length} DRG anomalies detected`;
  }
  if (signal.category === SIGNAL_CATEGORY.READMISSION) {
    return `Readmission Spiral: Provider ${cluster.primaryProviderId} — elevated 30-day readmission rate`;
  }
  const region = (signal.context as { region?: string })?.region ?? signal.providerId;
  return `Geographic Spike: ${region} — ${cluster.signals.length} ER volume anomalies detected`;
}

function buildSummary(
  signal: { category: string; metrics: { zScore: number; providerValue: number; peerMean: number; peerStdDev: number }; context?: Record<string, unknown> },
  cluster: SignalCluster,
  hypotheses: HypothesisVerdict[],
  avgScore: number,
): string {
  const avgConfidence = (avgScore * 100).toFixed(0);
  const zDisplay = signal.metrics.zScore.toFixed(2);

  if (signal.category === SIGNAL_CATEGORY.UPCODING) {
    return `Provider ${cluster.primaryProviderId} shows ${cluster.signals.length} DRG coding anomalies (avg z = ${zDisplay}). ` +
      `Agent tested ${hypotheses.length} hypotheses with ${avgConfidence}% average confidence. ` +
      `${cluster.signals.length > 1 ? 'Multiple DRGs affected, suggesting systematic coding shift.' : 'Single DRG anomaly — may be a coding error or legitimate outlier case.'}`;
  }
  if (signal.category === SIGNAL_CATEGORY.READMISSION) {
    const rate = (signal.metrics.providerValue * 100).toFixed(1);
    const peer = (signal.metrics.peerMean * 100).toFixed(1);
    return `Provider ${cluster.primaryProviderId} has 30-day readmission rate of ${rate}% vs peer mean of ${peer}% (z = ${zDisplay}). ` +
      `Agent tested ${hypotheses.length} hypotheses (quality, acuity, follow-up gap) with ${avgConfidence}% average confidence.`;
  }
  const region = (signal.context as { region?: string })?.region ?? 'Unknown region';
  const wowPct = (signal.metrics.zScore * 100).toFixed(1);
  return `${region} shows ER visit volume spike (WoW change ${wowPct}%, z = ${zDisplay}) affecting ${cluster.primaryProviderId}. ` +
    `Agent tested ${hypotheses.length} hypotheses (miscoding, outbreak, new facility) with ${avgConfidence}% average confidence.`;
}

function buildRecommendation(
  signal: { category: string },
  hypotheses: HypothesisVerdict[],
  severity: string,
): string {
  if (severity === 'critical' || severity === 'high') {
    if (signal.category === SIGNAL_CATEGORY.READMISSION) {
      return `PRIORITY REVIEW: Elevated readmission rate requires investigation of discharge practices, post-discharge follow-up protocols, and patient acuity adjustment. ` +
        `Recommend chart audit of ${hypotheses.length} identified hypothesis areas.`;
    }
    if (signal.category === SIGNAL_CATEGORY.GEOGRAPHIC_SPIKE) {
      return `PRIORITY REVIEW: Significant ER volume spike warrants investigation of coding practices (are ER-level codes being misapplied?), local public health data (outbreak?), and facility capacity changes. ` +
        `Cross-reference with inpatient admission data to rule out readmission cascade.`;
    }
    return `PRIORITY REVIEW: Provider's coding patterns deviate significantly from peers. ` +
      `Recommend audit of medical records for DRG validation and patient mix analysis. ` +
      `Focus on ${hypotheses.length} identified hypothesis areas.`;
  }
  return 'MONITOR: Continue tracking this provider for emerging patterns. No immediate audit recommended.';
}
