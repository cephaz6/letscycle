import type { Metadata } from 'next';
import { Compass } from 'lucide-react';
import { ErrorPage } from '@/components/error-page';

export const metadata: Metadata = {
  title: 'Page not found · LetsCycle',
};

export default function NotFound() {
  return (
    <ErrorPage
      code="404"
      icon={Compass}
      title="Page not found"
      message="The page you’re looking for doesn’t exist or may have moved. Let’s get you back on track."
      primary={{ href: '/', label: 'Back to home' }}
      secondary={{ href: '/', label: 'Browse listings' }}
    />
  );
}
