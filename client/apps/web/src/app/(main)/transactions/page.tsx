import type { Metadata } from 'next';
import { RequireAuth } from '@/features/auth';
import { OrdersList } from '@/features/transactions';

export const metadata: Metadata = {
  title: 'Your orders · LetsCycle',
};

export default function TransactionsPage() {
  return (
    <RequireAuth>
      <OrdersList />
    </RequireAuth>
  );
}
