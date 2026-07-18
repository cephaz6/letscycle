import type { Metadata } from 'next';
import { ShieldX } from 'lucide-react';
import { ErrorPage } from '@/components/error-page';

export const metadata: Metadata = {
  title: 'Access denied · LetsCycle',
};

export default function ForbiddenPage() {
  return (
    <ErrorPage
      code="403"
      icon={ShieldX}
      title="Access denied"
      message="You don’t have permission to view this page. If you think this is a mistake, try signing in with the right account."
      primary={{ href: '/', label: 'Back to home' }}
      secondary={{ href: '/login', label: 'Log in' }}
    />
  );
}
