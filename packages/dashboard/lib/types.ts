export interface Hypothesis {
  id: string;
  hypothesis: string;
  question: string;
  score: number;
  rationale: string;
  evidenceQueries: string[];
}

export interface FindingCard {
  id: string;
  signalClusterId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  summary: string;
  hypotheses: Hypothesis[];
  recommendation: string;
  evidencePath: {
    signals: string[];
    graphEdgesTraversed: string[];
    dataQueriesRun: string[];
  };
}
