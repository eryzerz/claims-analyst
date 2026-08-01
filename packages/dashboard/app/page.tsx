'use client';

import { useState } from 'react';
import FindingsDashboard from '@/components/findings-dashboard';
import ChatPanel from '@/components/chat-panel';
import type { FindingCard } from '@/lib/types';
import findingsData from '@/data/findings.json';

export default function Home() {
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);
  const findings = findingsData as FindingCard[];

  return (
    <>
      <FindingsDashboard
        findings={findings}
        selectedFindingId={selectedFindingId}
        onSelectFinding={setSelectedFindingId}
      />
      <div className="max-w-4xl mx-auto px-6 pb-12">
        <ChatPanel
          findings={findings}
          selectedFindingId={selectedFindingId}
        />
      </div>
    </>
  );
}
