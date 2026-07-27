# Design

<!-- impeccable:design-schema 1 -->

## Visual World

**Bloomberg Terminal** — a dark, data-dense investigation interface where every pixel earns its place. Monospaced precision, keyboard-driven speed, severity as the only saturated color. The auditor scans, flags, drills, and moves on. No decorative chrome.

## Color

Dark monitoring room on a large display — the ground is near-black, the text is light, severity alone carries color.

| Token | Value | Role |
|---|---|---|
| `--ground` | `#080808` | Page background |
| `--surface-1` | `#111111` | Card/panel background |
| `--surface-2` | `#161616` | Selected/hover state |
| `--surface-3` | `#1c1c1c` | Elevated surface |
| `--border-1` | `#1a1a1a` | Subtle borders |
| `--border-2` | `#262626` | Visible borders |
| `--text-primary` | `#e6e6e6` | Primary content |
| `--text-secondary` | `#999999` | Supporting text |
| `--text-muted` | `#666666` | Disabled/placeholder |
| `--severity-critical` | `#ff4444` | Critical finding |
| `--severity-high` | `#ff8800` | High finding |
| `--severity-medium` | `#ffcc00` | Medium finding |
| `--severity-low` | `#44cc44` | Low finding |
| `--accent` | `#4499cc` | Brand accent, links, selection |
| `--accent-dim` | `rgba(68, 153, 204, 0.15)` | Selection highlight |

## Typography

Monospaced-first: data, labels, navigation, headings all use the mono stack. Compact sans for longer reading passages.

| Token | Stack | Use |
|---|---|---|
| `--font-mono` | `'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'SF Mono', ui-monospace, monospace` | Data rows, labels, severity indicators, finding titles, navigation |
| `--font-sans` | `system-ui, -apple-system, 'Segoe UI', sans-serif` | Finding summaries, hypothesis rationales, chat messages |
| `--font-size-xs` | `0.688rem` | Timestamps, metadata |
| `--font-size-sm` | `0.75rem` | Secondary data, labels |
| `--font-size-base` | `0.8125rem` | Body text, row content |
| `--font-size-lg` | `0.9375rem` | Finding titles, section headers |
| `--font-size-xl` | `1.125rem` | Investigation panel headings |

Line height: 1.3 for data rows, 1.5 for reading passages.

## Spatial System

Grid-based at 4px increments. No decorative spacing — whitespace is functional separation.

| Token | Value | Use |
|---|---|---|
| `--space-1` | `4px` | Inline gaps, icon spacing |
| `--space-2` | `8px` | Row padding, compact gaps |
| `--space-3` | `12px` | Section gaps |
| `--space-4` | `16px` | Panel padding |
| `--space-6` | `24px` | Major section separation |

Border radius: `2px` (sharp rectangles, no rounded corners). Terminal aesthetic.

## Layout

Two-column split (70/30) with top status bar and bottom command prompt. The feed scrolls independently, the investigation panel is sticky.

```
┌─────────────────────────────────────────────────────────┐
│ STATUS BAR: scenario pills · active signals · clock     │
├───────────────────────────────────┬─────────────────────┤
│                                   │                     │
│  SIGNAL FEED (70%)                │  INVESTIGATION      │
│  ─ dense scrollable rows ─        │  PANEL (30%)        │
│  ■ PROV_B   UPCODING   CRITICAL   │  ─ sticky detail ─  │
│  ■ PROV_D   READMIT    HIGH       │  hypotheses matrix  │
│  ■ PROV_E   GEO_SPIKE  MEDIUM     │  evidence trail     │
│  ■ ...                            │  recommendation     │
│                                   │                     │
├───────────────────────────────────┴─────────────────────┤
│ > Ask about this finding...                       [↵]   │
└─────────────────────────────────────────────────────────┘
```

## Components

Every control rebuilt in the terminal vocabulary. No stock component chrome survives.

- **FindingRow**: Monospaced, 28px height, severity dot leading, provider code, DRG family, scenario badge, summary snippet truncated. Hover lifts to `--surface-2`. Selected gets accent left border.
- **InvestigationPanel**: Sticky right panel. Empty state shows aggregate stats (signals/hour, severity distribution). Populated state shows finding title, hypothesis matrix (side-by-side scored verdicts), evidence trail, recommendation block.
- **StatusBar**: Monospaced labels. Scenario filter pills toggle on/off. Live signal count in monospaced numerals.
- **CommandPrompt**: Minimal `>` prompt, monospaced, sits at the bottom edge. Expands upward into conversation when active.

## Keyboard

| Key | Action |
|---|---|
| `j` / `k` | Navigate finding rows |
| `Enter` | Select finding (open in investigation panel) |
| `e` | Escalate finding |
| `d` | Dismiss finding |
| `/` | Open command prompt |
| `Esc` | Close prompt / deselect |
| `f` | Open scenario filter |

## Severity Encoding

Severity is always color AND position. Critical findings pin to top of feed regardless of sort order. The severity dot precedes every finding row. In the investigation panel, severity sets the accent border and heading color.
