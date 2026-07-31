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

  it('detects readmission signals for PROV_D', () => {
    runEtl();
    const signals = detectSignals();
    const readmit = signals.filter((s) => s.category === SIGNAL_CATEGORY.READMISSION);
    expect(readmit.length).toBeGreaterThanOrEqual(1);

    const provD = readmit.find((s) => s.providerId === 'PROV_D');
    expect(provD).toBeDefined();
    expect(provD!.metrics.zScore).toBeGreaterThan(2.0);
  });

  it('detects geographic spike signals', () => {
    runEtl();
    const signals = detectSignals();
    const geo = signals.filter((s) => s.category === SIGNAL_CATEGORY.GEOGRAPHIC_SPIKE);
    expect(geo.length).toBeGreaterThanOrEqual(1);
  });
});

describe('Heuristic grouper', () => {
  it('groups signals into clusters by category and provider', () => {
    runEtl();
    const signals = detectSignals();
    const clusters = groupSignals(signals, { drgBaseMap: new Map() });

    expect(clusters.length).toBeGreaterThan(0);

    const categories = new Set(clusters.flatMap((c) => c.signals.map((s) => s.category)));
    // Should have all three categories if signals for each exist
    if (signals.some((s) => s.category === SIGNAL_CATEGORY.UPCODING)) {
      expect(categories.has(SIGNAL_CATEGORY.UPCODING)).toBe(true);
    }
  });
});

describe('End-to-end pipeline — all scenarios', () => {
  it('produces valid finding cards for upcoding scenario', () => {
    const result = runPipeline();
    const upcodingCards = result.findingCards.filter(
      (c) => c.title.includes('Upcoding'),
    );
    expect(upcodingCards.length).toBeGreaterThan(0);

    for (const card of upcodingCards) {
      const parsed = FindingCardSchema.safeParse(card);
      expect(parsed.success, `Card ${card.id} failed: ${parsed.error?.message}`).toBe(true);
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

  it('produces finding cards for readmission scenario', () => {
    const result = runPipeline();
    const readmitCards = result.findingCards.filter(
      (c) => c.title.includes('Readmission'),
    );
    expect(readmitCards.length).toBeGreaterThanOrEqual(1);

    const provD = readmitCards.find((c) => c.title.includes('PROV_D'));
    expect(provD).toBeDefined();
    expect(provD!.hypotheses.length).toBeGreaterThan(0);

    for (const card of readmitCards) {
      const parsed = FindingCardSchema.safeParse(card);
      expect(parsed.success, `Card ${card.id} failed: ${parsed.error?.message}`).toBe(true);
    }
  });

  it('produces finding cards for geographic spike scenario', () => {
    const result = runPipeline();
    const geoCards = result.findingCards.filter(
      (c) => c.title.includes('Geographic'),
    );
    expect(geoCards.length).toBeGreaterThanOrEqual(1);

    for (const card of geoCards) {
      const parsed = FindingCardSchema.safeParse(card);
      expect(parsed.success, `Card ${card.id} failed: ${parsed.error?.message}`).toBe(true);
      expect(card.hypotheses.length).toBeGreaterThan(0);
    }
  });

  it('generates scored hypotheses with scenario-specific rationales', () => {
    const result = runPipeline();

    const allCards = result.findingCards;
    expect(allCards.length).toBeGreaterThan(0);

    for (const card of allCards) {
      for (const h of card.hypotheses) {
        expect(h.score).toBeGreaterThanOrEqual(0);
        expect(h.score).toBeLessThanOrEqual(1);
        expect(h.question.length).toBeGreaterThan(0);
        expect(h.rationale.length).toBeGreaterThan(0);
      }
    }
  });
});
