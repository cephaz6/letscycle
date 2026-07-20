'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { usersApi, type MyProfile } from '@letscycle/api-client';
import { Button, Input } from '@letscycle/ui';
import { Field } from '@/features/auth/form-parts';
import { useAuthStore } from '@/features/auth';

export function EditProfileDialog({
  user,
  open,
  onClose,
}: {
  user: MyProfile;
  open: boolean;
  onClose: () => void;
}) {
  const setUser = useAuthStore((s) => s.setUser);
  const [displayName, setDisplayName] = useState(user.displayName);
  const [phone, setPhone] = useState(user.phone ?? '');
  const [bio, setBio] = useState(user.bio ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDisplayName(user.displayName);
    setPhone(user.phone ?? '');
    setBio(user.bio ?? '');
    setError(null);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, user, onClose]);

  if (!open) return null;

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const updated = await usersApi.updateMe({
        displayName: displayName.trim(),
        phone: phone.trim() || null,
        bio: bio.trim() || null,
      });
      setUser(updated);
      onClose();
    } catch {
      setError('Could not save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Edit profile"
        className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Edit profile</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full hover:bg-accent"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={onSave} className="space-y-4">
          <Field label="Display name" htmlFor="displayName">
            <Input
              id="displayName"
              required
              maxLength={80}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </Field>
          <Field label="Phone (optional)" htmlFor="phone">
            <Input
              id="phone"
              type="tel"
              placeholder="07…"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </Field>
          <Field label="Bio (optional)" htmlFor="bio">
            <textarea
              id="bio"
              rows={3}
              maxLength={500}
              placeholder="A short line about you — what you sell, where you meet…"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </Field>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="rounded-full">
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
