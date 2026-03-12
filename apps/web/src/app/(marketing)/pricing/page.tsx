'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Check,
  X,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { Logo } from '@/components/shared/logo';
import { cn } from '@/lib/utils';

/* ══════════════════════════════════════════════════════
   DATA
   ══════════════════════════════════════════════════════ */

const tiers = [
  {
    name: 'Free',
    price: '$0',
    period: '/mo',
    description: 'For side projects and early exploration.',
    cta: 'Get Started Free',
    ctaHref: '/signup',
    highlighted: false,
    features: [
      '10K events/day',
      '7-day retention',
      '1 project',
      '5 investigations/day',
      'Community support',
      'Core log explorer',
      'Basic alerts',
    ],
  },
  {
    name: 'Pro',
    price: '$49',
    period: '/mo',
    description: 'For growing teams shipping fast.',
    cta: 'Start Pro Trial',
    ctaHref: '/signup?plan=pro',
    highlighted: true,
    features: [
      '1M events/day',
      '30-day retention',
      '10 projects',
      'Unlimited investigations',
      'Email support',
      'Custom alert rules',
      'Team access (up to 5)',
      'Trace waterfall viewer',
      'Service dependency map',
      'Deploy correlation',
    ],
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For organizations with compliance and scale needs.',
    cta: 'Contact Sales',
    ctaHref: 'mailto:sales@sibyl.dev',
    highlighted: false,
    features: [
      'Unlimited events',
      '90-day retention',
      'Unlimited projects',
      'SSO / SAML',
      'Dedicated support + SLA',
      'Custom integrations',
      'On-premise deployment',
      'Audit logs',
      'Role-based access control',
      'Priority incident response',
    ],
  },
];

const comparisonFeatures = [
  { name: 'Events per day', free: '10K', pro: '1M', enterprise: 'Unlimited' },
  { name: 'Data retention', free: '7 days', pro: '30 days', enterprise: '90 days' },
  { name: 'Projects', free: '1', pro: '10', enterprise: 'Unlimited' },
  { name: 'AI investigations', free: '5/day', pro: 'Unlimited', enterprise: 'Unlimited' },
  { name: 'Team members', free: '1', pro: '5', enterprise: 'Unlimited' },
  { name: 'Log explorer', free: true, pro: true, enterprise: true },
  { name: 'Trace waterfall', free: false, pro: true, enterprise: true },
  { name: 'Service map', free: false, pro: true, enterprise: true },
  { name: 'Custom alerts', free: false, pro: true, enterprise: true },
  { name: 'Deploy markers', free: false, pro: true, enterprise: true },
  { name: 'SSO / SAML', free: false, pro: false, enterprise: true },
  { name: 'On-premise', free: false, pro: false, enterprise: true },
  { name: 'SLA', free: false, pro: false, enterprise: true },
  { name: 'Audit logs', free: false, pro: false, enterprise: true },
];

const faqs = [
  {
    q: 'What counts as an event?',
    a: 'An event is any log entry, error capture, or message sent via the SDK. Spans (traces) are counted separately and have a 10x multiplier on the event limit.',
  },
  {
    q: 'Can I upgrade or downgrade anytime?',
    a: 'Yes. Plan changes take effect immediately. When upgrading, you pay the prorated difference. When downgrading, credit is applied to your next billing cycle.',
  },
  {
    q: 'What happens if I exceed my event limit?',
    a: 'Events beyond your daily limit are sampled at a reduced rate. You will never lose critical error events — only lower-severity logs are sampled.',
  },
  {
    q: 'Is there a free trial for Pro?',
    a: 'Yes. Pro comes with a 14-day free trial with full access. No credit card required to start.',
  },
  {
    q: 'How does AI investigation work?',
    a: 'Sibyl uses Google Gemini to reason over your logs, traces, and deploy history. It correlates signals across services to identify root causes and presents evidence with clickable references.',
  },
  {
    q: 'Can I self-host Sibyl?',
    a: 'Yes. Sibyl is open-source and can be deployed on your own infrastructure using Docker Compose. See our self-hosting docs for details.',
  },
  {
    q: 'What data do you store?',
    a: 'We store the telemetry you send: log events, trace spans, and metadata. We do not store source code, credentials, or PII unless you explicitly include it in your events.',
  },
  {
    q: 'Do you support OpenTelemetry?',
    a: 'Yes. Our Node.js SDK includes an OpenTelemetry SpanExporter. You can pipe existing OTel instrumentation directly into Sibyl.',
  },
];

