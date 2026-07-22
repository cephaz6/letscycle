'use client';

import { useState } from 'react';
import { Mail } from 'lucide-react';
import { Button, Input } from '@letscycle/ui';
import { Field } from '@/features/auth/form-parts';

const SUPPORT_EMAIL = 'hello@letscycle.dev';

const TOPICS = [
  'General question',
  'Problem with an order',
  'Report a listing or member',
  'Account and privacy',
  'Press or partnerships',
];

/**
 * Composes a message into the visitor's email client. There is no inbox
 * endpoint behind the site yet, so submitting to one would quietly drop
 * messages — handing off to email keeps it honest and gives them a record.
 */
export function ContactForm() {
  const [topic, setTopic] = useState(TOPICS[0] as string);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const href =
    `mailto:${SUPPORT_EMAIL}` +
    `?subject=${encodeURIComponent(`[${topic}] ${subject}`.trim())}` +
    `&body=${encodeURIComponent(message)}`;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        window.location.href = href;
      }}
      className="space-y-4 rounded-2xl border border-border bg-card p-5"
    >
      <Field label="What's it about?" htmlFor="contact-topic">
        <select
          id="contact-topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {TOPICS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Subject" htmlFor="contact-subject">
        <Input
          id="contact-subject"
          required
          placeholder="A one-line summary"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
      </Field>

      <Field label="Message" htmlFor="contact-message">
        <textarea
          id="contact-message"
          required
          rows={6}
          placeholder="Tell us what's happened, and include an order or listing link if there is one."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </Field>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" className="rounded-full">
          <Mail className="size-4" /> Open in email
        </Button>
        <span className="text-xs text-muted-foreground">
          Opens your email app with this filled in.
        </span>
      </div>
    </form>
  );
}
