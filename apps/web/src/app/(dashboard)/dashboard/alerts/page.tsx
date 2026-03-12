'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Bell,
  Plus,
  ToggleLeft,
  ToggleRight,
  Trash2,
  X,
  AlertTriangle,
  Activity,
  Clock,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface AlertCondition {
  metric?: string;
  operator?: string;
  threshold?: number;
  window_minutes?: number;
  service?: string;
}

interface AlertChannel {
  type: string;
  url: string;
}

interface AlertRule {
  id: string;
  projectId: string;
  name: string;
  type: string;
  condition: AlertCondition;
  channels: AlertChannel[];
  enabled: boolean;
  createdAt?: string;
}

interface Project {
  id: string;
  name: string;
  platform?: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const METRICS = [
  { value: 'error_count', label: 'Error Count' },
  { value: 'error_rate', label: 'Error Rate' },
  { value: 'latency_p99', label: 'Latency (P99)' },
] as const;

const OPERATORS = [
  { value: 'gt', label: '> (greater than)' },
  { value: 'gte', label: '>= (greater or equal)' },
  { value: 'lt', label: '< (less than)' },
  { value: 'lte', label: '<= (less or equal)' },
  { value: 'eq', label: '= (equal)' },
] as const;

const WINDOWS = [
  { value: 5, label: '5 minutes' },
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '60 minutes' },
] as const;

const OPERATOR_SYMBOLS: Record<string, string> = {
  gt: '>',
  gte: '>=',
  lt: '<',
  lte: '<=',
  eq: '=',
};

const METRIC_LABELS: Record<string, string> = {
  error_count: 'Error Count',
  error_rate: 'Error Rate',
  latency_p99: 'Latency P99',
};

/* ------------------------------------------------------------------ */
/*  Select Component (glass styled)                                   */
/* ------------------------------------------------------------------ */

function GlassSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string | number;
  onChange: (v: string) => void;
  options: readonly { value: string | number; label: string }[];
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'input-premium appearance-none pr-10 cursor-pointer rounded-xl',
          'bg-transparent'
        )}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Delete Confirm Dialog                                             */
/* ------------------------------------------------------------------ */