/* ══════════════════════════════════════════════════════
   FAQ ITEM
   ══════════════════════════════════════════════════════ */

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      onClick={() => setOpen(!open)}
      className="w-full text-left cell p-4 transition-all"
    >
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{q}</span>
        {open ? <ChevronUp size={16} style={{ color: 'var(--text-tertiary)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-tertiary)' }} />}
      </div>
      {open && (
        <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {a}
        </p>
      )}
    </button>
  );
}

/* ══════════════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════════════ */

export default function PricingPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--void)', color: 'var(--text-primary)' }}>
      {/* Topbar */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{ background: 'rgba(3,3,5,0.85)', backdropFilter: 'blur(16px)', borderColor: 'var(--border-subtle)' }}
      >
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center">
          <Link href="/" className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity">
            <ArrowLeft size={16} />
            <Logo size="sm" />
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6">
        {/* Hero */}
        <div className="text-center pt-20 pb-16">
          <h1 className="heading-serif text-5xl md:text-6xl mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-lg max-w-xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
            Start free. Scale as you grow. No surprises.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-24">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={cn('cell p-6 flex flex-col relative', tier.highlighted && 'ring-1')}
              style={tier.highlighted ? {
                borderColor: 'rgba(139,92,246,0.4)',
                boxShadow: '0 0 40px rgba(139,92,246,0.12), inset 0 0 0 1px rgba(139,92,246,0.3)',
              } : undefined}
            >
              {tier.highlighted && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-mono font-bold flex items-center gap-1"
                  style={{ background: 'var(--sibyl)', color: 'white' }}
                >
                  <Sparkles size={12} />
                  RECOMMENDED
                </div>
              )}

              <div className="mb-6">
                <h3 className="label-mono text-xs mb-3" style={{ color: 'var(--text-tertiary)' }}>
                  {tier.name.toUpperCase()}
                </h3>
                <div className="flex items-baseline gap-1">
                  <span className="heading-serif text-4xl">{tier.price}</span>
                  {tier.period && (
                    <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{tier.period}</span>
                  )}
                </div>
                <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
                  {tier.description}
                </p>
              </div>

              <ul className="space-y-2.5 mb-8 flex-1">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2.5 text-sm">
                    <Check
                      size={15}
                      className="shrink-0"
                      style={{ color: tier.highlighted ? 'var(--sibyl)' : 'var(--accent)' }}
                    />
                    <span style={{ color: 'var(--text-secondary)' }}>{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={tier.ctaHref}
                className={cn(
                  'block text-center py-2.5 px-4 rounded-lg text-sm font-medium transition-all',
                  tier.highlighted
                    ? 'text-white hover:opacity-90'
                    : 'hover:opacity-80',
                )}
                style={tier.highlighted
                  ? { background: 'var(--sibyl)' }
                  : { background: 'var(--surface-3)', color: 'var(--text-primary)' }
                }
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* Feature Comparison */}
        <div className="mb-24">
          <h2 className="heading-serif text-3xl text-center mb-8">Feature Comparison</h2>
          <div className="cell p-0 overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--surface-2)' }}>
                  <th className="text-left px-5 py-3 font-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>Feature</th>
                  <th className="text-center px-5 py-3 font-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>FREE</th>
                  <th className="text-center px-5 py-3 font-mono text-xs" style={{ color: 'var(--sibyl)' }}>PRO</th>
                  <th className="text-center px-5 py-3 font-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>ENTERPRISE</th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((row, i) => (
                  <tr
                    key={row.name}
                    className="border-t"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    <td className="px-5 py-3" style={{ color: 'var(--text-secondary)' }}>{row.name}</td>
                    {(['free', 'pro', 'enterprise'] as const).map((plan) => (
                      <td key={plan} className="text-center px-5 py-3">
                        {typeof row[plan] === 'boolean' ? (
                          row[plan]
                            ? <Check size={16} className="inline-block" style={{ color: 'var(--accent)' }} />
                            : <X size={16} className="inline-block" style={{ color: 'var(--text-tertiary)', opacity: 0.4 }} />
                        ) : (
                          <span className="font-mono text-xs" style={{ color: 'var(--text-primary)' }}>{row[plan]}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto mb-24">
          <h2 className="heading-serif text-3xl text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {faqs.map((faq) => (
              <FAQItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center pb-20">
          <div className="divider-glow mb-12" />
          <h2 className="heading-serif text-3xl mb-4">Ready to investigate?</h2>
          <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>
            Start catching production issues before your users do.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90"
            style={{ background: 'var(--sibyl)' }}
          >
            Get started free <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
