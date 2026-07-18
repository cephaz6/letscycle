import { RequireAuth } from '@/features/auth';
import { ProfileView } from '@/features/profile';

export default function MyProfilePage() {
  return (
    <RequireAuth>
      <ProfileView />
    </RequireAuth>
  );
}
