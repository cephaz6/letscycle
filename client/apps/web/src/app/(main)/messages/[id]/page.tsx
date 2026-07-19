'use client';

import { useParams } from 'next/navigation';
import { RequireAuth } from '@/features/auth';
import { ConversationThread } from '@/features/messaging';

export default function ConversationPage() {
  const params = useParams<{ id: string }>();
  return (
    <RequireAuth>
      <ConversationThread conversationId={params.id} />
    </RequireAuth>
  );
}
