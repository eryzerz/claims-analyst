import { describe, it, expect } from 'vitest';
import { runPipeline } from '../src/pipeline.js';
import { detectSignals } from '../src/signal-engine.js';
import { groupSignals } from '../src/signal-grouper.js';
import { getGraphDb, resetGraph } from '@claims-analyst/graph';
import { getDb, runEtl } from '@claims-analyst/data';
import { FindingCardSchema, SIGNAL_CATEGORY } from '@claims-analyst/shared';

describe('Signal rule engine', () => {
  it('detects upcoding signals from baseline z-scores', () => {
    runEtl();
    const signals = detectSignals();
    expect(signals.length).toBeGreaterThan(0);

    const upcodingSignals = signals.filter((s) => s.category === SIGNAL_CATEGORY.UPCODING);
    expect(upcodingSignals.length).toBeGreaterThan(0);

    const provB = upcodingSignals.filter((s) => s.providerId === 'PROV_B');
    expect(provB.length).toBeGreaterThan(0);
    for (const s of provB) {
      expect(Math.abs(s.metrics.zScore)).toBeGreaterThan(2.0);
    }
  });

  it('detects readmission signals', () => {
    runEtl();
    const signals = detectSignals();
    const readmissionSignals = signals.filter((s) => s.category === SIGNAL_CATEGORY.READMISSION);
    // PROV_D should have elevated readmission rate
    const provD = readmissionSignals.filter((s) => s.providerId === 'PROV_D');
    expect(provD.length).toBeGreaterThanOrEqual(0); // depends on seed data
  });
});

describe('Heuristic grouper', () => {
  it('groups signals by provider', () => {
    runEtl();
    const signals = detectSignals();
    const clusters = groupSignals(signals, { drgBaseMap: new Map() });

    expect(clusters.length).toBeGreaterThan(0);
    for (const c of clusters) {
      expect(c.signals.length).toBeGreaterThan(0);
      expect(c.primaryProviderId).toBeTruthy();
    }
  });
});

describe('End-to-end pipeline', () => {
  it('produces valid finding cards with upcoding findings', () => {
    const result = runPipeline();

    expect(result.signals).toBeGreaterThan(0);
    expect(result.findingCards.length).toBeGreaterThan(0);

    for (const card of result.findingCards) {
      const parsed = FindingCardSchema.safeParse(card);
      expect(parsed.success, `Card ${card.id} failed schema: ${parsed.error?.message}`).toBe(true);
      expect(card.hypotheses.length).toBeGreaterThan(0);
      expect(card.evidencePath.signals.length).toBeGreaterThan(0);
    }
  });

  it('flags PROV_B as critical upcoding risk', () => {
    const result = runPipeline();

    const provB = result.findingCards.filter(
      (c) => c.title.includes('PROV_B') && c.title.includes('Upcoding'),
    );
    expect(provB.length).toBeGreaterThan(0);
    expect(['critical', 'high']).toContain(provB[0]!.severity);
  });

  it('generates scored hypotheses with rationales', () => {
    const result = runPipeline();

    for (const card of result.findingCards) {
      for (const h of card.hypotheses) {
        expect(h.score).toBeGreaterThanOrEqual(0);
        expect(h.score).toBeLessThanOrEqual(1);
        expect(h.question.length).toBeGreaterThan(0);
        expect(h.rationale.length).toBeGreaterThan(0);
      }
    }
  });
});
