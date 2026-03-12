'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserPlus, Mail, Lock, User, Building2, Loader2, AlertCircle } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '', name: '', orgName: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Signup failed');
        return;
      }

      router.push('/dashboard');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="glass-card rounded-3xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Start investigating production issues with AI
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-[var(--error)]/[0.06] border border-[var(--error)]/10 flex items-center gap-2">
            <AlertCircle size={14} className="text-[var(--error)] shrink-0" />
            <p className="text-sm text-[var(--error)]">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[13px] font-medium mb-1.5 block">Your name</label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={form.name}
                onChange={update('name')}
                placeholder="Jane Doe"
                className="input-modern pl-10"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-[13px] font-medium mb-1.5 block">Organization</label>
            <div className="relative">
              <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={form.orgName}
                onChange={update('orgName')}
                placeholder="Acme Inc"
                className="input-modern pl-10"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-[13px] font-medium mb-1.5 block">Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                value={form.email}
                onChange={update('email')}
                placeholder="you@company.com"
                className="input-modern pl-10"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-[13px] font-medium mb-1.5 block">Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="password"
                value={form.password}
                onChange={update('password')}
                placeholder="At least 8 characters"
                className="input-modern pl-10"
                required
                minLength={8}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-50"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin relative z-10" />
            ) : (
              <>
                <UserPlus size={16} className="relative z-10" />
                <span className="relative z-10">Create Account</span>
              </>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-[var(--sibyl)] font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
