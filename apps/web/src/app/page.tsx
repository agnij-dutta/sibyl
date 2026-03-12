'use client';

import Link from 'next/link';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search,
  Zap,
  GitBranch,
  AlertTriangle,
  Terminal,
  ArrowRight,
  CheckCircle,
  Sparkles,
  Network,
  Eye,
  Code2,
  Activity,
  Clock,
  Shield,
  ChevronRight,
} from 'lucide-react';
import { Logo } from '@/components/shared/logo';
import { cn } from '@/lib/utils';

/* ══════════════════════════════════════════════════════
   DATA
   ══════════════════════════════════════════════════════ */

const features = [
  {
    icon: Search,
    title: 'AI Investigation',
    desc: 'Ask "Why are we seeing 500s?" and get root cause analysis with clickable evidence.',
    accent: '#8b5cf6',
  },
  {
    icon: GitBranch,
    title: 'Cross-Signal Correlation',
    desc: 'Automatically correlates logs, traces, deploys, and metrics to find hidden connections.',
    accent: '#06d6a0',
  },
  {
    icon: Zap,
    title: 'Instant Setup',
    desc: '2 lines of code. Auto-captures errors, traces, and breadcrumbs. Zero config.',
    accent: '#fbbf24',
  },
  {
    icon: AlertTriangle,
    title: 'Smart Incidents',
    desc: 'Auto-groups errors by fingerprint. Detects anomalies. Alerts before users notice.',
    accent: '#f87171',
  },
  {
    icon: Eye,
    title: 'Full Observability',
    desc: 'Logs, distributed traces, service maps, and metrics — one unified platform.',
    accent: '#60a5fa',
  },
  {
    icon: Network,
    title: 'Service Discovery',
    desc: 'Auto-discovers service topology from trace data. No manual configuration needed.',
    accent: '#a78bfa',
  },
];

const terminalLines = [
  { text: '$ sibyl investigate "Why are API responses slow?"', type: 'command' as const },
  { text: '', type: 'blank' as const },
  { text: '  Analyzing 12,847 spans across 8 services...', type: 'loading' as const },
  { text: '  Found 3 correlated anomalies', type: 'loading' as const },
  { text: '', type: 'blank' as const },
  { text: '\u2713 Root Cause: Database connection pool exhaustion', type: 'success' as const },
  { text: '  Confidence: 94%', type: 'detail' as const },
  { text: '  Service: user-service \u2192 postgres', type: 'detail' as const },
  { text: '  First seen: 2m ago after deploy v2.4.1', type: 'detail' as const },
];

const stats = [
  { value: '10M+', label: 'Events processed daily', icon: Activity },
  { value: '99.9%', label: 'Platform uptime', icon: Shield },
  { value: '<100ms', label: 'Ingest latency', icon: Clock },
  { value: '3s', label: 'Median investigation', icon: Zap },
];

/* ══════════════════════════════════════════════════════
   HOOKS
   ══════════════════════════════════════════════════════ */

function useTypewriter(lines: typeof terminalLines) {
  const [displayed, setDisplayed] = useState<{ text: string; type: string }[]>([]);
  const [lineIdx, setLineIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const done = lineIdx >= lines.length;

  useEffect(() => {
    if (lineIdx >= lines.length) return;
    const line = lines[lineIdx];

    if (line.type === 'blank') {
      const t = setTimeout(() => {
        setDisplayed(p => [...p, { text: '', type: 'blank' }]);
        setLineIdx(i => i + 1);
        setCharIdx(0);
      }, 200);
      return () => clearTimeout(t);
    }

    if (charIdx < line.text.length) {
      const speed = line.type === 'command' ? 28 : 14;
      const delay = charIdx === 0 ? 0 : speed;
      const t = setTimeout(() => {
        setDisplayed(p => {
          if (charIdx === 0) {
            return [...p, { text: line.text.slice(0, 1), type: line.type }];
          }
          const u = [...p];
          u[u.length - 1] = { text: line.text.slice(0, charIdx + 1), type: line.type };
          return u;
        });
        setCharIdx(c => c + 1);
      }, delay);
      return () => clearTimeout(t);
    }

    const delay = line.type === 'command' ? 700 : line.type === 'loading' ? 500 : 120;
    const t = setTimeout(() => { setLineIdx(i => i + 1); setCharIdx(0); }, delay);
    return () => clearTimeout(t);
  }, [lineIdx, charIdx, lines]);

  return { displayed, done };
}

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.querySelectorAll('.animate-on-scroll').forEach(el => el.classList.add('is-visible'));
            if (e.target.classList.contains('animate-on-scroll')) e.target.classList.add('is-visible');
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, []);
  return ref;
}

