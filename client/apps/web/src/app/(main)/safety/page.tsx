import type { Metadata } from 'next';
import { RequireAuth } from '@/features/auth';
import { MeetPointsView } from '@/features/safety';

export const metadata: Metadata = {
  title: 'Safe meet points · LetsCycle',
};

export default function SafetyPage() {
  return (
    <RequireAuth>
      <MeetPointsView />
    </RequireAuth>
  );
}
