import type { Metadata } from 'next';
import { RequireAuth } from '@/features/auth';
import { SellForm } from '@/features/listings/components/sell-form';

export const metadata: Metadata = {
  title: 'Sell an item · LetsCycle',
};

export default function SellPage() {
  return (
    <RequireAuth>
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight">List an item</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Give it a second life — sell it or give it away to someone nearby.
        </p>
        <div className="mt-6">
          <SellForm />
        </div>
      </div>
    </RequireAuth>
  );
}
