'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, MailCheck } from 'lucide-react';
import { Button, Heading, Input, Text } from '@letscycle/ui';
import { AuthShell } from '@/features/auth';
import { Field } from '@/features/auth/form-parts';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    // Password reset is delivered by the identity provider (Cognito + SES),
    // which arrives with real auth infrastructure. Until then this is a no-op
    // that always shows the same generic result (no account enumeration).
    // TODO: call authApi.forgotPassword(email) once the endpoint exists.
    await new Promise((r) => setTimeout(r, 400));
    setSubmitting(false);
    setSent(true);
  }

  return (
    <AuthShell
      title="Buy, sell or give away — right on your doorstep"
      subtitle="Reset your password and get back to it."
      art="/illustrations/login-art.svg"
      artAlt="LetsCycle"
      artMode="background"
    >
      {sent ? (
        <div className="text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-success/10 text-success">
            <MailCheck className="size-7" />
          </span>
          <Heading level={1} className="mt-4 text-2xl">
            Check your email
          </Heading>
          <Text muted className="mt-2">
            If an account exists for <span className="font-medium">{email}</span>, we’ve
            sent a link to reset your password. It may take a minute to arrive.
          </Text>
          <Link
            href="/login"
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
          >
            <ArrowLeft className="size-4" /> Back to log in
          </Link>
        </div>
      ) : (
        <div>
          <Heading level={1} className="text-2xl">
            Reset your password
          </Heading>
          <Text muted className="mt-2 text-sm">
            Enter your email and we’ll send you a link to set a new password.
          </Text>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <Field label="Email address" htmlFor="email">
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Button
              type="submit"
              size="lg"
              className="w-full rounded-full"
              disabled={submitting}
            >
              {submitting ? 'Sending…' : 'Send reset link'}
            </Button>
          </form>

          <Link
            href="/login"
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="size-4" /> Back to log in
          </Link>
        </div>
      )}
    </AuthShell>
  );
}
