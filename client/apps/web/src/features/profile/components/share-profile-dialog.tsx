'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, Facebook, Mail, MessageCircle, Twitter, X } from 'lucide-react';
import { cn } from '@letscycle/ui';

export function ShareProfileDialog({
  name,
  open,
  onClose,
}: {
  name: string;
  open: boolean;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (!open) return;
    setUrl(window.location.href);
    setCopied(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked — the field is selectable as a fallback
    }
  }

  const shareText = `Check out ${name} on LetsCycle`;
  const enc = encodeURIComponent;
  const channels = [
    {
      label: 'WhatsApp',
      icon: MessageCircle,
      href: `https://wa.me/?text=${enc(`${shareText} ${url}`)}`,
      className: 'bg-[#25D366] text-white',
    },
    {
      label: 'X',
      icon: Twitter,
      href: `https://twitter.com/intent/tweet?text=${enc(shareText)}&url=${enc(url)}`,
      className: 'bg-foreground text-background',
    },
    {
      label: 'Facebook',
      icon: Facebook,
      href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`,
      className: 'bg-[#1877F2] text-white',
    },
    {
      label: 'Email',
      icon: Mail,
      href: `mailto:?subject=${enc(shareText)}&body=${enc(`${shareText}:\n${url}`)}`,
      className: 'bg-muted text-foreground',
    },
  ];

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
        aria-label={`Share ${name}'s profile`}
        className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Share profile</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full hover:bg-accent"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-input bg-background p-1.5">
          <input
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
            className="min-w-0 flex-1 bg-transparent px-2 text-sm text-muted-foreground focus:outline-none"
          />
          <button
            type="button"
            onClick={() => void copy()}
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              copied
                ? 'bg-success text-success-foreground'
                : 'bg-primary text-primary-foreground hover:bg-primary/90',
            )}
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        <div className="mt-5 grid grid-cols-4 gap-3">
          {channels.map((c) => {
            const Icon = c.icon;
            return (
              <a
                key={c.label}
                href={c.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1.5"
              >
                <span
                  className={cn(
                    'grid size-12 place-items-center rounded-full transition-transform hover:scale-105',
                    c.className,
                  )}
                >
                  <Icon className="size-5" />
                </span>
                <span className="text-xs text-muted-foreground">{c.label}</span>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}
