'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/shared/sidebar';
import { Topbar } from '@/components/shared/topbar';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Org {
  id: string;
  name: string;
  slug: string;
  plan: string;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [org, setOrg] = useState<Org | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (!res.ok) {
          router.replace('/login');
          return;
        }
        const data = await res.json();
        setUser(data.user);
        setOrg(data.organization);
      } catch {
        router.replace('/login');
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/auth/me', { method: 'DELETE', credentials: 'include' });
    router.replace('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--sibyl)] to-[var(--sibyl-dark)] animate-pulse" />
          <p className="text-[13px] text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen flex">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[10%] -left-40 w-[40rem] h-[40rem] rounded-full bg-[var(--sibyl)]/[0.03] blur-[10rem]" />
        <div className="absolute bottom-[20%] right-[-10%] w-[35rem] h-[35rem] rounded-full bg-[var(--sibyl-light)]/[0.02] blur-[8rem]" />
      </div>

      <Sidebar user={user} org={org} onLogout={handleLogout} />

      <div className="flex-1 ml-[260px]">
        <Topbar />

        <main className="relative z-10 p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
