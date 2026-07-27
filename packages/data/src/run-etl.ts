import { runEtl } from './etl.js';

const result = runEtl();

console.log('ETL complete:');
console.log('  Ingested:');
console.log(`    beneficiaries: ${result.ingested.beneficiaries}`);
console.log(`    providers: ${result.ingested.providers}`);
console.log(`    drg_definitions: ${result.ingested.drgDefinitions}`);
console.log(`    inpatient_claims: ${result.ingested.inpatientClaims}`);
console.log(`    outpatient_claims: ${result.ingested.outpatientClaims}`);
console.log('  Baselines:');
console.log(`    provider baselines: ${result.baselines.providerBaselines}`);
console.log(`    region baselines: ${result.baselines.regionBaselines}`);
