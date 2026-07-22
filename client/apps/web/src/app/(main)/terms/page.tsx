import type { Metadata } from 'next';
import Link from 'next/link';
import { Bullets, ContentPage, Section } from '@/components/content/content-page';

export const metadata: Metadata = {
  title: 'Terms of service · LetsCycle',
  description: 'The terms you agree to when using LetsCycle.',
};

export default function TermsPage() {
  return (
    <ContentPage
      title="Terms of service"
      lead="The agreement between you and LetsCycle when you use the site."
      updated="1 July 2026"
    >
      <Section title="Plain-English summary">
        <p>
          This summary is here to help — the sections below are what actually applies. In
          short: be honest in your listings, meet safely, don’t list anything you
          shouldn’t, and let the payment flow do its job.
        </p>
      </Section>

      <Section title="1. Who we are">
        <p>
          LetsCycle is a marketplace operating in Liverpool, United Kingdom. We provide
          the platform where members list, buy, sell and give away items. We are not a
          party to the deal itself — that is between the buyer and the seller.
        </p>
      </Section>

      <Section title="2. Your account">
        <Bullets
          items={[
            'You must be 18 or over to sell, and old enough to form a binding contract to buy.',
            'Keep your sign-in details to yourself; you are responsible for what happens under your account.',
            'One account per person, and accounts are not transferable.',
            'We may suspend an account that breaks these terms or puts other members at risk.',
          ]}
        />
      </Section>

      <Section title="3. Listing items">
        <Bullets
          items={[
            'Describe items accurately, including faults, and use photographs of the actual item.',
            'You must own the item, or have the right to sell it.',
            'Prohibited items include weapons, controlled drugs, stolen or counterfeit goods, live animals, recalled products, and anything unlawful to sell in the UK.',
            'Prices are in pounds sterling and cover everything the buyer pays for the item itself.',
          ]}
        />
      </Section>

      <Section title="4. Buying, payment and completion">
        <p>
          When a buyer commits, the payment is authorised but not taken. It is captured
          only once both parties confirm the handover, at which point the seller is paid
          less our commission. Either party may cancel before capture.
        </p>
        <p>
          Do not confirm a pickup that has not happened, or for an item that is not as
          described — confirming is what releases the money.
        </p>
      </Section>

      <Section title="5. Fees">
        <p>
          Listing is free, and giveaways are free end to end. A commission is deducted
          from a completed sale; the rate in force is shown before you list.
        </p>
      </Section>

      <Section title="6. Disputes">
        <p>
          If something goes wrong, raise a dispute from the order. We will consider the
          evidence from both sides and decide how the held payment is handled. Our
          decision on releasing or refunding a held payment is final; it does not affect
          your statutory rights.
        </p>
      </Section>

      <Section title="7. Safety">
        <p>
          Meeting other members is at your own risk. We provide verified meet points and
          safe-transit tools, but we do not vet members and cannot supervise handovers.
          Please follow the{' '}
          <Link href="/safety-tips" className="font-medium text-primary hover:underline">
            safety guidance
          </Link>
          .
        </p>
      </Section>

      <Section title="8. Content you post">
        <p>
          You keep ownership of your photos and text, and grant us a licence to display
          them on LetsCycle for the purpose of running the marketplace. Do not post
          anything unlawful, misleading, or that infringes someone else’s rights.
        </p>
      </Section>

      <Section title="9. Liability">
        <p>
          We provide the platform as-is and do not guarantee uninterrupted service. We are
          not liable for the condition, legality or safety of items, nor for conduct
          between members. Nothing here limits liability for death or personal injury
          caused by negligence, or for fraud.
        </p>
      </Section>

      <Section title="10. Ending your use">
        <p>
          You may delete your account at any time from Settings. Some records are retained
          where the law requires, or where the other side of a completed transaction needs
          them.
        </p>
      </Section>

      <Section title="11. Changes and governing law">
        <p>
          We may update these terms; material changes will be notified in the app. These
          terms are governed by the law of England and Wales.
        </p>
      </Section>
    </ContentPage>
  );
}