function DeleteConfirmDialog({
  alertName,
  onConfirm,
  onCancel,
}: {
  alertName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
      />
      {/* Dialog */}
      <div
        className="glass-card relative z-10 rounded-2xl p-6 w-full max-w-sm"
        style={{ animation: 'scale-in 0.2s ease-out' }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-[var(--error)]/10">
            <AlertTriangle size={18} className="text-[var(--error)]" />
          </div>
          <h3 className="font-semibold">Delete Alert Rule</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Are you sure you want to delete{' '}
          <span className="font-medium text-foreground">{alertName}</span>? This
          action cannot be undone.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="btn-secondary px-4 py-2 rounded-xl text-sm"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white bg-[var(--error)] hover:bg-[var(--error)]/90 transition-colors"
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Create Alert Dialog                                               */
/* ------------------------------------------------------------------ */

function CreateAlertDialog({
  projects,
  onClose,
  onCreated,
}: {
  projects: Project[];
  onClose: () => void;
  onCreated: (alert: AlertRule) => void;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'threshold' | 'anomaly'>('threshold');
  const [metric, setMetric] = useState('error_count');
  const [operator, setOperator] = useState('gt');
  const [threshold, setThreshold] = useState<number | string>(100);
  const [windowMinutes, setWindowMinutes] = useState(15);
  const [service, setService] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [projectId, setProjectId] = useState(projects[0]?.id || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!projectId) {
      setError('Please select a project');
      return;
    }

    setSubmitting(true);

    const condition: AlertCondition = {
      metric,
      operator,
      threshold: Number(threshold),
      window_minutes: windowMinutes,
    };
    if (service.trim()) {
      condition.service = service.trim();
    }

    const channels: AlertChannel[] = [];
    if (webhookUrl.trim()) {
      channels.push({ type: 'webhook', url: webhookUrl.trim() });
    }

    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          projectId,
          name: name.trim(),
          type,
          condition,
          channels,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create alert rule');
        return;
      }

      onCreated(data.alert);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        className="glass-card relative z-10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        style={{ animation: 'scale-in 0.2s ease-out' }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 pb-4 border-b border-border/50 bg-inherit rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[var(--sibyl)]/10">
              <Bell size={18} className="text-[var(--sibyl)]" />
            </div>
            <div>
              <h2 className="font-semibold">New Alert Rule</h2>
              <p className="text-[11px] text-muted-foreground">
                Get notified when conditions are met
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Project */}
          {projects.length > 1 && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Project
              </label>
              <GlassSelect
                value={projectId}
                onChange={setProjectId}
                options={projects.map((p) => ({
                  value: p.id,
                  label: p.name,
                }))}
                placeholder="Select project"
              />
            </div>
          )}

          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. High Error Rate Alert"
              className="input-premium rounded-xl bg-transparent"
              autoFocus
            />
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Type
            </label>
            <GlassSelect
              value={type}
              onChange={(v) => setType(v as 'threshold' | 'anomaly')}
              options={[
                { value: 'threshold', label: 'Threshold' },
                { value: 'anomaly', label: 'Anomaly Detection' },
              ]}
            />
          </div>

          {/* Condition section */}
          <div className="space-y-4 p-4 rounded-xl border border-border/50 bg-muted/30">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Condition
            </p>

            {/* Metric & Operator row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] text-muted-foreground">
                  Metric
                </label>
                <GlassSelect
                  value={metric}
                  onChange={setMetric}
                  options={[...METRICS]}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] text-muted-foreground">
                  Operator
                </label>
                <GlassSelect
                  value={operator}
                  onChange={setOperator}
                  options={[...OPERATORS]}
                />
              </div>
            </div>

            {/* Threshold & Window row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] text-muted-foreground">
                  Threshold
                </label>
                <input
                  type="number"
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  placeholder="100"
                  className="input-premium rounded-xl bg-transparent"
                  min={0}
                  step="any"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] text-muted-foreground">
                  Window
                </label>
                <GlassSelect
                  value={windowMinutes}
                  onChange={(v) => setWindowMinutes(Number(v))}
                  options={[...WINDOWS]}
                />
              </div>
            </div>

            {/* Service filter */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-muted-foreground">
                Service filter{' '}
                <span className="text-muted-foreground/60">(optional)</span>
              </label>
              <input
                type="text"
                value={service}
                onChange={(e) => setService(e.target.value)}
                placeholder="e.g. api-gateway"
                className="input-premium rounded-xl bg-transparent"
              />
            </div>
          </div>

          {/* Notification channel */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Notification Channel
            </label>
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://hooks.slack.com/services/..."
              className="input-premium rounded-xl bg-transparent"
            />
            <p className="text-[11px] text-muted-foreground">
              Webhook URL for notifications (Slack, Discord, etc.)
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-[var(--error)] bg-[var(--error)]/5 border border-[var(--error)]/20 rounded-xl px-4 py-3">
              <AlertTriangle size={14} />
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary px-5 py-2.5 rounded-xl text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim() || !projectId}
              className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 size={14} className="relative z-10 animate-spin" />
              ) : (
                <Plus size={14} className="relative z-10" />
              )}
              <span className="relative z-10">
                {submitting ? 'Creating...' : 'Create Rule'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Alert Card                                                        */
/* ------------------------------------------------------------------ */

function AlertCard({
  alert,
  onToggle,
  onDelete,
  toggling,
}: {
  alert: AlertRule;
  onToggle: (id: string, enabled: boolean) => void;
  onDelete: (alert: AlertRule) => void;
  toggling: boolean;
}) {
  const condition = alert.condition || {};
  const metric = METRIC_LABELS[condition.metric || ''] || condition.metric || 'Unknown';
  const operatorSymbol = OPERATOR_SYMBOLS[condition.operator || ''] || condition.operator || '?';
  const thresholdValue = condition.threshold ?? '--';
  const windowMinutes = condition.window_minutes;

  return (
    <div
      className={cn(
        'glass-card rounded-xl p-4 transition-all duration-200',
        !alert.enabled && 'opacity-60'
      )}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className={cn(
            'p-2.5 rounded-xl shrink-0 transition-colors',
            alert.enabled
              ? 'bg-[var(--success)]/10'
              : 'bg-muted'
          )}
        >
          <Bell
            size={16}
            className={
              alert.enabled
                ? 'text-[var(--success)]'
                : 'text-muted-foreground'
            }
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-semibold truncate">{alert.name}</p>
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider shrink-0',
                alert.type === 'threshold'
                  ? 'bg-[var(--info)]/10 text-[var(--info)] border border-[var(--info)]/20'
                  : 'bg-[var(--warning)]/10 text-[var(--warning)] border border-[var(--warning)]/20'
              )}
            >
              {alert.type}
            </span>
          </div>

          {/* Condition details */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
            <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <Activity size={12} className="text-[var(--sibyl)]" />
              <span className="font-medium text-foreground/80">{metric}</span>
              <span className="font-mono text-[var(--sibyl)]">
                {operatorSymbol}
              </span>
              <span className="font-mono font-medium text-foreground/80">
                {thresholdValue}
              </span>
            </div>

            {windowMinutes && (
              <div className="flex items-center gap-1 text-[12px] text-muted-foreground">
                <Clock size={11} />
                <span>{windowMinutes}m window</span>
              </div>
            )}

            {condition.service && (
              <div className="text-[12px] text-muted-foreground">
                <span className="bg-muted rounded px-1.5 py-0.5 font-mono text-[11px]">
                  {condition.service}
                </span>
              </div>
            )}
          </div>

          {/* Channels */}
          {alert.channels && alert.channels.length > 0 && (
            <div className="mt-2 text-[11px] text-muted-foreground truncate">
              Webhook: {alert.channels[0]?.url || 'configured'}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onToggle(alert.id, !alert.enabled)}
            disabled={toggling}
            className={cn(
              'p-2 rounded-lg transition-colors',
              toggling
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-muted'
            )}
            title={alert.enabled ? 'Disable alert' : 'Enable alert'}
          >
            {alert.enabled ? (
              <ToggleRight
                size={22}
                className="text-[var(--success)]"
              />
            ) : (
              <ToggleLeft size={22} className="text-muted-foreground" />
            )}
          </button>
          <button
            onClick={() => onDelete(alert)}
            className="p-2 rounded-lg hover:bg-[var(--error)]/10 transition-colors text-muted-foreground hover:text-[var(--error)]"
            title="Delete alert"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                         */
/* ------------------------------------------------------------------ */

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertRule[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AlertRule | null>(null);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  /* ---- Fetch alerts & projects ---- */
  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch('/api/alerts', { credentials: 'include' });
      const data = await res.json();
      setAlerts(data.alerts || []);
    } catch {
      // Silently handle network errors
    }
  }, []);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects', { credentials: 'include' });
      const data = await res.json();
      setProjects(data.projects || []);
    } catch {
      // Silently handle network errors
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchAlerts(), fetchProjects()]).finally(() =>
      setLoading(false)
    );
  }, [fetchAlerts, fetchProjects]);

  /* ---- Toggle enabled/disabled ---- */
  const handleToggle = async (id: string, enabled: boolean) => {
    setTogglingIds((prev) => new Set(prev).add(id));

    // Optimistic update
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, enabled } : a))
    );

    try {
      const res = await fetch('/api/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id, enabled }),
      });

      if (!res.ok) {
        // Revert on failure
        setAlerts((prev) =>
          prev.map((a) => (a.id === id ? { ...a, enabled: !enabled } : a))
        );
      }
    } catch {
      // Revert on network error
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, enabled: !enabled } : a))
      );
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  /* ---- Delete alert ---- */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;

    // Optimistic removal
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    setDeleteTarget(null);

    try {
      const res = await fetch(`/api/alerts?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!res.ok) {
        // Re-fetch on failure to restore state
        await fetchAlerts();
      }
    } catch {
      await fetchAlerts();
    }
  };

  /* ---- Handle alert created ---- */
  const handleAlertCreated = (alert: AlertRule) => {
    setAlerts((prev) => [alert, ...prev]);
    setShowCreateDialog(false);
  };

  /* ---- Render ---- */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Alerts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure alert rules for your projects
          </p>
        </div>
        <button
          onClick={() => setShowCreateDialog(true)}
          className="btn-primary inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm"
        >
          <Plus size={14} className="relative z-10" />
          <span className="relative z-10">New Alert Rule</span>
        </button>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <Loader2
            size={24}
            className="mx-auto text-muted-foreground mb-3 animate-spin"
          />
          <p className="text-sm text-muted-foreground">Loading alerts...</p>
        </div>
      ) : alerts.length === 0 ? (
        /* Empty state */
        <div className="glass-card rounded-2xl p-12 text-center">
          <Bell size={32} className="mx-auto text-muted-foreground mb-3" />
          <h3 className="font-semibold mb-1">No alert rules configured</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create alert rules to get notified when things go wrong.
          </p>
          <button
            onClick={() => setShowCreateDialog(true)}
            className="btn-primary inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm"
          >
            <Plus size={14} className="relative z-10" />
            <span className="relative z-10">Create First Rule</span>
          </button>
        </div>
      ) : (
        /* Alert list */
        <div className="space-y-3">
          {alerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onToggle={handleToggle}
              onDelete={setDeleteTarget}
              toggling={togglingIds.has(alert.id)}
            />
          ))}
        </div>
      )}

      {/* Create Alert Dialog */}
      {showCreateDialog && (
        <CreateAlertDialog
          projects={projects}
          onClose={() => setShowCreateDialog(false)}
          onCreated={handleAlertCreated}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <DeleteConfirmDialog
          alertName={deleteTarget.name}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
