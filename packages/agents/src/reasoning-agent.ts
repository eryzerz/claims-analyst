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
    const verdict = evaluateHypothesis(primarySignal, h, context, i);
    return verdict;
  });

  const maxScore = Math.max(...hypotheses.map((h) => h.score), 0);
  const avgScore = hypotheses.reduce((a, h) => a + h.score, 0) / hypotheses.length;

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
  signal: { category: string; confidence: number; metrics: { zScore: number; providerValue: number; peerMean: number; peerStdDev: number } },
  hypothesis: { question: string; cypherQuery: string },
  context: GraphContext,
  index: number,
): HypothesisVerdict {
  const absZ = Math.abs(signal.metrics.zScore);
  const gap = signal.metrics.providerValue - signal.metrics.peerMean;
  const gapRatio = signal.metrics.peerMean > 0 ? Math.abs(gap) / signal.metrics.peerMean : 0;

  // Rule-based scoring based on signal strength and peer context
  let score = 0;
  let rationale = '';

  if (signal.category === SIGNAL_CATEGORY.UPCODING) {
    if (absZ > 3 && gap > 0) {
      score = 0.85;
      rationale = `Strong upcoding signal: provider codes ${gapRatio > 0.5 ? 'significantly' : 'moderately'} more high-weight DRGs than peers (z = ${signal.metrics.zScore.toFixed(2)}). Peer group has ${context.peerProviders.length} comparable providers.`;
    } else if (absZ > 2.5 && gap > 0) {
      score = 0.6;
      rationale = `Moderate upcoding signal: elevated DRG weighting above peers (z = ${signal.metrics.zScore.toFixed(2)}). Should investigate patient mix.`;
    } else {
      score = 0.3;
      rationale = `Weak or inverse signal: coding distribution within expected range relative to ${context.peerProviders.length} peers.`;
    }
  } else if (signal.category === SIGNAL_CATEGORY.READMISSION) {
    score = absZ > 2.5 ? 0.8 : absZ > 2 ? 0.5 : 0.3;
    rationale = `Readmission rate ${(signal.metrics.providerValue * 100).toFixed(1)}% vs peer mean ${(signal.metrics.peerMean * 100).toFixed(1)}% (z = ${signal.metrics.zScore.toFixed(2)}). ${context.peerProviders.length} peer providers analyzed.`;
  } else {
    score = absZ > 3 ? 0.9 : absZ > 2 ? 0.6 : 0.3;
    rationale = `Geographic signal: volume deviation z = ${signal.metrics.zScore.toFixed(2)} against regional baseline.`;
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

function buildTitle(signal: { category: string; providerId: string }, cluster: SignalCluster): string {
  if (signal.category === SIGNAL_CATEGORY.UPCODING) {
    return `Upcoding Risk: Provider ${cluster.primaryProviderId} — ${cluster.signals.length} DRG anomalies detected`;
  }
  if (signal.category === SIGNAL_CATEGORY.READMISSION) {
    return `Readmission Anomaly: Provider ${cluster.primaryProviderId}`;
  }
  return `Geographic Spike: Provider ${cluster.primaryProviderId}`;
}

function buildSummary(
  signal: { category: string; metrics: { zScore: number; providerValue: number; peerMean: number; peerStdDev: number } },
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
    return `Provider ${cluster.primaryProviderId} has readmission rate of ${(signal.metrics.providerValue * 100).toFixed(1)}% vs peer mean of ${(signal.metrics.peerMean * 100).toFixed(1)}% (z = ${zDisplay}). ` +
      `Agent tested ${hypotheses.length} hypotheses with ${avgConfidence}% average confidence.`;
  }
  return `Provider ${cluster.primaryProviderId} shows geographic volume anomaly (z = ${zDisplay}). ` +
    `Agent tested ${hypotheses.length} hypotheses with ${avgConfidence}% average confidence.`;
}

function buildRecommendation(
  signal: { category: string },
  hypotheses: HypothesisVerdict[],
  severity: string,
): string {
  if (severity === 'critical' || severity === 'high') {
    return `PRIORITY REVIEW: Provider's coding patterns deviate significantly from peers. ` +
      `Recommend audit of medical records for DRG validation and patient mix analysis. ` +
      `Focus on ${hypotheses.length} identified hypothesis areas.`;
  }
  return 'MONITOR: Continue tracking this provider for emerging patterns. No immediate audit recommended.';
}
