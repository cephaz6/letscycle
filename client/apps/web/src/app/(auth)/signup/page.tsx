'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { authApi, useSignup } from '@letscycle/api-client';
import { Button, Heading, Input, Text } from '@letscycle/ui';
import { AuthShell, GoogleButton, useCompleteSignIn } from '@/features/auth';
import { AuthDivider, AuthError, Field } from '@/features/auth/form-parts';

function SignupForm() {
  const params = useSearchParams();
  const next = params.get('next') || '/';
  const router = useRouter();
  const signup = useSignup();
  const completeSignIn = useCompleteSignIn();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await signup.mutateAsync({ email, password, displayName });
      // Signup doesn't start a session — log in to obtain one.
      await authApi.login({ email, password });
      await completeSignIn();
      router.push(next);
    } catch (err) {
      setError(
        err instanceof Error && err.message.includes('already exists')
          ? 'An account with this email already exists.'
          : 'Could not create your account. Please try again.',
      );
    }
  }

  return (
    <div>
      <Heading level={1} className="text-2xl">
        Create your account
      </Heading>

      <div className="mt-6">
        <GoogleButton />
      </div>

      <AuthDivider />

      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Name" htmlFor="name">
          <Input
            id="name"
            required
            autoComplete="name"
            placeholder="Your name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </Field>
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
        <Field label="Password" htmlFor="password">
          <Input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        {error && <AuthError message={error} />}

        <Button
          type="submit"
          size="lg"
          className="w-full rounded-full"
          disabled={signup.isPending}
        >
          {signup.isPending ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <Text muted className="mt-4 text-center text-xs">
        By continuing you agree to our Terms and Privacy Policy.
      </Text>

      <Text muted className="mt-4 text-center text-sm">
        Already have an account?{' '}
        <Link
          href={`/login?next=${encodeURIComponent(next)}`}
          className="font-semibold text-primary hover:underline"
        >
          Log in
        </Link>
      </Text>
    </div>
  );
}

export default function SignupPage() {
  return (
    <AuthShell
      title="Join your local reuse community"
      subtitle="Create an account to buy, sell and give away nearby."
      art="/illustrations/register-art.svg"
      artAlt="Join LetsCycle"
      artMode="background"
    >
      <Suspense>
        <SignupForm />
      </Suspense>
    </AuthShell>
  );
}
