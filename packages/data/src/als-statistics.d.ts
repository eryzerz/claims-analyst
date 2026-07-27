declare module 'als-statistics' {
  export class Stats {
    static mean(params: { values: number[]; sum?: number }): number;
    static stdDev(params: { values: number[]; variance?: number }): number;
    static stdDevSample(params: { values: number[]; varianceSample?: number }): number;
    static variance(params: { values: number[]; mean?: number }): number;
    static varianceSample(params: { values: number[]; mean?: number }): number;
    static zScore(
      params: { mean: number; stdDev: number; values: number[] },
      value: number,
    ): number;
    static zScores(params: { values: number[]; stdDev?: number; mean?: number }, sample?: boolean): number[];
    static median(params: { values: number[]; sorted?: number[] }): number;
    static percentile(params: { values: number[]; sorted?: number[] }, q: number): number | undefined;
    static sum(params: { values: number[] }): number;
    static sorted(params: { values: number[] }): number[];
    static frequencies(params: { values: number[]; labels?: string[] }): Record<string, number>;
  }

  export class Table {}
  export class Analyze {}
  export function htmlTable(): string;
  export function range(start: number, end: number, step?: number): number[];
  export function round(value: number, decimals?: number): number;
}
