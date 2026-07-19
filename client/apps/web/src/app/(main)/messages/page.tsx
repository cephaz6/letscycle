import type { Metadata } from 'next';
import { RequireAuth } from '@/features/auth';
import { ConversationsList } from '@/features/messaging';

export const metadata: Metadata = {
  title: 'Messages · LetsCycle',
};

export default function MessagesPage() {
  return (
    <RequireAuth>
      <ConversationsList />
    </RequireAuth>
  );
}
