import type { Metadata } from 'next';
import { RequireAuth } from '@/features/auth';
import { NotificationsList } from '@/features/notifications';

export const metadata: Metadata = {
  title: 'Notifications · LetsCycle',
};

export default function NotificationsPage() {
  return (
    <RequireAuth>
      <NotificationsList />
    </RequireAuth>
  );
}
