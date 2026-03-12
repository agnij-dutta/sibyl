import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export function Logo({ size = 'md', showText = true, className }: LogoProps) {
  const sizes = {
    sm: { icon: 'w-6 h-6', svg: 12, text: 'text-sm', glow: 'blur-sm' },
    md: { icon: 'w-8 h-8', svg: 15, text: 'text-base', glow: 'blur-md' },
    lg: { icon: 'w-10 h-10', svg: 18, text: 'text-xl', glow: 'blur-lg' },
  };

  const s = sizes[size];

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div className={cn('relative shrink-0', s.icon)}>
        {/* Glow */}
        <div
          className={cn('absolute inset-0 rounded-xl', s.glow)}
          style={{ background: 'rgba(139, 92, 246, 0.3)' }}
        />
        {/* Icon */}
        <div className="relative w-full h-full rounded-xl flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)',
          }}
        >
          <svg
            width={s.svg}
            height={s.svg}
            viewBox="0 0 24 24"
            fill="none"
            className="text-white"
          >
            {/* Eye / Oracle symbol */}
            <path
              d="M12 5C5.636 5 2 12 2 12s3.636 7 10 7 10-7 10-7-3.636-7-10-7Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="12" cy="12" r="3" fill="currentColor" />
          </svg>
        </div>
      </div>
      {showText && (
        <span
          className={cn('font-semibold tracking-[-0.03em]', s.text)}
          style={{ color: 'var(--text-primary)' }}
        >
          Sibyl
        </span>
      )}
    </div>
  );
}
