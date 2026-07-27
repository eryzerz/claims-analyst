import { z } from 'zod';

export const DRG_DISTRIBUTION_ENTRY = z.object({
  drgCode: z.number(),
  count: z.number(),
  rate: z.number(),
  peerMeanRate: z.number(),
  peerStdDev: z.number(),
  zScore: z.number(),
});

export const PROVIDER_BASELINE = z.object({
  providerId: z.string(),
  drgDistribution: z.array(DRG_DISTRIBUTION_ENTRY),
  readmissionRate: z.number(),
  readmissionPeerMean: z.number(),
  readmissionPeerStdDev: z.number(),
  patientAcuityMean: z.number(),
  totalClaims: z.number(),
});

export const REGION_BASELINE = z.object({
  region: z.string(),
  weeklyErVolume: z.number(),
  weeklyErMean: z.number(),
  weeklyErStdDev: z.number(),
  weekOverWeekChange: z.number(),
});

export type DrgDistributionEntry = z.infer<typeof DRG_DISTRIBUTION_ENTRY>;
export type ProviderBaseline = z.infer<typeof PROVIDER_BASELINE>;
export type RegionBaseline = z.infer<typeof REGION_BASELINE>;
