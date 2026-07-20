'use client';

import { useParams } from 'next/navigation';
import { PublicProfileView } from '@/features/profile';

export default function PublicProfilePage() {
  const params = useParams<{ id: string }>();
  return <PublicProfileView userId={params.id} />;
}
