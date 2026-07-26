# SPEC: Claims Analyst Agent

Status: `ready-for-agent`

## Problem Statement

Healthcare claims auditors manually sift through massive datasets (CMS SynPUF) looking for fraud, waste, and abuse patterns — upcoding, readmission spirals, geographic anomalies. The data is too large and the patterns too subtle for human-only review. Auditors need an AI agent that can autonomously detect anomalous claim signals, form and test hypotheses against a knowledge graph of known fraud patterns, and produce structured, evidence-backed findings they can act on.

## Solution

A multi-stage autonomous claims analyst agent that:

1. **Ingests** CMS SynPUF claims data through an ETL pipeline into SQLite, computing baseline statistics for signal detection
2. **Detects** statistical anomalies (signals) using rule-based heuristics, groups related signals, and enriches them with graph context from a Kuzu knowledge graph
3. **Reasons** about each signal cluster: pulls the relevant subgraph, generates hypotheses from known fraud-pattern edges, spawns focused sub-agents to test each hypothesis against the data, and synthesizes a structured finding card with scored verdicts

The system ships with three seeded fraud scenarios (upcoding, readmission spiral, geographic spike) to validate the full pipeline end-to-end.

## User Stories

1. As an auditor, I want the system to detect when a provider's DRG coding distribution differs significantly from their peers, so that I can investigate potential upcoding.
2. As an auditor, I want the system to detect when a provider's 30-day readmission rate exceeds the baseline, so that I can investigate quality-of-care or fraud issues.
3. As an auditor, I want the system to detect geographic anomalies in service volume, so that I can investigate whether a local outbreak, miscoding, or new facility explains the spike.
4. As an auditor, I want each detected anomaly to be enriched with graph context (peer relationships, DRG hierarchies, regional norms), so that I understand the signal in its full context before the agent reasons about it.
5. As an auditor, I want the agent to autonomously generate multiple hypotheses for each anomaly from a library of known fraud and abuse patterns, so that no plausible explanation is missed.
6. As an auditor, I want each hypothesis to be tested by a focused sub-agent that receives only the data relevant to that question, so that each test is unbiased and efficient.
7. As an auditor, I want the agent to produce a structured finding card per signal cluster that includes the original signal, the hypotheses tested, each sub-agent's scored verdict, and a synthesized summary, so that I can review and act on the findings.
8. As an auditor, I want the finding card to include an evidence path (which data was queried, which graph edges were traversed, which hypotheses were rejected and why), so that the reasoning is auditable.
9. As a developer, I want the shared types, DRG codes, region maps, and signal schemas in a single shared package, so that all other packages stay in sync.
10. As a developer, I want the ETL pipeline to be reproducible from seed CSV files, so that I can rebuild the database deterministically for testing.
11. As a developer, I want the knowledge graph to encode a KPI hierarchy (which metrics influence which) and hypothesis edges (which fraud patterns map to which testable queries), so that the agent's reasoning is grounded in domain knowledge rather than free-form text.
12. As a developer, I want the agent architecture to be protocol-driven (signal → graph enrichment → hypothesis generation → sub-agent testing → synthesis), so that each stage is independently testable and the flow is predictable.
13. As an auditor, I want to view findings in a dashboard with a signal feed, investigation panels, and finding cards, so that I can triage alerts by severity and drill into details.
14. As an auditor, I want the dashboard to support conversational interaction with the agent (ask follow-up questions about a finding), so that I can explore findings interactively.
15. As a developer, I want the three seeded scenarios to serve as integration tests for the full pipeline, so that I can validate end-to-end correctness before adding new scenarios.

## Implementation Decisions

### Monorepo structure

The project uses a Turborepo monorepo with five packages:

- **shared**: Types, constants (DRG codes, region mappings), signal schemas, Zod validators
- **data**: ETL from CMS SynPUF CSVs into SQLite via better-sqlite3 + drizzle-orm. Computes baseline statistics (mean, stddev, percentile thresholds) per DRG, provider, and region. Seeds reference data from checked-in CSVs.
- **graph**: Kuzu embedded graph database. Schema defines KPI hierarchy nodes (metric → provider → region → DRG family → DRG) with influence edges, and hypothesis edges mapping fraud patterns to testable Cypher queries. Seeded from SQLite after ETL.
- **agents**: Multi-stage pipeline: (1) statistical rule engine detects anomalous signals from SQLite baselines, (2) heuristic grouper clusters related signals, (3) graph enricher attaches Kuzu subgraph context, (4) reasoning agent pulls subgraph, generates hypotheses from hypothesis edges, spawns sub-agents, synthesizes finding card. Built on Vercel AI SDK with OpenAI-compatible model.
- **dashboard**: Next.js App Router + shadcn/ui + AI Elements. Signal feed, investigation panel, finding cards. Conversational chat interface for follow-up queries against findings.

### Data layer decisions

- SQLite (better-sqlite3) for synchronous, embedded access — no server process needed
- drizzle-orm for schema definitions and migrations via drizzle-kit
- Seed CSVs stored in `packages/data/seeds/` — small enough for git (no binary blobs)
- Baseline statistics pre-computed at ETL time and stored in SQLite for fast signal rule evaluation
- pond-ts and als-statistics for statistical computations (z-scores, percentiles, distribution comparisons)

### Graph layer decisions

