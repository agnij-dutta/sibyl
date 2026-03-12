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
        <div>
          <h1 className="text-lg font-semibold">Investigation</h1>
          <p className="text-[13px] text-muted-foreground capitalize">
            {investigation?.status || 'Starting...'}
          </p>
        </div>
      </div>

      {/* Main content: ChatPanel + EvidenceSidebar */}
      <div className="flex flex-1 gap-6 min-h-0">
        <ChatPanel
          messages={chatMessages}
          isStreaming={isStreaming}
          status={investigation?.status || null}
          rootCause={investigation?.rootCause}
          confidence={investigation?.confidence}
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
