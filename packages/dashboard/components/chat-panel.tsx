'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import type { FindingCard } from '@/lib/types';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  findings?: FindingCard[];
  selectedFindingId?: string | null;
}

export default function ChatPanel({ findings = [], selectedFindingId = null }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // When a finding is selected, focus the input
  useEffect(() => {
    if (selectedFindingId) {
      inputRef.current?.focus();
    }
  }, [selectedFindingId]);

  const selectedFinding = selectedFindingId
    ? findings.find((f) => f.id === selectedFindingId)
    : null;

  const buildGlobalSummaries = (cards: FindingCard[]): string => {
    const capped = cards.slice(0, 10);
    return capped
      .map((c) => {
        const sev = c.severity.toUpperCase();
        const prefix = sev === 'CRITICAL' ? `[CRITICAL] ` : sev === 'HIGH' ? `[HIGH] ` : '';
        return `${prefix}${c.title}: ${c.summary.slice(0, 100)}`;
      })
      .join('\n') +
      (cards.length > 10 ? `\n\n...and ${cards.length - 10} more findings. Filter or select a specific card for details.` : '');
  };

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg: ChatMessage = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const context = selectedFinding
      ? { mode: 'finding' as const, finding: selectedFinding }
      : { mode: 'global' as const, summaries: buildGlobalSummaries(findings) };

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMsg], context }),
      });
      const data = (await res.json()) as ChatMessage;
      setMessages((prev) => [...prev, data]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border border-border rounded-lg bg-card overflow-hidden" id="chat-panel">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-medium">
          {selectedFinding ? (
            <>Ask about <span className="text-accent">{selectedFinding.title}</span></>
          ) : (
            'Ask about findings'
          )}
          {!selectedFinding && findings.length > 0 && (
            <span className="text-muted-foreground font-normal"> — {findings.length} in view</span>
          )}
        </h3>
        {selectedFinding && (
          <button
            onClick={() => {
              // Clear selection — reset to global mode
              window.location.hash = 'chat-panel';
            }}
            className="text-xs text-muted-foreground hover:text-foreground mt-1"
          >
            ← Switch to global view
          </button>
        )}
      </div>

      <div className="h-72 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-xs text-muted-foreground text-center py-12 space-y-2">
            {selectedFinding ? (
              <>
                <p>You are asking about a specific finding.</p>
                <p className="italic">Try: "What are the hypotheses?" or "What's the evidence?"</p>
              </>
            ) : (
              <>
                {findings.length > 0 ? (
                  <>
                    <p>{findings.length} findings loaded as context.</p>
                    <p className="italic">Try: "What are the critical findings?" or "Show me recommendations"</p>
                  </>
                ) : (
                  <p>No findings available. Run the pipeline to generate results.</p>
                )}
              </>
            )}
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                msg.role === 'user'
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-muted text-foreground prose prose-sm prose-invert max-w-none'
              }`}
            >
              {msg.role === 'user' ? (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              ) : (
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg px-3 py-2 text-sm text-muted-foreground animate-pulse">
              Analyzing...
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      <div className="border-t border-border p-3 flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder={
            selectedFinding
              ? 'Ask about this finding...'
              : 'Ask about all findings...'
          }
          className="flex-1 bg-muted border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="bg-accent text-accent-foreground px-3 py-1.5 rounded-md text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
        >
          Send
        </button>
      </div>
    </div>
  );
}
