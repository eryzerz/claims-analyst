# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Government claims auditors working in Medicare/Medicaid program integrity units. They review flagged claims at scale — scanning high volumes of potential fraud signals, triaging by severity, drilling into evidence, and determining which findings to escalate for investigation. Their measure of success is catching fraud efficiently without drowning in false positives.

## Product Purpose

Claims Analyst Agent detects fraud, waste, and abuse in CMS healthcare claims by combining statistical anomaly detection, a provider/beneficiary/DRG knowledge graph, and LLM-powered multi-hypothesis reasoning. It produces structured Finding Cards — scored competing hypotheses, evidence paths, severity ratings, and recommendations — so auditors can investigate at scale with confidence in both what was flagged and why.

## Positioning

**Graph-enriched multi-hypothesis reasoning.** Unlike tools that surface statistical outliers, this system traces each signal through a knowledge graph of providers, beneficiaries, DRG hierarchies, and peer relationships, then generates competing explanations for every finding. A simple upcoding alert becomes "Is this upcoding, or does this provider treat a sicker patient population?" — with each hypothesis scored against the evidence. A competitor could truthfully say they detect anomalies; they could not claim to enrich each signal with graph-traced peer context and LLM-scored counter-hypotheses.

## Operating Context

Desktop web application used during investigation shifts. The core workflow: scan signal feed → triage by severity → drill into individual findings → review hypotheses and evidence paths → determine next action (escalate, dismiss, request more data). Data sources include CMS inpatient, outpatient, and carrier claims, DRG code hierarchies, provider profiles, and regional statistical baselines. Development uses synthetic CMS data (SynPUF); the intended production context is real Medicare claims environments.

## Capabilities and Constraints

**Capabilities:**
- Signal feed sorted by severity with scenario-type filtering (upcoding, readmission spirals, geographic spikes)
- Expandable Finding Cards with scored competing hypotheses, evidence paths, and recommendations
- Conversational AI (Vercel AI Elements) for natural-language follow-up questions about findings
- Severity triage: low, medium, high, critical
- Three seeded fraud scenarios in synthetic data: upcoding (PROV_B/NY), readmission spiral (PROV_D/TX), geographic spike (PROV_E/FL)

**Constraints:**
- No authentication or authorization (out of scope for initial release)
- No multi-tenant isolation
- No HIPAA compliance engineering (synthetic data only during development)
- No production deployment, CI/CD pipeline, or auth system
- Embedded SQLite and Kuzu graph database run locally in-process
- Depends on sibling monorepo packages for the detection pipeline: `@claims-analyst/agents`, `@claims-analyst/shared`

**Terminology:** Claim (atomic unit), Provider (hospital/facility), Beneficiary (Medicare enrollee), DRG/MS-DRG (Diagnosis Related Group with severity tiers), Upcoding (assigning higher-paying DRG codes than justified), Readmission (30-day return), SynPUF (synthetic CMS data), Finding Card (structured output with hypotheses, severity, evidence, recommendation).

**Undecided:**
- Whether the conversational AI is a primary surface or a secondary interrogation tool
- Production deployment target and hosting environment
- Whether responsive/mobile support is required

## Brand Commitments

No binding brand commitments exist. Internal project name is "Claims Analyst Agent." The `@claims-analyst/*` scoped package namespace is established. Teaching materials use dark red (`#8b0000`) as an accent color and Palatino Linotype serif typography, but these are informal lesson styling, not brand decisions.

## Evidence on Hand

- Synthetic CMS data (SynPUF) seeded with three known fraud scenarios
- Detection pipeline producing FindingCard objects with scored hypotheses
- Domain glossary (81 terms covering claims, DRGs, fraud types)
- Teaching lessons on healthcare claims, DRG mechanics, and upcoding patterns
- Reference CMS documentation and fraud-detection survey links in RESOURCES.md

**Absences that future work must not fabricate:** No real case studies, testimonials, production metrics, customer evidence, or institutional endorsements.

## Product Principles

1. **Evidence over alerts.** Every signal must be traceable to its source data and explainable through competing hypotheses. The auditor needs to know why, not just what.
2. **Triage at scale.** The dashboard must help auditors process many findings quickly, prioritizing the most severe and actionable without burying signal in noise.
3. **Explainability is trust.** The AI's reasoning must be transparent, scored, and contestable. The auditor, not the model, makes the final call on fraud.
4. **Graph context enriches detection.** Statistical anomalies gain meaning through relationships: peer providers, DRG hierarchies, regional norms, and historical patterns. Detection is a network problem, not just a threshold problem.
5. **Conversational interrogation.** Users can ask natural-language follow-up questions about findings, drilling into evidence without needing SQL or Cypher expertise.

## Accessibility & Inclusion

No product-specific accessibility requirements have been established. Web platform defaults suggest WCAG 2.1 AA as an appropriate target for a government-adjacent investigation tool. Desktop-first with responsive considerations to be determined.
