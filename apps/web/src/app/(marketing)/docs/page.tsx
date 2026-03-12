'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Book,
  Code2,
  Terminal,
  Zap,
  Server,
  ArrowLeft,
  Copy,
  Check,
  ChevronRight,
  Search,
  Shield,
  GitBranch,
  AlertTriangle,
  Activity,
  Settings,
} from 'lucide-react';
import { Logo } from '@/components/shared/logo';
import { cn } from '@/lib/utils';

/* ══════════════════════════════════════════════════════
   COPY BUTTON
   ══════════════════════════════════════════════════════ */

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="absolute top-3 right-3 p-1.5 rounded-md transition-colors"
      style={{
        background: 'var(--surface-2)',
        color: copied ? 'var(--accent)' : 'var(--text-tertiary)',
      }}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}

/* ══════════════════════════════════════════════════════
   CODE BLOCK
   ══════════════════════════════════════════════════════ */

function CodeBlock({ code, lang = 'bash' }: { code: string; lang?: string }) {
  return (
    <div className="relative rounded-xl overflow-hidden my-4" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)' }}>
      <div className="flex items-center gap-2 px-4 py-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#ef4444' }} />
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#fbbf24' }} />
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#22c55e' }} />
        </div>
        <span className="font-mono text-xs ml-2" style={{ color: 'var(--text-tertiary)' }}>{lang}</span>
      </div>
      <CopyButton text={code} />
      <pre className="p-4 overflow-x-auto text-sm font-mono leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   SIDEBAR SECTIONS
   ══════════════════════════════════════════════════════ */

const sections = [
  { id: 'getting-started', title: 'Getting Started', icon: Zap },
  { id: 'installation', title: 'Installation', icon: Terminal },
  { id: 'configuration', title: 'Configuration', icon: Settings },
  { id: 'sdk-node', title: 'Node.js SDK', icon: Code2 },
  { id: 'sdk-python', title: 'Python SDK', icon: Code2 },
  { id: 'api-reference', title: 'API Reference', icon: Server },
  { id: 'integrations', title: 'Integrations', icon: GitBranch },
  { id: 'self-hosting', title: 'Self-Hosting', icon: Shield },
];

/* ══════════════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════════════ */

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState('getting-started');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px' }
    );

    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen" style={{ background: 'var(--void)', color: 'var(--text-primary)' }}>
      {/* Topbar */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{ background: 'rgba(3,3,5,0.85)', backdropFilter: 'blur(16px)', borderColor: 'var(--border-subtle)' }}
      >
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity">
              <ArrowLeft size={16} />
              <Logo size="sm" />
            </Link>
            <span className="text-xs font-mono px-2 py-0.5 rounded-md" style={{ background: 'var(--surface-2)', color: 'var(--text-tertiary)' }}>
              v0.1.0
            </span>
          </div>
          <button
            className="lg:hidden p-2 rounded-md"
            style={{ color: 'var(--text-secondary)' }}
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
          >
            <Book size={18} />
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex">
        {/* Sidebar */}
        <aside
          className={cn(
            'w-64 shrink-0 border-r sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto py-6 px-4',
            'hidden lg:block',
          )}
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <nav className="space-y-1">
            {sections.map(({ id, title, icon: Icon }) => (
              <a
                key={id}
                href={`#${id}`}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all',
                  activeSection === id ? 'font-medium' : 'opacity-60 hover:opacity-100',
                )}
                style={{
                  background: activeSection === id ? 'var(--surface-2)' : 'transparent',
                  color: activeSection === id ? 'var(--sibyl)' : 'var(--text-secondary)',
                }}
              >
                <Icon size={15} />
                {title}
              </a>
            ))}
          </nav>
        </aside>

        {/* Mobile nav */}
        {mobileNavOpen && (
          <div className="lg:hidden fixed inset-0 z-40 pt-14" style={{ background: 'rgba(3,3,5,0.95)' }}>
            <nav className="p-6 space-y-1">
              {sections.map(({ id, title, icon: Icon }) => (
                <a
                  key={id}
                  href={`#${id}`}
                  onClick={() => setMobileNavOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-3 rounded-lg text-sm"
                  style={{ color: activeSection === id ? 'var(--sibyl)' : 'var(--text-secondary)' }}
                >
                  <Icon size={15} />
                  {title}
                </a>
              ))}
            </nav>
          </div>
        )}

        {/* Content */}
        <main className="flex-1 min-w-0 py-10 px-6 lg:px-12">
          <div className="max-w-3xl">

            {/* Getting Started */}
            <section id="getting-started" className="mb-16 scroll-mt-20">
              <h1 className="heading-serif text-4xl mb-4">Getting Started</h1>
              <p className="text-lg leading-relaxed mb-6" style={{ color: 'var(--text-secondary)' }}>
                Sibyl is an AI-native observability platform that investigates incidents automatically.
                Get started in under 5 minutes.
              </p>
              <div className="cell p-6">
                <h3 className="label-mono text-xs mb-4" style={{ color: 'var(--text-tertiary)' }}>QUICK START</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold shrink-0 mt-0.5" style={{ background: 'var(--sibyl)', color: 'white' }}>1</span>
                    <div>
                      <p className="font-medium mb-1">Create an account</p>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Sign up and create your first project to get a DSN.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold shrink-0 mt-0.5" style={{ background: 'var(--sibyl)', color: 'white' }}>2</span>
                    <div>
                      <p className="font-medium mb-1">Install the SDK</p>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Add the Sibyl SDK to your project.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold shrink-0 mt-0.5" style={{ background: 'var(--sibyl)', color: 'white' }}>3</span>
                    <div>
                      <p className="font-medium mb-1">Start investigating</p>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Errors and traces flow in automatically. Ask Sibyl to investigate any incident.</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Installation */}
            <section id="installation" className="mb-16 scroll-mt-20">
              <h2 className="heading-serif text-3xl mb-4">Installation</h2>
              <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
                Install the Sibyl SDK for your platform.
              </p>

              <h3 className="text-lg font-semibold mb-2">Node.js</h3>
              <CodeBlock code="npm install @sibyl/node" />

              <h3 className="text-lg font-semibold mb-2 mt-6">Python</h3>
              <CodeBlock code="pip install sibyl-sdk" />
            </section>

            {/* Configuration */}
            <section id="configuration" className="mb-16 scroll-mt-20">
              <h2 className="heading-serif text-3xl mb-4">Configuration</h2>
              <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
                Initialize Sibyl with your project DSN. You can find this in your project settings.
              </p>

              <h3 className="text-lg font-semibold mb-2">DSN Format</h3>
              <CodeBlock code="https://<public-key>@ingest.sibyl.dev/<project-id>" lang="text" />

              <h3 className="text-lg font-semibold mb-2 mt-6">Environment Variables</h3>
              <div className="cell p-0 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: 'var(--surface-2)' }}>
                      <th className="text-left px-4 py-2.5 font-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>Variable</th>
                      <th className="text-left px-4 py-2.5 font-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>Required</th>
                      <th className="text-left px-4 py-2.5 font-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>Description</th>
                    </tr>
                  </thead>
                  <tbody style={{ color: 'var(--text-secondary)' }}>
                    {[
                      ['SIBYL_DSN', 'Yes', 'Your project DSN from the dashboard'],
                      ['SIBYL_ENVIRONMENT', 'No', 'Environment name (production, staging, dev)'],
                      ['SIBYL_SAMPLE_RATE', 'No', 'Event sample rate from 0.0 to 1.0 (default: 1.0)'],
                      ['SIBYL_DEBUG', 'No', 'Enable debug logging (default: false)'],
                    ].map(([name, req, desc]) => (
                      <tr key={name} className="border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                        <td className="px-4 py-2.5 font-mono text-xs" style={{ color: 'var(--sibyl)' }}>{name}</td>
                        <td className="px-4 py-2.5">{req}</td>
                        <td className="px-4 py-2.5">{desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Node.js SDK */}
            <section id="sdk-node" className="mb-16 scroll-mt-20">
              <h2 className="heading-serif text-3xl mb-4">Node.js SDK</h2>
              <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
                The Node.js SDK auto-captures unhandled exceptions, promise rejections, and HTTP breadcrumbs.
              </p>

              <h3 className="text-lg font-semibold mb-2">Basic Setup</h3>
              <CodeBlock
                lang="typescript"
                code={`import { Sibyl } from '@sibyl/node';

Sibyl.init({
  dsn: process.env.SIBYL_DSN,
  environment: 'production',
});`}
              />

              <h3 className="text-lg font-semibold mb-2 mt-6">Manual Capture</h3>
              <CodeBlock
                lang="typescript"
                code={`// Capture an error
try {
  await riskyOperation();
} catch (err) {
  Sibyl.captureException(err, {
    service: 'payment-service',
    userId: user.id,
  });
}

// Capture a message
Sibyl.captureMessage('Deployment started', 'info', {
  version: '1.2.3',
});`}
              />

              <h3 className="text-lg font-semibold mb-2 mt-6">Graceful Shutdown</h3>
              <CodeBlock
                lang="typescript"
                code={`process.on('SIGTERM', async () => {
  await Sibyl.flush();
  await Sibyl.close();
  process.exit(0);
});`}
              />
            </section>

            {/* Python SDK */}
            <section id="sdk-python" className="mb-16 scroll-mt-20">
              <h2 className="heading-serif text-3xl mb-4">Python SDK</h2>
              <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
                The Python SDK supports FastAPI, Django, and the standard logging module.
              </p>

              <h3 className="text-lg font-semibold mb-2">Basic Setup</h3>
              <CodeBlock
                lang="python"
                code={`import sibyl

sibyl.init(
    dsn="https://key@ingest.sibyl.dev/proj_123",
    environment="production",
)`}
              />

              <h3 className="text-lg font-semibold mb-2 mt-6">FastAPI Integration</h3>
              <CodeBlock
                lang="python"
                code={`from fastapi import FastAPI
from sibyl.integrations.fastapi import SibylMiddleware

app = FastAPI()
app.add_middleware(SibylMiddleware)`}
              />

              <h3 className="text-lg font-semibold mb-2 mt-6">Django Integration</h3>
              <CodeBlock
                lang="python"
                code={`# settings.py
MIDDLEWARE = [
    'sibyl.integrations.django.SibylMiddleware',
    # ... other middleware
]`}
              />
            </section>

            {/* API Reference */}
            <section id="api-reference" className="mb-16 scroll-mt-20">
              <h2 className="heading-serif text-3xl mb-4">API Reference</h2>
              <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
                All API endpoints require authentication via Bearer token or API key.
              </p>

              {[
                {
                  method: 'POST',
                  path: '/v1/ingest',
                  desc: 'Batch ingest events and spans',
                  body: '{ "events": [...], "spans": [...] }',
                },
                {
                  method: 'POST',
                  path: '/v1/investigate',
                  desc: 'Start an AI investigation (SSE stream)',
                  body: '{ "query": "Why are we seeing 500s?", "projectId": "..." }',
                },
                {
                  method: 'GET',
                  path: '/api/explore/logs',
                  desc: 'Search and filter log events',
                  body: '?level=error&service=api&from=2024-01-01',
                },
                {
                  method: 'GET',
                  path: '/api/explore/traces',
                  desc: 'List distributed traces',
                  body: '?service=api&minDuration=1000',
                },
                {
                  method: 'GET',
                  path: '/api/incidents',
                  desc: 'List grouped incidents',
                  body: '?status=open&level=error',
                },
                {
                  method: 'POST',
                  path: '/api/search',
                  desc: 'Hybrid semantic + keyword search',
                  body: '{ "query": "database connection timeout" }',
                },
              ].map((endpoint) => (
                <div key={endpoint.path} className="cell p-4 mb-3">
                  <div className="flex items-center gap-3 mb-2">
                    <span
                      className="font-mono text-xs font-bold px-2 py-0.5 rounded"
                      style={{
                        background: endpoint.method === 'POST' ? 'rgba(139,92,246,0.15)' : 'rgba(6,214,160,0.15)',
                        color: endpoint.method === 'POST' ? 'var(--sibyl)' : 'var(--accent)',
                      }}
                    >
                      {endpoint.method}
                    </span>
                    <code className="font-mono text-sm" style={{ color: 'var(--text-primary)' }}>{endpoint.path}</code>
                  </div>
                  <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>{endpoint.desc}</p>
                  <code className="font-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>{endpoint.body}</code>
                </div>
              ))}
            </section>

            {/* Integrations */}
            <section id="integrations" className="mb-16 scroll-mt-20">
              <h2 className="heading-serif text-3xl mb-4">Integrations</h2>
              <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
                Framework-specific middleware for automatic error and performance capture.
              </p>

              <h3 className="text-lg font-semibold mb-2">Express.js</h3>
              <CodeBlock
                lang="typescript"
                code={`import express from 'express';
import { Sibyl } from '@sibyl/node';
import { sibylExpressMiddleware } from '@sibyl/node/integrations/express';

Sibyl.init({ dsn: process.env.SIBYL_DSN });

const app = express();
app.use(sibylExpressMiddleware());

// Your routes...

app.listen(3000);`}
              />

              <h3 className="text-lg font-semibold mb-2 mt-6">Next.js</h3>
              <CodeBlock
                lang="typescript"
                code={`// next.config.js
const { withSibyl } = require('@sibyl/node/integrations/nextjs');

module.exports = withSibyl({
  // your Next.js config
});`}
              />

              <h3 className="text-lg font-semibold mb-2 mt-6">OpenTelemetry</h3>
              <CodeBlock
                lang="typescript"
                code={`import { SibylSpanExporter } from '@sibyl/node';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';

const provider = new NodeTracerProvider();
provider.addSpanProcessor(
  new SimpleSpanProcessor(new SibylSpanExporter())
);
provider.register();`}
              />
            </section>

            {/* Self-Hosting */}
            <section id="self-hosting" className="mb-16 scroll-mt-20">
              <h2 className="heading-serif text-3xl mb-4">Self-Hosting</h2>
              <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
                Run Sibyl on your own infrastructure with Docker Compose.
              </p>

              <h3 className="text-lg font-semibold mb-2">Prerequisites</h3>
              <ul className="list-disc list-inside mb-6 space-y-1" style={{ color: 'var(--text-secondary)' }}>
                <li>Docker &amp; Docker Compose</li>
                <li>Node.js 20+</li>
                <li>pnpm 9+</li>
                <li>Google AI Studio API key (free tier)</li>
              </ul>

              <h3 className="text-lg font-semibold mb-2">1. Start Infrastructure</h3>
              <CodeBlock
                lang="bash"
                code={`git clone https://github.com/your-org/sibyl.git
cd sibyl
cp .env.example .env.local

# Start PostgreSQL, Redis, ClickHouse, Qdrant
docker compose -f infra/docker-compose.yml up -d`}
              />

              <h3 className="text-lg font-semibold mb-2 mt-6">2. Install &amp; Run</h3>
              <CodeBlock
                lang="bash"
                code={`pnpm install
pnpm db:push          # Apply database schema
pnpm dev              # Start web + ingest service`}
              />

              <h3 className="text-lg font-semibold mb-2 mt-6">3. Environment Variables</h3>
              <CodeBlock
                lang="bash"
                code={`# .env.local
DATABASE_URL=postgresql://sibyl:sibyl@localhost:5432/sibyl
CLICKHOUSE_URL=http://localhost:8123
REDIS_URL=redis://localhost:6379
QDRANT_URL=http://localhost:6333
GEMINI_API_KEY=your-api-key
JWT_SECRET=your-secret-key
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_INGEST_URL=http://localhost:3001`}
              />
            </section>

            {/* Footer */}
            <div className="divider-glow mb-8" />
            <div className="flex items-center justify-between text-sm" style={{ color: 'var(--text-tertiary)' }}>
              <span className="font-mono text-xs">Sibyl Documentation v0.1.0</span>
              <Link href="/" className="hover:opacity-80 transition-opacity flex items-center gap-1.5">
                Back to home <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
