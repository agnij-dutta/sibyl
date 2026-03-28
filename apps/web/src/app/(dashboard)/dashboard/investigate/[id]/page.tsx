'use client';

import { use } from 'react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Sparkles, AlertCircle, CheckCircle } from 'lucide-react';
import { useInvestigation } from '@/hooks/use-investigation';
import { ChatPanel } from '@/components/investigation/ChatPanel';
import { EvidenceSidebar } from '@/components/investigation/EvidenceSidebar';
import { cn } from '@/lib/utils';

export default function InvestigationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const projectId = searchParams.get('project') || '';
  const { investigation, isStreaming, error, startInvestigation } = useInvestigation(projectId);
  const startedRef = useRef(false);

  useEffect(() => {
    if (query && !startedRef.current) {
      startedRef.current = true;
      startInvestigation(query);
    }
  }, [query, startInvestigation]);

  const handleSendFollowUp = (followUpQuery: string) => {
    startInvestigation(followUpQuery);
  };

  // Map messages to include timestamp as Date objects (already Date in hook)
  const chatMessages = (investigation?.messages || []).map(msg => ({
    role: msg.role,
    content: msg.content,
    timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp),
  }));

  return (
    <div className="flex flex-col h-full">
      {/* Status header */}
      <div className="flex items-center gap-3 mb-6">
        <div className={cn(
          'p-2 rounded-xl',
          investigation?.status === 'completed' ? 'bg-[var(--success)]/10' :
          investigation?.status === 'failed' ? 'bg-[var(--error)]/10' :
          'bg-[var(--sibyl)]/10'
        )}>
          {investigation?.status === 'completed' ? (
            <CheckCircle size={18} className="text-[var(--success)]" />
          ) : investigation?.status === 'failed' ? (
            <AlertCircle size={18} className="text-[var(--error)]" />
          ) : (
            <Sparkles size={18} className="text-[var(--sibyl)] animate-pulse" />
          )}
        </div>
        <div className="flex-1">
          <h1 className="text-lg font-semibold">Investigation</h1>
          <p className="text-[13px] text-muted-foreground capitalize">
            {investigation?.status || 'Starting...'}
          </p>
        </div>
        {typeof investigation?.confidence === 'number' && investigation.status === 'completed' && (
          <div className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl ring-1 text-xs font-mono font-semibold',
            investigation.confidence >= 75 ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20' :
            investigation.confidence >= 40 ? 'bg-amber-500/10 text-amber-400 ring-amber-500/20' :
            'bg-red-500/10 text-red-400 ring-red-500/20'
          )}>
            <div className="relative w-10 h-1.5 bg-current/20 rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-current rounded-full"
                style={{ width: `${investigation.confidence}%` }}
              />
            </div>
            {investigation.confidence}% confidence
          </div>
        )}
      </div>

      {/* Main content: ChatPanel + EvidenceSidebar */}
      <div className="flex flex-1 gap-6 min-h-0">
        <ChatPanel
          messages={chatMessages}
          isStreaming={isStreaming}
          status={investigation?.status || null}
          rootCause={investigation?.rootCause}
          confidence={investigation?.confidence}
          suggestedFixes={investigation?.suggestedFixes}
          investigationId={investigation?.id}
          error={error}
          onSendFollowUp={handleSendFollowUp}
        />
        <EvidenceSidebar
          evidence={investigation?.evidence || []}
          correlations={investigation?.correlations || []}
        />
      </div>
    </div>
  );
}
