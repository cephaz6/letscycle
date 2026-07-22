import type { Metadata } from 'next';
import {
  Bullets,
  ContentCta,
  ContentPage,
  Faq,
  Section,
  Steps,
} from '@/components/content/content-page';

export const metadata: Metadata = {
  title: 'How it works · LetsCycle',
  description:
    'Buying, selling and giving away on LetsCycle — payment held safely until pickup, and verified meet points across Liverpool.',
};

export default function HowItWorksPage() {
  return (
    <ContentPage
      title="How LetsCycle works"
      lead="List what you no longer need, find what you do, and hand it over safely somewhere public and local."
    >
      <Section title="Buying something">
        <Steps
          steps={[
            {
              title: 'Find it',
              body: 'Browse what’s near you or search by category, price and distance. Save anything you like to Saved items.',
            },
            {
              title: 'Buy now',
              body: 'Your payment is authorised but not taken. Nothing leaves your account while you arrange the handover.',
            },
            {
              title: 'Meet and check the item',
              body: 'Agree a public meet point and see the item in person before you commit.',
            },
            {
              title: 'Both confirm pickup',
              body: 'When you and the seller each confirm, the payment is captured and released to them. If it isn’t as described, don’t confirm — raise a dispute instead.',
            },
          ]}
        />
      </Section>

      <Section title="Selling something">
        <Steps
          steps={[
            {
              title: 'List it in minutes',
              body: 'Add a few photos, a price and a category. Listing is free.',
            },
            {
              title: 'Get matched',
              body: 'People who’ve added a matching wish are alerted automatically when your item goes live.',
            },
            {
              title: 'Confirm the buyer',
              body: 'Approve the order and arrange a handover. Track everything under Selling.',
            },
            {
              title: 'Hand over and get paid',
              body: 'Once you both confirm pickup the payment is captured and paid out to you.',
            },
          ]}
        />
      </Section>

      <Section title="Giving something away">
        <p>
          Not everything needs a price. List an item as a giveaway and interested
          neighbours can message you to claim it. You choose who gets it, then mark the
          handover complete — or cancel it if plans change.
        </p>
      </Section>

      <Section title="Staying safe">
        <Bullets
          items={[
            'Meet at one of our verified public meet points — police station foyers, supermarkets, libraries and community centres.',
            'Use safe transit on an order to share your trip, tell a trusted contact, and confirm you arrived.',
            'Never pay outside LetsCycle. Payment held until pickup is what protects you.',
            'Check the item before confirming. Confirming pickup releases the money.',
          ]}
        />
      </Section>

      <Section title="Common questions">
        <Faq
          items={[
            {
              q: 'When is my money actually taken?',
              a: 'Not when you press Buy now — the payment is only authorised then. It’s captured once both you and the seller confirm the pickup.',
            },
            {
              q: 'What if the item isn’t as described?',
              a: 'Don’t confirm pickup. Open a dispute from the order and we’ll look into it before any money moves.',
            },
            {
              q: 'Does it cost anything to list?',
              a: 'Listing is free. A small commission is taken from a completed sale — giveaways are free end to end.',
            },
            {
              q: 'How do wishlist alerts work?',
              a: 'Add what you’re after under Wanted, with a category, keywords, a maximum price and a distance. When a matching item is posted nearby we notify you. You’ll need a home location set for this to work.',
            },
            {
              q: 'Where do you operate?',
              a: 'We’re starting in Liverpool so there’s enough nearby to make local handovers practical.',
            },
          ]}
        />
      </Section>

      <ContentCta
        title="Ready to have a look?"
        body="See what neighbours are passing on this week."
        actions={[
          { label: 'Browse items', href: '/search', primary: true },
          { label: 'List something', href: '/sell' },
        ]}
      />
    </ContentPage>
  );
}