function useNavScroll() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);
  return scrolled;
}

/* ══════════════════════════════════════════════════════
   COMPONENTS
   ══════════════════════════════════════════════════════ */

function TerminalDemo() {
  const { displayed, done } = useTypewriter(terminalLines);
  return (
    <div className="relative rounded-2xl overflow-hidden" style={{ background: 'var(--surface-0)' }}>
      {/* Glow border effect */}
      <div className="absolute inset-0 rounded-2xl" style={{
        background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(6,214,160,0.08))',
        padding: '1px',
        mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        WebkitMaskComposite: 'xor',
        maskComposite: 'exclude',
        borderRadius: 'inherit',
      }} />

      {/* Title bar */}
      <div className="flex items-center gap-2 px-5 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#ff5f57' }} />
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#febc2e' }} />
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#28c840' }} />
        </div>
        <span className="ml-2 text-[10px] font-mono" style={{ color: 'var(--text-tertiary)' }}>sibyl-cli</span>
      </div>

      {/* Body */}
      <div className="p-5 font-mono text-[13px] leading-relaxed min-h-[220px]">
        {displayed.map((line, i) => {
          if (line.type === 'blank') return <div key={i} className="h-4" />;
          const colors: Record<string, string> = {
            command: 'var(--text-primary)',
            loading: 'var(--sibyl-light)',
            success: '#06d6a0',
            detail: 'var(--text-secondary)',
          };
          return (
            <div key={i} style={{ color: colors[line.type] || 'var(--text-primary)' }}
              className={line.type === 'success' ? 'font-semibold' : ''}>
              {line.text}
              {i === displayed.length - 1 && !done && (
                <span className="cursor-blink ml-0.5" style={{ color: 'var(--sibyl)' }}>|</span>
              )}
            </div>
          );
        })}
        {displayed.length === 0 && <span className="cursor-blink" style={{ color: 'var(--sibyl)' }}>|</span>}
      </div>
    </div>
  );
}

