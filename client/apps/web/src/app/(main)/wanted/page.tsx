import type { Metadata } from 'next';
import { RequireAuth } from '@/features/auth';
import { WishlistView } from '@/features/wishlists';

export const metadata: Metadata = {
  title: 'Wanted · LetsCycle',
};

export default function WantedPage() {
  return (
    <RequireAuth>
      <WishlistView />
    </RequireAuth>
  );
}
