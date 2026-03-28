'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Search,
  Sparkles,
  AlertCircle,
  CheckCircle,
  Loader2,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  Send,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatPanelProps {
  messages: Message[];
  isStreaming: boolean;
  status: 'running' | 'completed' | 'failed' | null;
  rootCause?: string;
  confidence?: number;
  suggestedFixes?: string[];
  investigationId?: string;
  error?: string | null;
  onSendFollowUp?: (query: string) => void;
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const level = confidence >= 75 ? 'high' : confidence >= 40 ? 'medium' : 'low';
  const colors = {
    high: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
    medium: 'bg-amber-500/10 text-amber-400 ring-amber-500/20',
    low: 'bg-red-500/10 text-red-400 ring-red-500/20',
  };
  const labels = { high: 'High', medium: 'Medium', low: 'Low' };

  return (
    <div className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg ring-1 text-[11px] font-mono font-semibold', colors[level])}>
      <div className="relative w-8 h-1.5 bg-current/20 rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-current rounded-full transition-all duration-500"
          style={{ width: `${confidence}%` }}
        />
      </div>
      <span>{confidence}%</span>
      <span className="opacity-60">{labels[level]}</span>
    </div>
  );
}

export function ChatPanel({
  messages,
  isStreaming,
  status,
  rootCause,
  confidence,
  suggestedFixes,
  investigationId,
  error,
  onSendFollowUp,
}: ChatPanelProps) {
  const [followUp, setFollowUp] = useState('');
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [feedbackSent, setFeedbackSent] = useState<'helpful' | 'not_helpful' | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when streaming
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  const copyToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const sendFeedback = async (rating: 'helpful' | 'not_helpful') => {
    if (!investigationId || feedbackSent) return;
    setFeedbackSent(rating);
    try {
      await fetch('/api/investigations/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          investigationId,
          rating,
          rootCauseAccurate: rating === 'helpful',
        }),
      });
    } catch {
      // Silent fail — feedback is non-critical
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              'rounded-2xl p-5',
              msg.role === 'user'
                ? 'bg-[var(--sibyl)]/[0.06] border border-[var(--sibyl)]/10'
                : 'glass-card'
            )}
          >
            {/* Message header */}
            <div className="flex items-center gap-2 mb-3">
              {msg.role === 'user' ? (
                <div className="p-1 rounded-md bg-[var(--sibyl)]/10">
                  <Search size={12} className="text-[var(--sibyl)]" />
                </div>
              ) : (
                <div className="p-1 rounded-md bg-[var(--sibyl)]/10">
                  <Sparkles size={12} className="text-[var(--sibyl)]" />
                </div>
              )}
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                {msg.role === 'user' ? 'Your Query' : 'Sibyl AI'}
              </span>
              <span className="text-[10px] text-muted-foreground ml-auto">
                {msg.timestamp.toLocaleTimeString()}
              </span>
            </div>

            {/* Message content with markdown-like formatting */}
            <div className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none">
              {renderContent(msg.content)}
              {msg.role === 'assistant' && isStreaming && i === messages.length - 1 && (
                <span className="inline-block w-1.5 h-4 bg-[var(--sibyl)] animate-pulse ml-0.5 rounded-sm" />
              )}
            </div>

            {/* Action bar for assistant messages */}
            {msg.role === 'assistant' && !isStreaming && (
              <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-border/20">
                <button
                  onClick={() => copyToClipboard(msg.content, i)}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  title="Copy"
                >
                  {copiedIdx === i ? <Check size={12} className="text-[var(--success)]" /> : <Copy size={12} />}
                </button>
                <button
                  onClick={() => sendFeedback('helpful')}
                  disabled={!!feedbackSent}
                  className={cn(
                    'p-1.5 rounded-lg transition-colors',
                    feedbackSent === 'helpful'
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'hover:bg-muted text-muted-foreground hover:text-foreground',
                    feedbackSent && feedbackSent !== 'helpful' && 'opacity-30',
                  )}
                  title="Helpful"
                >
                  <ThumbsUp size={12} />
                </button>
                <button
                  onClick={() => sendFeedback('not_helpful')}
                  disabled={!!feedbackSent}
                  className={cn(
                    'p-1.5 rounded-lg transition-colors',
                    feedbackSent === 'not_helpful'
                      ? 'bg-red-500/10 text-red-400'
                      : 'hover:bg-muted text-muted-foreground hover:text-foreground',
                    feedbackSent && feedbackSent !== 'not_helpful' && 'opacity-30',
                  )}
                  title="Not helpful"
                >
                  <ThumbsDown size={12} />
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Loading state */}
        {isStreaming && messages.length < 2 && (
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <Loader2 size={16} className="animate-spin text-[var(--sibyl)]" />
              <div>
                <span className="text-sm text-muted-foreground">Analyzing telemetry data...</span>
                <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                  Querying logs, traces, deploys, and running correlations
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Root cause card */}
        {rootCause && !isStreaming && (
          <div className="card-premium rounded-2xl p-5 ring-1 ring-[var(--success)]/20">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle size={16} className="text-[var(--success)]" />
              <span className="text-sm font-semibold">Root Cause Identified</span>
              {typeof confidence === 'number' && (
                <div className="ml-auto">
                  <ConfidenceBadge confidence={confidence} />
                </div>
              )}
            </div>
            <p className="text-sm leading-relaxed">{rootCause}</p>
            {suggestedFixes && suggestedFixes.length > 0 && (
              <div className="mt-4 pt-3 border-t border-border/20">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Suggested Fixes</span>
                <div className="mt-2 space-y-1.5">
                  {suggestedFixes.map((fix, i) => (
                    <div key={i} className="flex gap-2 text-sm">
                      <span className="text-[var(--sibyl)] font-mono text-[11px] mt-0.5 shrink-0">{i + 1}.</span>
                      <span>{fix}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error card */}
        {error && (
          <div className="rounded-2xl p-5 bg-[var(--error)]/[0.06] border border-[var(--error)]/10">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle size={14} className="text-[var(--error)]" />
              <span className="text-sm font-semibold text-[var(--error)]">Error</span>
            </div>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        )}
      </div>

      {/* Follow-up input */}
      {status === 'completed' && onSendFollowUp && (
        <div className="pt-4 border-t border-border/30">
          <div className="glass-card rounded-xl p-1.5 flex items-center gap-2">
            <input
              type="text"
              value={followUp}
              onChange={e => setFollowUp(e.target.value)}
              placeholder="Ask a follow-up question..."
              className="flex-1 bg-transparent border-none outline-none text-sm px-3"
              onKeyDown={e => {
                if (e.key === 'Enter' && followUp.trim()) {
                  onSendFollowUp(followUp.trim());
                  setFollowUp('');
                }
              }}
            />
            <button
              onClick={() => {
                if (followUp.trim()) {
                  onSendFollowUp(followUp.trim());
                  setFollowUp('');
                }
              }}
              disabled={!followUp.trim()}
              className="p-2 rounded-lg bg-[var(--sibyl)] text-white disabled:opacity-40 transition-opacity"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Simple markdown-like content renderer
function renderContent(content: string) {
  const lines = content.split('\n');
  const elements: React.ReactElement[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('### ')) {
      elements.push(<h3 key={i} className="text-sm font-bold mt-3 mb-1">{line.slice(4)}</h3>);
    } else if (line.startsWith('## ')) {
      elements.push(<h2 key={i} className="text-base font-bold mt-4 mb-1.5">{line.slice(3)}</h2>);
    } else if (line.startsWith('# ')) {
      elements.push(<h1 key={i} className="text-lg font-bold mt-4 mb-2">{line.slice(2)}</h1>);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <div key={i} className="flex gap-2 ml-2">
          <span className="text-[var(--sibyl)] mt-1.5 shrink-0">&#x2022;</span>
          <span>{renderInline(line.slice(2))}</span>
        </div>
      );
    } else if (line.startsWith('```')) {
      // Collect code block
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <pre key={i} className="bg-muted/50 rounded-lg p-3 text-[12px] font-mono overflow-x-auto my-2 border border-border/30">
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
    } else if (line.match(/^\d+\.\s/)) {
      elements.push(
        <div key={i} className="flex gap-2 ml-2">
          <span className="text-[var(--sibyl)] font-mono text-[11px] mt-0.5 shrink-0 w-4">{line.match(/^\d+/)![0]}.</span>
          <span>{renderInline(line.replace(/^\d+\.\s/, ''))}</span>
        </div>
      );
    } else if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />);
    } else {
      elements.push(<p key={i}>{renderInline(line)}</p>);
    }
  }

  return elements;
}

function renderInline(text: string): React.ReactNode {
  // Handle **bold**, `code`, and *italic*
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Bold
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    // Code
    const codeMatch = remaining.match(/`(.+?)`/);

    if (boldMatch && (!codeMatch || boldMatch.index! <= codeMatch.index!)) {
      if (boldMatch.index! > 0) {
        parts.push(remaining.slice(0, boldMatch.index!));
      }
      parts.push(<strong key={key++} className="font-semibold">{boldMatch[1]}</strong>);
      remaining = remaining.slice(boldMatch.index! + boldMatch[0].length);
    } else if (codeMatch) {
      if (codeMatch.index! > 0) {
        parts.push(remaining.slice(0, codeMatch.index!));
      }
      parts.push(
        <code key={key++} className="px-1.5 py-0.5 rounded bg-[var(--sibyl)]/[0.08] text-[var(--sibyl)] text-[12px] font-mono">
          {codeMatch[1]}
        </code>
      );
      remaining = remaining.slice(codeMatch.index! + codeMatch[0].length);
    } else {
      parts.push(remaining);
      break;
    }
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}
