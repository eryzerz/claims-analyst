import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runPipeline } from '../src/pipeline.js';
import { FindingCardSchema } from '@claims-analyst/shared';

const result = runPipeline();
console.log(`Signals detected: ${result.signals}`);
console.log(`Clusters formed: ${result.clusters}`);
console.log(`Finding cards: ${result.findingCards.length}`);

for (const card of result.findingCards) {
  const parsed = FindingCardSchema.safeParse(card);
  console.log(`\n--- ${card.title}`);
  console.log(`  Severity: ${card.severity}`);
  console.log(`  Score: ${card.hypotheses[0]?.score.toFixed(2) ?? 'N/A'}`);
  console.log(`  Schema valid: ${parsed.success}`);
  if (!parsed.success) console.log(`  Schema error: ${parsed.error.message}`);
  console.log(`  Summary: ${card.summary.slice(0, 120)}...`);
}

const outputArg = process.argv.find((a) => a.startsWith('--output='));
if (outputArg) {
  const outputPath = resolve(outputArg.split('=')[1]!);
  writeFileSync(outputPath, JSON.stringify(result.findingCards, null, 2));
  console.log(`\nFindings written to ${outputPath}`);
}
