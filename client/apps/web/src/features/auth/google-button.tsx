'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { useRouter, useSearchParams } from 'next/navigation';
import { useGoogleLogin } from '@letscycle/api-client';
import { Text } from '@letscycle/ui';
import { useCompleteSignIn } from './use-auth';

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

interface GoogleIdApi {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string;
        callback: (response: { credential: string }) => void;
      }) => void;
      renderButton: (
        el: HTMLElement,
        options: Record<string, string | number>,
      ) => void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdApi;
  }
}

/** "Continue with Google" via Google Identity Services (ID-token flow). */
export function GoogleButton() {
  const ref = useRef<HTMLDivElement>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const googleLogin = useGoogleLogin();
  const completeSignIn = useCompleteSignIn();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/';

  const handleCredential = useCallback(
    async (credential: string) => {
      await googleLogin.mutateAsync(credential);
      await completeSignIn();
      router.push(next);
    },
    [googleLogin, completeSignIn, router, next],
  );

  useEffect(() => {
    if (!scriptReady || !CLIENT_ID || !window.google || !ref.current) return;
    window.google.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: (response) => void handleCredential(response.credential),
    });
    window.google.accounts.id.renderButton(ref.current, {
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'pill',
      logo_alignment: 'center',
      width: 340,
    });
  }, [scriptReady, handleCredential]);

  if (!CLIENT_ID) {
    return (
      <div className="rounded-full border border-dashed border-border px-4 py-3 text-center">
        <Text muted className="text-xs">
          Set <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> to enable Google sign-in.
        </Text>
      </div>
    );
  }

  return (
    <div>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
      />
      <div ref={ref} className="flex min-h-[44px] justify-center" />
      {googleLogin.isError && (
        <Text className="mt-2 text-center text-sm text-destructive">
          Google sign-in failed. Please try again.
        </Text>
      )}
    </div>
  );
}
