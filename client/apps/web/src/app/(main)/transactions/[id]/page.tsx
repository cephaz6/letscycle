'use client';

import { useParams } from 'next/navigation';
import { RequireAuth } from '@/features/auth';
import { OrderView } from '@/features/transactions';

export default function OrderPage() {
  const params = useParams<{ id: string }>();
  return (
    <RequireAuth>
      <OrderView id={params.id} />
    </RequireAuth>
  );
}
