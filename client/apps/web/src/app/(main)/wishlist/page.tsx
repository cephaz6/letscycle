import type { Metadata } from 'next';
import { RequireAuth } from '@/features/auth';
import { WishlistView } from '@/features/listings/components/wishlist-view';

export const metadata: Metadata = {
  title: 'Saved items · LetsCycle',
};

export default function WishlistPage() {
  return (
    <RequireAuth>
      <WishlistView />
    </RequireAuth>
  );
}
