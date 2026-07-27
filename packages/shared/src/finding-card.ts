import { z } from 'zod';

export const HypothesisVerdictSchema = z.object({
  id: z.string(),
  hypothesis: z.string(),
  question: z.string(),
  score: z.number().min(0).max(1),
  rationale: z.string(),
  evidenceQueries: z.array(z.string()),
});

export type HypothesisVerdict = z.infer<typeof HypothesisVerdictSchema>;

export const EvidencePathSchema = z.object({
  signals: z.array(z.string()),
  graphEdgesTraversed: z.array(z.string()),
  dataQueriesRun: z.array(z.string()),
});

export type EvidencePath = z.infer<typeof EvidencePathSchema>;

export const FindingCardSchema = z.object({
  id: z.string(),
  signalClusterId: z.string(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  title: z.string(),
  summary: z.string(),
  hypotheses: z.array(HypothesisVerdictSchema),
  recommendation: z.string(),
  evidencePath: EvidencePathSchema,
});

export type FindingCard = z.infer<typeof FindingCardSchema>;
