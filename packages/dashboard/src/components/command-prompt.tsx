'use client';

import { useState, useRef, useEffect } from 'react';
import { useChat } from 'ai/react';
import ReactMarkdown from 'react-markdown';
import type { FindingCard } from '@claims-analyst/shared';

interface CommandPromptProps {
  activeFinding: FindingCard | null;
}

export function CommandPrompt({ activeFinding }: CommandPromptProps) {
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const findingContext = activeFinding
    ? {
        title: activeFinding.title,
        severity: activeFinding.severity,
        primaryProvider:
          activeFinding.title.match(/PROV_\w+/)?.[0] ?? 'unknown',
        summary: activeFinding.summary,
        recommendation: activeFinding.recommendation,
      }
    : null;

  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat({
      api: '/api/chat',
      body: { findingContext },
    });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        !expanded &&
        document.activeElement === document.body
      ) {
        e.preventDefault();
        setExpanded(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape' && expanded) {
        setExpanded(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [expanded]);

  if (!expanded && messages.length === 0) {
    return (
      <div
        className="flex items-center px-4 h-[32px] border-t flex-shrink-0 select-none"
        style={{
          borderColor: 'var(--border-1)',
          background: 'var(--surface-1)',
        }}
      >
        <span
          className="font-mono text-xs"
          style={{ color: 'var(--accent)', marginRight: '8px' }}
        >
          &gt;
        </span>
        <button
          type="button"
          className="font-mono text-xs cursor-pointer bg-transparent border-none hover:text-[#aaaaaa]"
          style={{ color: 'var(--text-muted)' }}
          onClick={() => {
            setExpanded(true);
            setTimeout(() => inputRef.current?.focus(), 50);
          }}
        >
          Ask about this finding...
          <span className="ml-4" style={{ color: 'var(--border-2)' }}>
            /
          </span>
        </button>
      </div>
    );
  }

  return (
    <div
      className="border-t flex-shrink-0"
      style={{ borderColor: 'var(--border-1)', background: 'var(--surface-1)' }}
    >
      {messages.length > 0 && (
        <div
          role="log"
          aria-live="polite"
          aria-label="Chat messages"
          className="max-h-[200px] overflow-y-auto px-4 py-2"
          style={{ background: 'var(--ground)' }}
        >
          {messages.map((m) => (
            <div key={m.id} className="mb-2">
              <span
                className="text-[10px] uppercase tracking-wider block mb-0.5"
                style={{
                  color:
                    m.role === 'user'
                      ? 'var(--accent)'
                      : 'var(--severity-low)',
                }}
              >
                {m.role === 'user' ? 'YOU' : 'AGENT'}
              </span>
              {m.role === 'assistant' ? (
                <div
                  className="text-xs leading-relaxed"
                  style={{
                    color: 'var(--text-secondary)',
                    fontFamily: 'system-ui, sans-serif',
                  }}
                >
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => (
                        <p className="mb-1 last:mb-0">{children}</p>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc pl-4 mb-1 space-y-0.5">{children}</ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal pl-4 mb-1 space-y-0.5">{children}</ol>
                      ),
                      li: ({ children }) => (
                        <li className="text-xs">{children}</li>
                      ),
                      strong: ({ children }) => (
                        <strong style={{ color: 'var(--text-primary)' }}>{children}</strong>
                      ),
                      code: ({ children }) => (
                        <code
                          className="text-[11px] px-1 py-0.5"
                          style={{
                            background: 'var(--surface-3)',
                            borderRadius: '2px',
                            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                          }}
                        >
                          {children}
                        </code>
                      ),
                      pre: ({ children }) => (
                        <pre
                          className="text-[11px] p-2 mb-1 overflow-x-auto"
                          style={{
                            background: 'var(--surface-3)',
                            borderRadius: '2px',
                          }}
                        >
                          {children}
                        </pre>
                      ),
                    }}
                  >
                    {m.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <p
                  className="text-xs leading-relaxed"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {m.content}
                </p>
              )}
            </div>
          ))}
          {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
            <div role="status" aria-live="polite" className="mb-2">
              <span
                className="text-[10px] uppercase tracking-wider block mb-0.5"
                style={{ color: 'var(--severity-low)' }}
              >
                AGENT
              </span>
              <span
                className="text-xs animate-pulse"
                style={{ color: 'var(--text-muted)' }}
                aria-label="Agent is responding"
              >
                ...
              </span>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-center px-4 h-[32px]">
        <label htmlFor="chat-input" className="sr-only">
          Ask the agent
        </label>
        <span
          aria-hidden
          className="font-mono text-xs flex-shrink-0"
          style={{ color: 'var(--accent)', marginRight: '8px' }}
        >
          &gt;
        </span>
        <input
          id="chat-input"
          ref={inputRef}
          type="text"
          value={input}
          onChange={handleInputChange}
          placeholder={
            activeFinding
              ? 'Ask about this finding...'
              : 'Ask the agent...'
          }
          className="flex-1 bg-transparent text-xs outline-none border-none"
          style={{
            color: 'var(--text-primary)',
            fontFamily: "'JetBrains Mono', 'Fira Code', ui-monospace, monospace",
          }}
          disabled={isLoading}
        />
        <button
          type="button"
          aria-label="Close chat"
          onClick={() => setExpanded(false)}
          className="font-mono text-xs ml-2 cursor-pointer bg-transparent border-none hover:text-[#aaaaaa]"
          style={{ color: 'var(--text-muted)' }}
        >
          Esc
        </button>
      </form>
    </div>
  );
}
