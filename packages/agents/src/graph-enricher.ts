import type { KuzuConnection } from '@claims-analyst/graph';
import type { SignalCluster } from '@claims-analyst/shared';

export interface GraphContext {
  peerProviders: Array<{ id: string; name: string }>;
  drgHierarchy: Array<{ code: number; severityTier: string; description: string }>;
  influences: Array<{ from: string; to: string; weight: number }>;
  hypotheses: Array<{
    from: string;
    to: string;
    pattern: string;
    question: string;
    cypherQuery: string;
  }>;
}

export function enrichCluster(
  conn: KuzuConnection,
  cluster: SignalCluster,
): { cluster: SignalCluster; context: GraphContext } {
  const context: GraphContext = {
    peerProviders: [],
    drgHierarchy: [],
    influences: [],
    hypotheses: [],
  };

  // Peer providers in same region
  const peerStmt = conn.prepareSync(
    `MATCH (p:Provider {id: $providerId})-[:LOCATED_IN]->(r:Region)
     MATCH (peer:Provider)-[:LOCATED_IN]->(r)
     WHERE peer.id <> p.id
     RETURN peer.id, peer.name`,
  );
  const peerResult = conn.executeSync(peerStmt, { providerId: cluster.primaryProviderId });
  const peerRows = Array.isArray(peerResult) ? peerResult : [peerResult];
  for (const row of peerRows) {
    while (row.hasNext()) {
      const r = row.getNextSync()!;
      context.peerProviders.push({ id: String(r['peer.id']), name: String(r['peer.name']) });
    }
  }

  // DRG hierarchy
  if (cluster.primaryDrgCode) {
    const drgStmt = conn.prepareSync(
      `MATCH (d:DRG)
       WHERE d.baseDrg = $baseDrg
       RETURN d.code, d.severityTier, d.description`,
    );
    const drgResult = conn.executeSync(drgStmt, { baseDrg: cluster.primaryDrgCode });
    const drgRows = Array.isArray(drgResult) ? drgResult : [drgResult];
    for (const row of drgRows) {
      while (row.hasNext()) {
        const r = row.getNextSync()!;
        context.drgHierarchy.push({
          code: Number(r['d.code']),
          severityTier: String(r['d.severityTier']),
          description: String(r['d.description']),
        });
      }
    }
  }

  // KPI influences
  const infStmt = conn.prepareSync(
    `MATCH (a:Metric)-[i:INFLUENCES]->(b:Metric)
     RETURN a.name, b.name, i.weight`,
  );
  const infResult = conn.executeSync(infStmt);
  const infRows = Array.isArray(infResult) ? infResult : [infResult];
  for (const row of infRows) {
    while (row.hasNext()) {
      const r = row.getNextSync()!;
      context.influences.push({
        from: String(r['a.name']),
        to: String(r['b.name']),
        weight: Number(r['i.weight']),
      });
    }
  }

  // Hypotheses for this signal category
  const hypStmt = conn.prepareSync(
    `MATCH (a:Metric)-[h:HYPOTHESIZES]->(b:Metric)
     WHERE h.pattern = $pattern
     RETURN a.name, b.name, h.pattern, h.question, h.cypherQuery`,
  );
  const hypResult = conn.executeSync(hypStmt, { pattern: cluster.signals[0]?.category ?? 'upcoding' });
  const hypRows = Array.isArray(hypResult) ? hypResult : [hypResult];
  for (const row of hypRows) {
    while (row.hasNext()) {
      const r = row.getNextSync()!;
      context.hypotheses.push({
        from: String(r['a.name']),
        to: String(r['b.name']),
        pattern: String(r['h.pattern']),
        question: String(r['h.question']),
        cypherQuery: String(r['h.cypherQuery']),
      });
    }
  }

  return { cluster, context };
}
