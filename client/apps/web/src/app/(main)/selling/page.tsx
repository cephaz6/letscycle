import type { Metadata } from 'next';
import { RequireAuth } from '@/features/auth';
import { SellingView } from '@/features/transactions';

export const metadata: Metadata = {
  title: 'Selling · LetsCycle',
};

export default function SellingPage() {
  return (
    <RequireAuth>
      <SellingView />
    </RequireAuth>
  );
}
