import { Logo } from '@/components/shared/logo';
import Link from 'next/link';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col gradient-mesh">
      <div className="noise-overlay" />

      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6">
        <Link href="/">
          <Logo size="md" />
        </Link>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-4 pb-20">
        {children}
      </main>
    </div>
  );
}
