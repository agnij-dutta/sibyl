'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Sparkles, ArrowRight, Clock, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

const suggestedQueries = [
  'Why are we seeing 500 errors on the checkout service?',
  'What caused the latency spike in the last hour?',
  'Show me all errors related to database connections',
  'Investigate the payment processing failures',
  'What changed in the last deployment that could cause timeouts?',
];

export default function InvestigatePage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState('');

  useEffect(() => {
    fetch('/api/projects', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        setProjects(data.projects || []);
        if (data.projects?.length > 0) {
          setSelectedProject(data.projects[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const handleInvestigate = () => {
    if (!query.trim() || !selectedProject) return;
    // Navigate to investigation detail page with query params
    const params = new URLSearchParams({ q: query, project: selectedProject });
    router.push(`/dashboard/investigate/new?${params}`);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--sibyl)]/10 text-[var(--sibyl)] text-xs font-semibold mb-4">
          <Sparkles size={12} />
          AI-Powered Investigation
        </div>
        <h1 className="text-3xl font-bold tracking-tight">
          What happened in production?
        </h1>
        <p className="text-muted-foreground mt-2">
          Describe the issue in plain English. Sibyl will analyze your telemetry and find the root cause.
        </p>
      </div>

      {/* Search input */}
      <div className="glass-card rounded-2xl p-2">
        {projects.length > 1 && (
          <div className="px-4 pt-2 pb-1">
            <select
              value={selectedProject}
              onChange={e => setSelectedProject(e.target.value)}
              className="text-xs text-muted-foreground bg-transparent border-none outline-none cursor-pointer"
            >
              {projects.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}
        <div className="flex items-start gap-3 p-3">
          <Search size={20} className="text-muted-foreground mt-1 shrink-0" />
          <textarea
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Describe the incident you want to investigate..."
            className="flex-1 bg-transparent border-none outline-none resize-none text-sm min-h-[80px] placeholder:text-muted-foreground"
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleInvestigate();
              }
            }}
          />
        </div>
        <div className="flex items-center justify-between px-4 pb-3">
          <p className="text-[11px] text-muted-foreground">
            Press Enter to investigate
          </p>
          <button
            onClick={handleInvestigate}
            disabled={!query.trim() || !selectedProject}
            className={cn(
              'btn-primary inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <span className="relative z-10 flex items-center gap-2">
              <Zap size={14} />
              Investigate
            </span>
          </button>
        </div>
      </div>

      {/* Suggested queries */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
          Suggested investigations
        </p>
        <div className="space-y-2">
          {suggestedQueries.map((q) => (
            <button
              key={q}
              onClick={() => setQuery(q)}
              className={cn(
                'w-full text-left px-4 py-3 rounded-xl text-sm',
                'border border-border/50 hover:border-[var(--sibyl)]/30',
                'hover:bg-[var(--sibyl)]/[0.03] transition-all duration-200',
                'flex items-center gap-3 group'
              )}
            >
              <Clock size={14} className="text-muted-foreground shrink-0" />
              <span className="flex-1">{q}</span>
              <ArrowRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
