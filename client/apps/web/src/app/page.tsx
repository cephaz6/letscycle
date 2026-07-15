import { Recycle } from 'lucide-react';

export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex items-center gap-2" style={{ color: 'var(--color-brand)' }}>
        <Recycle className="h-9 w-9" />
        <span className="text-3xl font-bold tracking-tight">LetsCycle</span>
      </div>
      <p className="max-w-sm text-balance text-slate-600">
        Local decluttering marketplace. The frontend scaffold is live — design system
        and features come next.
      </p>
    </main>
  );
}
