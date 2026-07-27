import kuzu from 'kuzu';
import type { QueryResult } from 'kuzu';

const DB_PATH = process.argv[2] ?? '/tmp/claims-graph.db';
const db = new kuzu.Database(DB_PATH);
const conn = new kuzu.Connection(db);

console.log('=== Nodes ===');
const nodeStmt = conn.prepareSync('MATCH (n) RETURN labels(n) as label, count(n) as cnt');
for (const row of iterResults(conn.executeSync(nodeStmt))) {
  console.log(`  ${String(row.label)}: ${row.cnt}`);
}

console.log('\n=== Providers ===');
const provStmt = conn.prepareSync('MATCH (p:Provider) RETURN p.id, p.name, p.stateCode');
for (const row of iterResults(conn.executeSync(provStmt))) {
  console.log(`  ${row['p.id']} | ${row['p.name']} | ${row['p.stateCode']}`);
}

console.log('\n=== Regions ===');
const regionStmt = conn.prepareSync('MATCH (r:Region) RETURN r.name');
for (const row of iterResults(conn.executeSync(regionStmt))) {
  console.log(`  ${row['r.name']}`);
}

console.log('\n=== KPI Hierarchy (INFLUENCES) ===');
const infStmt = conn.prepareSync('MATCH (a:Metric)-[i:INFLUENCES]->(b:Metric) RETURN a.name as from, b.name as to, i.weight as w');
for (const row of iterResults(conn.executeSync(infStmt))) {
  console.log(`  ${row.from} --(${row.w})--> ${row.to}`);
}

console.log('\n=== Hypotheses (top 3) ===');
const hypStmt = conn.prepareSync('MATCH (a:Metric)-[h:HYPOTHESIZES]->(b:Metric) RETURN h.pattern as pattern, h.question as question LIMIT 3');
for (const row of iterResults(conn.executeSync(hypStmt))) {
  console.log(`  [${row.pattern}] ${row.question}`);
}

console.log('\n=== DRG Distribution ===');
const drgStmt = conn.prepareSync(
  'MATCH (ic:InpatientClaim)-[:CLASSIFIED_AS]->(d:DRG) RETURN d.code, d.severityTier, count(ic) as cnt ORDER BY d.code'
);
for (const row of iterResults(conn.executeSync(drgStmt))) {
  console.log(`  DRG ${row['d.code']} (${row['d.severityTier']}): ${row.cnt} claims`);
}

conn.close();
db.close();

function* iterResults(result: QueryResult | QueryResult[]): Generator<Record<string, unknown>> {
  const res: QueryResult = Array.isArray(result) ? result[0]! : result;
  while (res.hasNext()) {
    yield res.getNextSync()!;
  }
}
