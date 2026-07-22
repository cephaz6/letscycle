import type { Metadata } from 'next';
import Link from 'next/link';
import { Bullets, ContentPage, Section } from '@/components/content/content-page';

export const metadata: Metadata = {
  title: 'Privacy policy · LetsCycle',
  description: 'What LetsCycle collects, why, and the control you have over it.',
};

export default function PrivacyPage() {
  return (
    <ContentPage
      title="Privacy policy"
      lead="What we collect, why we collect it, and what you can do about it."
      updated="1 July 2026"
    >
      <Section title="What we collect">
        <Bullets
          items={[
            'Account details: email, display name, and optionally a phone number, photo and short bio.',
            'An approximate home location, if you set one, used to rank items by distance and to power wishlist alerts.',
            'Marketplace activity: listings, saved items, wishes, messages, orders and reviews.',
            'Technical data: IP address, device and browser information, and audit records of security-relevant actions such as sign-ins.',
          ]}
        />
      </Section>

      <Section title="What other members can see">
        <p>
          Your display name, photo, bio, member-since date, listings and the reviews you
          have received are public. Your email address, phone number and exact location
          are never shown to other members.
        </p>
      </Section>

      <Section title="Why we use it">
        <Bullets
          items={[
            'To run the marketplace — showing nearby items, matching wishes, delivering messages and processing orders. This is necessary to perform our contract with you.',
            'To keep people safe — detecting fraud, reviewing reports and investigating disputes. This is our legitimate interest in a safe platform.',
            'To meet legal obligations, such as keeping transaction records.',
          ]}
        />
      </Section>

      <Section title="Location">
        <p>
          Your home location is deliberately approximate and stored with an accuracy
          radius. We use it to sort by distance and to decide which wishlist alerts are
          relevant. Setting it is optional — the site works without it, though match
          alerts will not reach you. You can change or remove it at any time in{' '}
          <Link href="/settings" className="font-medium text-primary hover:underline">
            Settings
          </Link>
          .
        </p>
      </Section>

      <Section title="Who we share it with">
        <p>
          Service providers who process data on our behalf — hosting, payment processing,
          email and error monitoring — under contract and only for those purposes. We do
          not sell your personal data. We may disclose data where the law requires it, or
          to protect members from harm.
        </p>
      </Section>

      <Section title="How long we keep it">
        <p>
          Account data is kept while your account is open. When you delete your account we
          anonymise your personal data; records tied to completed transactions are
          retained where the other party or the law requires them.
        </p>
      </Section>

      <Section title="Your rights">
        <Bullets
          items={[
            'Access — download everything we hold on you, from Settings.',
            'Erasure — delete your account, which anonymises your data.',
            'Rectification — correct your details at any time in your profile.',
            'Objection and restriction — tell us if you object to a particular use.',
            'Complaint — you can complain to the Information Commissioner’s Office (ico.org.uk).',
          ]}
        />
      </Section>

      <Section title="Contact">
        <p>
          Questions about privacy, or a request about your data? Use the{' '}
          <Link href="/contact" className="font-medium text-primary hover:underline">
            contact page
          </Link>{' '}
          and choose “Account and privacy”.
        </p>
      </Section>
    </ContentPage>
  );
}
