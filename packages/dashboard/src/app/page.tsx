import { DashboardShell } from '../components/dashboard-shell';
import { getDashboardData } from '../lib/data';
import type { DashboardData } from '../lib/data';

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  let data: DashboardData | undefined;
  let error: string | null = null;

  try {
    data = getDashboardData();
  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to load pipeline data';
  }

  if (error) {
    return (
      <div
        className="h-full flex items-center justify-center p-8"
        style={{
          background: 'var(--ground)',
          fontFamily: "'JetBrains Mono', 'Fira Code', ui-monospace, monospace",
        }}
      >
        <div className="text-center">
          <div className="text-sm mb-2" style={{ color: 'var(--severity-critical)' }}>
            ERROR
          </div>
          <div className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
            {error}
          </div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Verify pipeline: pnpm -C packages/agents exec tsx src/run-pipeline.ts
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.findingCards.length === 0) {
    return (
      <div
        className="h-full flex items-center justify-center p-8"
        style={{
          background: 'var(--ground)',
          fontFamily: "'JetBrains Mono', 'Fira Code', ui-monospace, monospace",
        }}
      >
        <div className="text-center">
          <div className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
            NO ACTIVE SIGNALS
          </div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Pipeline status: idle. Run the pipeline to generate findings.
          </div>
        </div>
      </div>
    );
  }

  return <DashboardShell data={data} />;
}
