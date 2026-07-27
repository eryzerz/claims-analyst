import { z } from 'zod';

export const SIGNAL_CATEGORY = {
  UPCODING: 'upcoding',
  READMISSION: 'readmission',
  GEOGRAPHIC_SPIKE: 'geographic_spike',
} as const;

export type SignalCategory = (typeof SIGNAL_CATEGORY)[keyof typeof SIGNAL_CATEGORY];

export const SignalSchema = z.object({
  id: z.string(),
  category: z.enum(['upcoding', 'readmission', 'geographic_spike']),
  providerId: z.string(),
  description: z.string(),
  confidence: z.number().min(0).max(1),
  metrics: z.object({
    zScore: z.number(),
    peerMean: z.number(),
    providerValue: z.number(),
    peerStdDev: z.number(),
  }),
  context: z.record(z.string(), z.unknown()).optional(),
  detectedAt: z.string(),
});

export type Signal = z.infer<typeof SignalSchema>;

export const SignalClusterSchema = z.object({
  id: z.string(),
  signals: z.array(SignalSchema),
  primaryProviderId: z.string(),
  primaryDrgCode: z.number().optional(),
  primaryRegion: z.string().optional(),
  clusterRationale: z.string(),
});

export type SignalCluster = z.infer<typeof SignalClusterSchema>;
