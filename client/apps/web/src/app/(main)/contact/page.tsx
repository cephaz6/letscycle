import type { Metadata } from 'next';
import Link from 'next/link';
import { ContentPage, Section } from '@/components/content/content-page';
import { ContactForm } from '@/components/content/contact-form';

export const metadata: Metadata = {
  title: 'Contact us · LetsCycle',
  description: 'Get in touch with the LetsCycle team.',
};

export default function ContactPage() {
  return (
    <ContentPage
      title="Contact us"
      lead="Questions, problems with an order, or something that doesn’t look right — tell us and we’ll take a look."
    >
      <ContactForm />

      <Section title="Before you write">
        <p>
          A few things are faster to solve yourself:{' '}
          <Link href="/help" className="font-medium text-primary hover:underline">
            the help centre
          </Link>{' '}
          covers most order and account questions, and{' '}
          <Link href="/how-it-works" className="font-medium text-primary hover:underline">
            how it works
          </Link>{' '}
          explains when money moves.
        </p>
        <p>
          If a specific order has gone wrong, open it from{' '}
          <Link href="/transactions" className="font-medium text-primary hover:underline">
            My orders
          </Link>{' '}
          and raise a dispute there — that keeps the payment on hold while we look into
          it.
        </p>
      </Section>

      <Section title="Something urgent or unsafe">
        <p>
          If you feel unsafe during a handover, use the “I need help” button on the order
          and contact the police on 999. Report a member or listing from their page and
          we’ll review it.
        </p>
      </Section>

      <Section title="Where we are">
        <p>Liverpool, United Kingdom. We usually reply within two working days.</p>
      </Section>
    </ContentPage>
  );
}