- Kuzu 0.11.3 embedded — no server, runs in-process
- Graph schema: nodes for Provider, DRG, Region, Claim, Patient, Metric. Edges for SUBMITTED_BY, BELONGS_TO, INFLUENCES, HYPOTHESIZES
- KPI hierarchy edges (INFLUENCES) map metric-to-metric relationships: e.g. DRG coding distribution INFLUENCES average reimbursement
- Hypothesis edges (HYPOTHESIZES) map fraud patterns to testable questions: e.g. "upcoding pattern" → "Is patient mix comparable to peers?" → Cypher query
- Graph seeded from SQLite after ETL completes
- Agent reads-only from graph; graph is rebuilt on each ETL run (not mutated by the agent)

### Agent architecture decisions

The agent follows a protocol-driven, deterministic pipeline before reaching the LLM:

1. **Statistical rule engine**: Evaluates z-score thresholds, peer-comparison baselines, and trend detectors. Emits raw signal objects with confidence scores.
2. **Heuristic grouper**: Clusters signals by provider, DRG family, region, and temporal proximity. Avoids flooding the agent with duplicate alerts.
3. **Graph enricher**: For each signal cluster, queries Kuzu for the relevant subgraph (peer providers, DRG hierarchy, influence edges, hypothesis edges). Attaches it as structured context.
4. **Reasoning agent** (single LLM call): Receives enriched signal cluster + subgraph. Generates hypotheses from the subgraph's hypothesis edges, then for each hypothesis, defines a focused question and data context for a sub-agent.
5. **Sub-agents** (parallel LLM calls): Each receives one hypothesis + question + data context. Returns a scored verdict (confidence 0–1 + rationale + evidence queries run).
6. **Synthesizer** (single LLM call): Collates sub-agent verdicts into a structured finding card with overall severity, key evidence, and recommendation.

The agent never free-forms its hypotheses — they must originate from hypothesis edges in the graph. This keeps reasoning grounded and testable.

### Schema

The finding card output schema (Zod-validated):

```typescript
const FindingCardSchema = z.object({
  id: z.string(),
  signalClusterId: z.string(),
  severity: z.enum(["low", "medium", "high", "critical"]),
  title: z.string(),
  summary: z.string(),
  hypotheses: z.array(z.object({
    id: z.string(),
    pattern: z.string(),
    question: z.string(),
    verdict: z.object({
      score: z.number().min(0).max(1),
      rationale: z.string(),
      evidenceQueries: z.array(z.string()),
    }),
  })),
  recommendation: z.string(),
  evidencePath: z.object({
    signals: z.array(z.string()),
    graphEdgesTraversed: z.array(z.string()),
    dataQueriesRun: z.array(z.string()),
  }),
});
```

### Statistical rules

For the three seeded scenarios:

- **Upcoding**: Compare provider's DRG distribution against peer group (same region, same specialty). Flag DRGs where z-score > 2.0 for high-cost codes or z-score < -2.0 for low-cost codes. Control for patient-mix confounding.
- **Readmission spiral**: Compute 30-day readmission rate per provider. Flag providers > 2 stddev above regional mean. Control for patient acuity (comorbidity count, age).
- **Geographic spike**: Compute weekly ER visit volume per region. Flag regions with > 3 stddev week-over-week change. Control for seasonality and population.

### Dashboard decisions

- Next.js App Router with RSC for data loading
- shadcn/ui component library (Tailwind)
- AI Elements for conversational interface: Conversation, Message, Shimmer, Panel
- Finding cards rendered as expandable panels with hypothesis drill-down
- Signal feed sorted by severity, filterable by scenario type

## Testing Decisions

### What makes a good test

- Test external behavior, not implementation details — assert on output shapes and values, not internal function calls
- Each test should set up known input, run the system under test, and assert observable output
- Prefer integration tests over unit tests where a seam naturally exists
- The three seeded scenarios serve as the primary acceptance tests

### Seams

Tests are organized at three seams, highest to lowest:

**Seam 1 — Agent protocol boundary (primary).** The reasoning agent receives a pre-built subgraph + signal context and produces finding cards. This is tested by:
- Creating test fixtures: pre-built subgraphs for each seeded scenario (upcoding, readmission, geographic)
- Feeding fixtures to the reasoning agent
- Asserting finding cards have correct shape (Zod validation), plausible hypotheses (drawn from the fixture's hypothesis edges), and non-trivial verdicts (scores ≠ 0, rationales reference the data)
- Individual sub-agents can mock or pass through a deterministic model for snapshot testing

**Seam 2 — Signal pipeline.** The statistical rules + grouper + enricher are tested by:
- Creating curated SQLite test databases with known anomalies injected
- Running the signal pipeline
- Asserting signals are correctly detected (present where injected, absent where not), groups are formed, and graph enrichment attaches the expected edges

**Seam 3 — ETL.** The data pipeline is tested by:
- Running ETL against seed CSVs
- Asserting SQLite tables exist, row counts match expectations, baseline statistics are correctly computed

### Prior art

These patterns match standard data-pipeline testing conventions — fixture-driven integration tests at the highest seam, curated test databases at the mid seam, and data-quality assertions at the lowest seam.

## Out of Scope

- Real-time claims ingestion (batch processing only for initial release)
- HIPAA compliance engineering (the system uses synthetic CMS data)
- Production deployment, CI/CD, auth — covered in a future milestone
- Additional fraud scenarios beyond the three seeded ones
- Model fine-tuning or custom LLM training
- Dashboard authentication and multi-tenant isolation

## Further Notes

- The three seeded scenarios must be the first thing built — they validate the full pipeline and serve as the acceptance test suite
- The shared package should be the first dependency established, since all other packages depend on its types
- Kuzu is embedded and read-only for the agent — no concurrent write concerns
- Stats computations (pond-ts, als-statistics) run at ETL time, not at query time, to keep signal detection fast
- The knowledge graph is the control plane — all agent reasoning flows through it; new fraud patterns are added as graph edges, not as code changes
