import type { Metadata } from 'next';
import Link from 'next/link';
import { ContentCta, ContentPage, Faq, Section } from '@/components/content/content-page';

export const metadata: Metadata = {
  title: 'Help centre · LetsCycle',
  description: 'Answers to common questions about orders, listings and your account.',
};

export default function HelpPage() {
  return (
    <ContentPage
      title="Help centre"
      lead="Answers to the things people ask most. If yours isn’t here, get in touch."
    >
      <Section title="Orders and payment">
        <Faq
          items={[
            {
              q: 'I pressed Buy now — has the money gone?',
              a: 'No. The payment is authorised but not captured. It only leaves your account once you and the seller both confirm the pickup.',
            },
            {
              q: 'The seller isn’t responding.',
              a: 'Message them from the order first. If it stays quiet, either side can cancel while the order is still awaiting pickup, which releases the item and your authorisation.',
            },
            {
              q: 'The item wasn’t as described.',
              a: 'Don’t confirm pickup — that’s what releases the money. Raise a dispute from the order instead.',
            },
            {
              q: 'How do I cancel?',
              a: 'Open the order and choose to cancel. That works up until the payment is captured; after that, raise a dispute.',
            },
            {
              q: 'When do I get paid as a seller?',
              a: 'Once you both confirm pickup, the payment is captured and released to your payout account. Set that up under Settings → Payouts.',
            },
          ]}
        />
      </Section>

      <Section title="Listings">
        <Faq
          items={[
            {
              q: 'How do I edit or remove a listing?',
              a: 'Open your own listing and use the manage controls. Editing and removal lock once someone has messaged about it or started buying, so a live deal can’t change underneath the other person.',
            },
            {
              q: 'Can I give something away instead of selling it?',
              a: 'Yes — choose “Give away” when listing. Interested people message you to claim it and you pick who gets it.',
            },
            {
              q: 'Why isn’t my item showing up for people?',
              a: 'Listings are ranked by distance, so make sure the location is right. Items only reach wishlist alerts if the searcher has a home location set.',
            },
          ]}
        />
      </Section>

      <Section title="Account and privacy">
        <Faq
          items={[
            {
              q: 'How do I change my password?',
              a: 'Use the forgotten-password link on the sign-in page.',
            },
            {
              q: 'What do other people see?',
              a: 'Your display name, photo, bio, member-since date, listings, and reviews. Your email, phone and exact location are never shown.',
            },
            {
              q: 'Can I download or delete my data?',
              a: (
                <>
                  Yes — both are under{' '}
                  <Link
                    href="/settings"
                    className="font-medium text-primary hover:underline"
                  >
                    Settings
                  </Link>
                  . Deleting anonymises your account permanently.
                </>
              ),
            },
            {
              q: 'Why do you want my location?',
              a: 'To show what’s near you and to power wishlist alerts. It’s approximate and never shown to other members.',
            },
          ]}
        />
      </Section>

      <ContentCta
        title="Still stuck?"
        body="Send us the details and we’ll come back to you."
        actions={[
          { label: 'Contact us', href: '/contact', primary: true },
          { label: 'Safety tips', href: '/safety-tips' },
        ]}
      />
    </ContentPage>
  );
}
