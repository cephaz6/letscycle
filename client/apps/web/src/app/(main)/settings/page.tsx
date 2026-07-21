import type { Metadata } from 'next';
import { RequireAuth } from '@/features/auth';
import { SettingsView } from '@/features/settings';

export const metadata: Metadata = {
  title: 'Settings · LetsCycle',
};

export default function SettingsPage() {
  return (
    <RequireAuth>
      <SettingsView />
    </RequireAuth>
  );
}
