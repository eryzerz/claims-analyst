import type { Connection as KuzuConnection, QueryResult } from 'kuzu';

export function queryProviderSubgraph(
  conn: KuzuConnection,
  providerId: string,
): QueryResult | QueryResult[] {
  const stmt = conn.prepareSync(
    `MATCH (p:Provider {id: $providerId})
     OPTIONAL MATCH (ic:InpatientClaim)-[:SUBMITTED_BY]->(p)
     OPTIONAL MATCH (ic)-[:CLASSIFIED_AS]->(d:DRG)
     OPTIONAL MATCH (ic)-[:TREATED]->(b:Beneficiary)
     OPTIONAL MATCH (p)-[:LOCATED_IN]->(r:Region)
     RETURN p, ic, d, b, r`,
  );
  return conn.executeSync(stmt, { providerId });
}

export function queryDrgPeers(
  conn: KuzuConnection,
  drgCode: number,
  providerId: string,
): QueryResult | QueryResult[] {
  const stmt = conn.prepareSync(
    `MATCH (p:Provider {id: $providerId})-[:LOCATED_IN]->(r:Region)
     MATCH (peer:Provider)-[:LOCATED_IN]->(r)
     WHERE peer.id <> p.id
     MATCH (ic:InpatientClaim)-[:SUBMITTED_BY]->(peer)
     MATCH (ic)-[:CLASSIFIED_AS]->(d:DRG {code: $drgCode})
     RETURN peer, d, count(ic) as claimCount
     ORDER BY claimCount DESC`,
  );
  return conn.executeSync(stmt, { drgCode, providerId });
}

export function queryUpcodingHypotheses(
  conn: KuzuConnection,
): QueryResult | QueryResult[] {
  const stmt = conn.prepareSync(
    `MATCH (a:Metric)-[h:HYPOTHESIZES]->(b:Metric)
     WHERE h.pattern = "upcoding"
     RETURN a.name, b.name, h.question, h.cypherQuery`,
  );
  return conn.executeSync(stmt);
}

export function queryReadmissionHypotheses(
  conn: KuzuConnection,
): QueryResult | QueryResult[] {
  const stmt = conn.prepareSync(
    `MATCH (a:Metric)-[h:HYPOTHESIZES]->(b:Metric)
     WHERE h.pattern = "readmission"
     RETURN a.name, b.name, h.question, h.cypherQuery`,
  );
  return conn.executeSync(stmt);
}

export function queryGeographicHypotheses(
  conn: KuzuConnection,
): QueryResult | QueryResult[] {
  const stmt = conn.prepareSync(
    `MATCH (a:Metric)-[h:HYPOTHESIZES]->(b:Metric)
     WHERE h.pattern = "geographic_spike"
     RETURN a.name, b.name, h.question, h.cypherQuery`,
  );
  return conn.executeSync(stmt);
}

export function queryKpiHierarchy(
  conn: KuzuConnection,
): QueryResult | QueryResult[] {
  const stmt = conn.prepareSync(
    `MATCH (a:Metric)-[i:INFLUENCES]->(b:Metric)
     RETURN a.name, b.name, i.weight`,
  );
  return conn.executeSync(stmt);
}

export function queryDrgBySeverity(
  conn: KuzuConnection,
  severityTier: string,
): QueryResult | QueryResult[] {
  const stmt = conn.prepareSync(
    `MATCH (d:DRG)
     WHERE d.severityTier = $severityTier
     RETURN d.code, d.description, d.weight
     ORDER BY d.weight DESC`,
  );
  return conn.executeSync(stmt, { severityTier });
}
