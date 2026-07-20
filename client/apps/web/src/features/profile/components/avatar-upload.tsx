'use client';

import { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import {
  systemApi,
  uploadToPresignedUrl,
  usersApi,
  type UploadContentType,
} from '@letscycle/api-client';
import { cn } from '@letscycle/ui';
import { Avatar } from '@/components/avatar';
import { useAuthStore } from '@/features/auth';

const ACCEPTED: UploadContentType[] = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;

/** Avatar with a click-to-upload control (used on the owner's profile). */
export function AvatarUpload({ className }: { className?: string }) {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  async function onFile(file: File | undefined) {
    if (!file || !user) return;
    setError(null);
    if (!ACCEPTED.includes(file.type as UploadContentType)) {
      setError('Use a JPEG, PNG or WebP image.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('Image must be under 5 MB.');
      return;
    }
    setBusy(true);
    try {
      const upload = await systemApi.createUpload({
        purpose: 'avatar',
        contentType: file.type as UploadContentType,
        sizeBytes: file.size,
      });
      await uploadToPresignedUrl(upload.uploadUrl, file);
      const updated = await usersApi.updateMe({ avatarUrl: upload.key });
      setUser(updated);
    } catch {
      setError('Upload failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative">
      <div className={cn('relative', className)}>
        <Avatar
          name={user.displayName}
          avatarUrl={user.avatarUrl}
          className="size-full text-2xl ring-4 ring-card"
        />
        {busy && (
          <span className="absolute inset-0 grid place-items-center rounded-full bg-black/40 text-white">
            <Loader2 className="size-6 animate-spin" />
          </span>
        )}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          aria-label="Change profile photo"
          className="absolute bottom-0 right-0 grid size-8 place-items-center rounded-full bg-primary text-primary-foreground shadow ring-2 ring-card transition hover:bg-primary/90"
        >
          <Camera className="size-4" />
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(',')}
        hidden
        onChange={(e) => {
          void onFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      {error && (
        <p className="absolute left-0 top-full mt-1 whitespace-nowrap text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
