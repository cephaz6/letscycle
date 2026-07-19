'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLogin } from '@letscycle/api-client';
import { Button, Heading, Input, Text } from '@letscycle/ui';
import { AuthShell, GoogleButton, useCompleteSignIn } from '@/features/auth';
import { AuthDivider, AuthError, Field } from '@/features/auth/form-parts';

function LoginForm() {
  const params = useSearchParams();
  const next = params.get('next') || '/';
  const router = useRouter();
  const login = useLogin();
  const completeSignIn = useCompleteSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await login.mutateAsync({ email, password });
    await completeSignIn();
    router.push(next);
  }

  return (
    <div>
      <Heading level={1} className="text-2xl">
        Log in
      </Heading>

      <div className="mt-6">
        <GoogleButton />
      </div>

      <AuthDivider />

      <form onSubmit={onSubmit} className="space-y-4">
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
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="mt-1.5 text-right">
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
        </Field>

        {login.isError && <AuthError message="Incorrect email or password." />}

        <Button
          type="submit"
          size="lg"
          className="w-full rounded-full"
          disabled={login.isPending}
        >
          {login.isPending ? 'Logging in…' : 'Log in'}
        </Button>
      </form>

      <Text muted className="mt-6 text-center text-sm">
        Don’t have an account?{' '}
        <Link
          href={`/signup?next=${encodeURIComponent(next)}`}
          className="font-semibold text-primary hover:underline"
        >
          Sign up
        </Link>
      </Text>
    </div>
  );
}

export default function LoginPage() {
  return (
    <AuthShell
      title="Buy, sell or give away — right on your doorstep"
      subtitle="Log in to pick up where you left off."
      art="/illustrations/login-art.svg"
      artAlt="Welcome back to LetsCycle"
      artMode="background"
    >
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
