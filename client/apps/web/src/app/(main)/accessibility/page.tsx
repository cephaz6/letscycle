import type { Metadata } from 'next';
import Link from 'next/link';
import { Bullets, ContentPage, Section } from '@/components/content/content-page';

export const metadata: Metadata = {
  title: 'Accessibility · LetsCycle',
  description: 'Our accessibility commitments, what works today, and the known gaps.',
};

export default function AccessibilityPage() {
  return (
    <ContentPage
      title="Accessibility"
      lead="Reuse should be open to everyone. Here is where we are, honestly."
      updated="1 July 2026"
    >
      <Section title="What we aim for">
        <p>
          We target WCAG 2.1 level AA. In practice that means semantic markup, visible
          focus, full keyboard operation, colour contrast that holds up in both light and
          dark themes, and text that reflows on small screens.
        </p>
      </Section>

      <Section title="What already works">
        <Bullets
          items={[
            'Interactive controls are reachable and operable by keyboard, with a visible focus ring.',
            'Light and dark themes are both contrast-checked, and the site follows your system preference.',
            'Reduced-motion preferences are honoured — the homepage carousel stops advancing.',
            'Images carry alt text, and icon-only buttons carry accessible labels.',
          ]}
        />
      </Section>

      <Section title="Known gaps">
        <Bullets
          items={[
            'Maps are inherently visual. Meet points are also listed as text with addresses and distances, but the map itself is not usable without sight.',
            'We have not yet completed a full screen-reader audit of the newer flows.',
            'Listing photos come from members, so alt text quality varies.',
          ]}
        />
      </Section>

      <Section title="Tell us what we have missed">
        <p>
          If something blocks you, we want to hear about it — that feedback is worth more
          than any audit. Get in touch through the{' '}
          <Link href="/contact" className="font-medium text-primary hover:underline">
            contact page
          </Link>{' '}
          and we will treat it as a bug, not a suggestion.
        </p>
      </Section>
    </ContentPage>
  );
}
