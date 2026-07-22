import type { Metadata } from 'next';
import Link from 'next/link';
import { ContentPage, Section } from '@/components/content/content-page';

export const metadata: Metadata = {
  title: 'Cookies · LetsCycle',
  description: 'The cookies and local storage LetsCycle uses, and why.',
};

export default function CookiesPage() {
  return (
    <ContentPage
      title="Cookies"
      lead="This page is short, because we use very little."
      updated="1 July 2026"
    >
      <Section title="What we use">
        <p>
          LetsCycle uses strictly necessary storage only. There are no advertising or
          third-party tracking cookies, so there is nothing to opt into.
        </p>
      </Section>

      <Section title="Session and sign-in">
        <p>
          Keeping you signed in needs a refresh token stored in your browser, plus a
          short-lived access token held in memory while the tab is open. Clearing site
          data signs you out.
        </p>
      </Section>

      <Section title="Preferences">
        <p>
          Your theme choice is stored in your browser so the site does not flash the wrong
          colours on load. Search filters live in the page URL rather than in storage,
          which is why a search can be shared as a link.
        </p>
      </Section>

      <Section title="Third parties">
        <p>
          Map tiles and address lookups are requested from OpenStreetMap when you use a
          map, so your IP address is visible to them as with any image request. We do not
          pass them anything about your account.
        </p>
      </Section>

      <Section title="Managing storage">
        <p>
          You can clear cookies and site data from your browser settings at any time.
          Doing so signs you out but does not delete your account — see the{' '}
          <Link href="/privacy" className="font-medium text-primary hover:underline">
            privacy policy
          </Link>{' '}
          for that.
        </p>
      </Section>
    </ContentPage>
  );
}
