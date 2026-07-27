import type { SignalCategory } from '@claims-analyst/shared';
import { SIGNAL_CATEGORY } from '@claims-analyst/shared';

export const SEVERITY_ORDER = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
} as const;

export type Severity = keyof typeof SEVERITY_ORDER;

export const SEVERITY_BG: Record<Severity, string> = {
  critical: 'rgba(255, 68, 68, 0.12)',
  high: 'rgba(255, 136, 0, 0.12)',
  medium: 'rgba(255, 204, 0, 0.08)',
  low: 'rgba(68, 204, 68, 0.08)',
};

export const SEVERITY_COLOR: Record<Severity, string> = {
  critical: '#ff4444',
  high: '#ff8800',
  medium: '#ffcc00',
  low: '#44cc44',
};

export const SEVERITY_LABEL: Record<Severity, string> = {
  critical: 'CRIT',
  high: 'HIGH',
  medium: 'MED',
  low: 'LOW',
};

export interface CategoryStyle {
  label: string;
  bg: string;
  border: string;
}

export const CATEGORY_STYLES: Record<SignalCategory, CategoryStyle> = {
  [SIGNAL_CATEGORY.UPCODING]: {
    label: 'UPC',
    bg: 'rgba(255, 68, 68, 0.12)',
    border: '#ff4444',
  },
  [SIGNAL_CATEGORY.READMISSION]: {
    label: 'RDM',
    bg: 'rgba(255, 136, 0, 0.12)',
    border: '#ff8800',
  },
  [SIGNAL_CATEGORY.GEOGRAPHIC_SPIKE]: {
    label: 'GEO',
    bg: 'rgba(68, 153, 204, 0.12)',
    border: '#4499cc',
  },
};

export const ALL_CATEGORIES = Object.values(SIGNAL_CATEGORY) as SignalCategory[];

export function detectCategory(title: string): SignalCategory {
  const lower = title.toLowerCase();
  if (lower.includes('upcoding')) return SIGNAL_CATEGORY.UPCODING;
  if (lower.includes('readmission')) return SIGNAL_CATEGORY.READMISSION;
  return SIGNAL_CATEGORY.GEOGRAPHIC_SPIKE;
}
