'use client';

import { useState, useEffect } from 'react';
import { Settings, Plus, Copy, Check, Key, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [newProjectName, setNewProjectName] = useState('');
  const [creating, setCreating] = useState(false);
  const [copiedDsn, setCopiedDsn] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/projects', { credentials: 'include' })
      .then(r => r.json())
      .then(data => setProjects(data.projects || []))
      .catch(() => {});
  }, []);

  const createProject = async () => {
    if (!newProjectName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: newProjectName }),
      });
      const data = await res.json();
      if (res.ok) {
        setProjects(prev => [...prev, data.project]);
        setNewProjectName('');
      }
    } catch {
      // Handle error
    } finally {
      setCreating(false);
    }
  };

  const copyDsn = (dsn: string) => {
    navigator.clipboard.writeText(dsn);
    setCopiedDsn(dsn);
    setTimeout(() => setCopiedDsn(null), 2000);
  };

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your projects and API keys
        </p>
      </div>

      {/* Create Project */}
      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-sm font-semibold mb-4">Create Project</h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={newProjectName}
            onChange={e => setNewProjectName(e.target.value)}
            placeholder="Project name (e.g., api-production)"
            className="input-modern flex-1"
            onKeyDown={e => e.key === 'Enter' && createProject()}
          />
          <button
            onClick={createProject}
            disabled={creating || !newProjectName.trim()}
            className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm disabled:opacity-50"
          >
            <Plus size={14} className="relative z-10" />
            <span className="relative z-10">{creating ? 'Creating...' : 'Create'}</span>
          </button>
        </div>
      </div>

      {/* Projects list */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold">Projects</h2>
        {projects.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center">
            <Settings size={24} className="mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No projects yet. Create one above.</p>
          </div>
        ) : (
          projects.map((project: any) => (
            <div key={project.id} className="glass-card rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--sibyl)]/10 flex items-center justify-center">
                    <Key size={14} className="text-[var(--sibyl)]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{project.name}</p>
                    <p className="text-[11px] text-muted-foreground">{project.platform}</p>
                  </div>
                </div>
              </div>

              {/* DSN */}
              <div className="bg-muted/50 rounded-xl p-3 flex items-center gap-2">
                <code className="flex-1 text-[12px] font-mono text-muted-foreground truncate">
                  {project.dsn}
                </code>
                <button
                  onClick={() => copyDsn(project.dsn)}
                  className="p-1.5 rounded-lg hover:bg-background transition-colors shrink-0"
                >
                  {copiedDsn === project.dsn ? (
                    <Check size={12} className="text-[var(--success)]" />
                  ) : (
                    <Copy size={12} className="text-muted-foreground" />
                  )}
                </button>
              </div>

              {/* SDK setup hint */}
              <div className="mt-3 p-3 rounded-xl bg-[var(--sibyl)]/[0.04] border border-[var(--sibyl)]/10">
                <p className="text-[11px] text-muted-foreground mb-2">Quick setup:</p>
                <pre className="text-[12px] font-mono text-foreground/80">
{`import { Sibyl } from '@sibyl/node';
Sibyl.init({ dsn: '${project.dsn?.slice(0, 30)}...' });`}
                </pre>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