function SdkTabs() {
  const [tab, setTab] = useState<'node' | 'python'>('node');
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface-0)', border: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="flex" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        {(['node', 'python'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn(
              'flex items-center gap-2 px-5 py-3 text-[12px] font-mono font-medium transition-all border-b-2 -mb-px',
              tab === t
                ? 'border-[var(--sibyl)] text-[var(--sibyl-light)]'
                : 'border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
            )}>
            <Terminal size={13} />
            {t === 'node' ? 'Node.js' : 'Python'}
          </button>
        ))}
      </div>
      <div className="px-5 py-2.5" style={{ background: 'rgba(255,255,255,0.015)', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
        <code className="text-[11px] font-mono" style={{ color: 'var(--text-tertiary)' }}>
          <span style={{ color: 'var(--sibyl-light)' }}>$</span>{' '}
          {tab === 'node' ? 'npm install @sibyl/node' : 'pip install sibyl-sdk'}
        </code>
      </div>
      <pre className="p-5 text-[13px] font-mono leading-relaxed overflow-x-auto">
        <code>
          {tab === 'node' ? (
            <>
              <span style={{ color: '#c586c0' }}>import</span>
              <span style={{ color: 'var(--text-primary)' }}> {'{ '}</span>
              <span style={{ color: '#06d6a0' }}>Sibyl</span>
              <span style={{ color: 'var(--text-primary)' }}>{' }'} </span>
              <span style={{ color: '#c586c0' }}>from</span>
              <span style={{ color: '#fbbf24' }}> &apos;@sibyl/node&apos;</span>
              <span style={{ color: 'var(--text-primary)' }}>;</span>
              {'\n\n'}
              <span style={{ color: '#06d6a0' }}>Sibyl</span>
              <span style={{ color: 'var(--text-primary)' }}>.</span>
              <span style={{ color: '#a78bfa' }}>init</span>
              <span style={{ color: 'var(--text-primary)' }}>{'({'}</span>
              {'\n'}
              <span style={{ color: 'var(--text-primary)' }}>{'  '}</span>
              <span style={{ color: '#60a5fa' }}>dsn</span>
              <span style={{ color: 'var(--text-primary)' }}>: </span>
              <span style={{ color: '#fbbf24' }}>&apos;https://key@sibyl.dev/1&apos;</span>
              {'\n'}
              <span style={{ color: 'var(--text-primary)' }}>{'}'});</span>
            </>
          ) : (
            <>
              <span style={{ color: '#c586c0' }}>import</span>
              <span style={{ color: '#06d6a0' }}> sibyl</span>
              {'\n\n'}
              <span style={{ color: '#06d6a0' }}>sibyl</span>
              <span style={{ color: 'var(--text-primary)' }}>.</span>
              <span style={{ color: '#a78bfa' }}>init</span>
              <span style={{ color: 'var(--text-primary)' }}>(</span>
              {'\n'}
              <span style={{ color: 'var(--text-primary)' }}>{'  '}</span>
              <span style={{ color: '#60a5fa' }}>dsn</span>
              <span style={{ color: 'var(--text-primary)' }}>=</span>
              <span style={{ color: '#fbbf24' }}>&quot;https://key@sibyl.dev/1&quot;</span>
              {'\n'}
              <span style={{ color: 'var(--text-primary)' }}>)</span>
            </>
          )}
        </code>
      </pre>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   PAGE
   ══════════════════════════════════════════════════════ */

export default function LandingPage() {
  const scrolled = useNavScroll();
  const featRef = useScrollReveal();
  const statsRef = useScrollReveal();
  const sdkRef = useScrollReveal();
  const pricingRef = useScrollReveal();
  const ctaRef = useScrollReveal();

  return (
    <div className="min-h-screen relative" style={{ background: 'var(--void)' }}>
      {/* Ambient atmospheric glow */}
      <div className="ambient-glow" />
      <div className="fixed inset-0 dot-grid opacity-[0.35] pointer-events-none z-0" />

      {/* ── Floating Navbar ───────────────────────── */}
      <nav className={cn('navbar-float', scrolled && 'scrolled')}>
        <div className="flex items-center justify-between">
          <Logo size="md" />
          <div className="hidden md:flex items-center gap-1">
            {['Features', 'SDK', 'Pricing'].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`}
                className="px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={e => { (e.target as HTMLElement).style.color = 'var(--text-primary)'; (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
                onMouseLeave={e => { (e.target as HTMLElement).style.color = 'var(--text-secondary)'; (e.target as HTMLElement).style.background = 'transparent'; }}
              >
                {item}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className="px-4 py-2 rounded-lg text-[13px] font-medium transition-colors"
              style={{ color: 'var(--text-secondary)' }}>
              Sign In
            </Link>
            <Link href="/signup"
              className="px-4 py-2 rounded-xl text-[13px] font-semibold text-white transition-all"
              style={{
                background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                boxShadow: '0 2px 12px rgba(139,92,246,0.35), inset 0 1px 0 rgba(255,255,255,0.15)',
              }}>
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────── */}
      <section className="relative pt-40 pb-24 px-4 overflow-hidden">
        {/* Atmospheric orbs */}
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full orb-drift-1 pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full orb-drift-2 pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(6,214,160,0.05) 0%, transparent 70%)', filter: 'blur(80px)' }} />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full mb-10 glass-subtle"
            style={{ animation: 'fade-up 0.6s ease-out both' }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#06d6a0', boxShadow: '0 0 8px rgba(6,214,160,0.6)' }} />
            <span className="text-[12px] font-mono font-medium" style={{ color: 'var(--text-secondary)' }}>
              AI-Native Incident Investigation
            </span>
            <ChevronRight size={12} style={{ color: 'var(--text-tertiary)' }} />
          </div>

          {/* Headline — Instrument Serif */}
          <h1 className="heading-serif text-6xl md:text-8xl lg:text-[108px] mb-6"
            style={{ animation: 'fade-up 0.7s ease-out 0.1s both' }}>
            <span className="text-gradient-subtle">Production broke.</span>
            <br />
            <span className="text-gradient" style={{ fontStyle: 'italic' }}>Sibyl knows why.</span>
          </h1>

          <p className="text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-12"
            style={{ color: 'var(--text-secondary)', animation: 'fade-up 0.7s ease-out 0.2s both' }}>
            Stop searching logs manually. Ask Sibyl what happened in plain English
            and get AI-powered root cause analysis in seconds.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4"
            style={{ animation: 'fade-up 0.7s ease-out 0.3s both' }}>
            <Link href="/signup" className="btn-primary px-8 py-3.5 rounded-xl text-[15px] group">
              <span className="relative z-10 flex items-center gap-2">
                Start Investigating
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
            <a href="#sdk" className="btn-glass px-8 py-3.5 rounded-xl text-[15px]">
              <Code2 size={16} />
              View SDK
            </a>
          </div>

          {/* Terminal */}
          <div className="mt-20 max-w-2xl mx-auto"
            style={{ animation: 'fade-up 0.8s ease-out 0.5s both' }}>
            <TerminalDemo />
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────── */}
      <section id="features" className="py-28 px-4 relative">
        <div ref={featRef} className="max-w-6xl mx-auto">
          <div className="text-center mb-20 animate-on-scroll">
            <div className="section-label mb-4">Features</div>
            <h2 className="heading-serif text-4xl md:text-5xl lg:text-6xl">
              Investigation-first<br />
              <span className="text-gradient" style={{ fontStyle: 'italic' }}>observability</span>
            </h2>
            <p className="mt-4 max-w-xl mx-auto text-base" style={{ color: 'var(--text-secondary)' }}>
              Not another dashboard tool. Sibyl reasons about your production systems
              and tells you what went wrong — and why.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feat, i) => (
              <div key={feat.title} data-delay={String(i + 1)}
                className="animate-on-scroll cell p-6 group cursor-default">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-5 transition-all duration-300 group-hover:scale-110"
                  style={{ background: `${feat.accent}12`, color: feat.accent }}>
                  <feat.icon size={19} />
                </div>
                <h3 className="font-semibold text-[15px] mb-2" style={{ color: 'var(--text-primary)' }}>
                  {feat.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {feat.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────── */}
      <section className="py-20 px-4 relative">
        <div className="divider-glow mb-20" />
        <div ref={statsRef} className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            {stats.map((stat, i) => (
              <div key={stat.label} data-delay={String(i + 1)} className="animate-on-scroll text-center">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl mb-4"
                  style={{ background: 'rgba(139,92,246,0.08)' }}>
                  <stat.icon size={18} style={{ color: 'var(--sibyl-light)' }} />
                </div>
                <div className="heading-serif text-4xl md:text-5xl text-gradient-violet">
                  {stat.value}
                </div>
                <div className="text-[13px] mt-2" style={{ color: 'var(--text-tertiary)' }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-16 animate-on-scroll" data-delay="3">
            <p className="text-center text-[10px] font-mono font-semibold uppercase tracking-[0.2em] mb-6"
              style={{ color: 'var(--text-tertiary)' }}>
              Trusted by engineers at
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
              {['Vercel', 'Stripe', 'Linear', 'Notion', 'Figma', 'Planetscale'].map(c => (
                <span key={c} className="text-base font-semibold tracking-tight select-none"
                  style={{ color: 'rgba(255,255,255,0.12)' }}>
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="divider-glow mt-20" />
      </section>

      {/* ── SDK ───────────────────────────────────── */}
      <section id="sdk" className="py-28 px-4 relative">
        <div ref={sdkRef} className="max-w-3xl mx-auto">
          <div className="text-center mb-14 animate-on-scroll">
            <div className="section-label mb-4">Integration</div>
            <h2 className="heading-serif text-4xl md:text-5xl">
              2 lines. <span className="text-gradient" style={{ fontStyle: 'italic' }}>That&apos;s it.</span>
            </h2>
            <p className="mt-4 text-base" style={{ color: 'var(--text-secondary)' }}>
              Install the SDK and start capturing errors, traces, and breadcrumbs automatically.
            </p>
          </div>

          <div className="animate-on-scroll" data-delay="2">
            <SdkTabs />
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-6 text-[13px] animate-on-scroll" data-delay="3">
            {['Auto-captures errors', 'Distributed tracing', 'Zero-config breadcrumbs'].map(t => (
              <span key={t} className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                <CheckCircle size={13} style={{ color: '#06d6a0' }} />
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────── */}
      <section id="pricing" className="py-28 px-4 relative">
        <div ref={pricingRef} className="max-w-4xl mx-auto">
          <div className="text-center mb-14 animate-on-scroll">
            <div className="section-label mb-4">Pricing</div>
            <h2 className="heading-serif text-4xl md:text-5xl">
              Start free, <span className="text-gradient" style={{ fontStyle: 'italic' }}>scale as you grow</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-2xl mx-auto">
            {/* Free */}
            <div className="animate-on-scroll cell p-8" data-delay="1">
              <h3 className="font-semibold text-[15px] mb-1" style={{ color: 'var(--text-primary)' }}>Free</h3>
              <p className="heading-serif text-4xl mb-6" style={{ color: 'var(--text-primary)' }}>
                $0<span className="text-sm font-sans font-normal ml-1" style={{ color: 'var(--text-tertiary)' }}>/mo</span>
              </p>
              <ul className="space-y-3 mb-8">
                {['10GB events/month', '7-day retention', '50 AI investigations/month', '2 projects', 'Community support'].map(item => (
                  <li key={item} className="flex items-center gap-2.5 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                    <CheckCircle size={14} style={{ color: 'var(--sibyl-light)' }} className="shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className="btn-secondary w-full flex items-center justify-center py-3 rounded-xl text-[13px] font-semibold">
                Get Started
              </Link>
            </div>

            {/* Pro */}
            <div className="animate-on-scroll relative cell p-8" data-delay="2"
              style={{ borderColor: 'rgba(139,92,246,0.2)', boxShadow: '0 0 60px rgba(139,92,246,0.06)' }}>
              <div className="absolute -top-3 right-6 px-3 py-1 rounded-full text-[10px] font-mono font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
                Popular
              </div>
              <h3 className="font-semibold text-[15px] mb-1" style={{ color: 'var(--text-primary)' }}>Pro</h3>
              <p className="heading-serif text-4xl mb-6" style={{ color: 'var(--text-primary)' }}>
                $29<span className="text-sm font-sans font-normal ml-1" style={{ color: 'var(--text-tertiary)' }}>/mo</span>
              </p>
              <ul className="space-y-3 mb-8">
                {['100GB events/month', '30-day retention', 'Unlimited investigations', 'Unlimited projects', 'Priority support', 'Custom alerts', 'Team collaboration'].map(item => (
                  <li key={item} className="flex items-center gap-2.5 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                    <CheckCircle size={14} style={{ color: '#06d6a0' }} className="shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className="btn-primary w-full flex items-center justify-center py-3 rounded-xl text-[13px] font-semibold">
                <span className="relative z-10">Start Free Trial</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────── */}
      <section className="relative py-32 px-4 overflow-hidden">
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(139,92,246,0.08) 0%, transparent 70%)',
        }} />

        <div ref={ctaRef} className="relative z-10 max-w-3xl mx-auto text-center">
          <div className="animate-on-scroll">
            <h2 className="heading-serif text-5xl md:text-6xl lg:text-7xl leading-tight">
              Ready to stop<br />
              <span className="text-gradient" style={{ fontStyle: 'italic' }}>guessing?</span>
            </h2>
            <p className="text-lg mt-6 mb-10 max-w-xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
              Set up Sibyl in under 2 minutes and let AI investigate your next incident.
              No credit card required.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/signup" className="btn-primary px-10 py-4 rounded-xl text-base group">
                <span className="relative z-10 flex items-center gap-2">
                  Get Started Free
                  <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
              <a href="#features" className="flex items-center gap-1.5 text-sm font-medium transition-colors"
                style={{ color: 'var(--text-tertiary)' }}>
                Learn more <ChevronRight size={14} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────── */}
      <footer className="footer-premium py-12 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <Logo size="sm" />
          <p className="text-[12px] font-mono" style={{ color: 'var(--text-tertiary)' }}>
            &copy; 2026 Sibyl. AI-native incident investigation.
          </p>
          <div className="flex items-center gap-6">
            <Link href="/docs" className="text-[13px] transition-colors"
              style={{ color: 'var(--text-tertiary)' }}>Docs</Link>
            <Link href="/pricing" className="text-[13px] transition-colors"
              style={{ color: 'var(--text-tertiary)' }}>Pricing</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
