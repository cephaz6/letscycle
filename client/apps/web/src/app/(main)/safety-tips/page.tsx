import type { Metadata } from 'next';
import {
  Bullets,
  ContentCta,
  ContentPage,
  Section,
} from '@/components/content/content-page';

export const metadata: Metadata = {
  title: 'Safety tips · LetsCycle',
  description:
    'How to buy, sell and hand over safely on LetsCycle — meet points, safe transit and spotting scams.',
};

export default function SafetyTipsPage() {
  return (
    <ContentPage
      title="Staying safe"
      lead="Most handovers are completely uneventful. These habits keep it that way."
    >
      <Section title="Meet somewhere public">
        <Bullets
          items={[
            'Use a verified meet point where you can — police station foyers, supermarkets, libraries and community centres, all busy and covered by cameras.',
            'Daylight beats evening. Somewhere staffed beats somewhere quiet.',
            'You never have to invite anyone to your home, and you never have to go to theirs.',
            'Bring someone with you if the item is large or valuable.',
          ]}
        />
      </Section>

      <Section title="Use safe transit">
        <p>
          On an order that’s awaiting pickup you can start safe transit: share your live
          location, flag that a trusted contact knows where you are, confirm you’ve
          arrived, and raise an alert if something feels wrong.
        </p>
        <p>
          If you’re ever in immediate danger, call 999 first — the in-app alert is not an
          emergency service.
        </p>
      </Section>

      <Section title="Keep the money on LetsCycle">
        <Bullets
          items={[
            'Payment is authorised at checkout and only captured when you both confirm pickup. That hold is your protection — moving off-platform removes it.',
            'Be wary of anyone pushing for a bank transfer, gift cards, or paying “to hold” an item.',
            'Never share card details, passwords or one-time codes with another member. We will never ask for them.',
            'A price far below the going rate is the oldest hook there is.',
          ]}
        />
      </Section>

      <Section title="Check before you confirm">
        <p>
          Confirming pickup releases the payment, so treat it as the last step. Look the
          item over, test anything electrical, and make sure it matches the listing. If it
          doesn’t, don’t confirm — raise a dispute from the order and the money stays on
          hold.
        </p>
      </Section>

      <Section title="Report anything off">
        <p>
          You can report a listing or a member from their page. Blocking stops someone
          contacting you. Reports are reviewed, and reporting something early helps the
          next person as much as it helps you.
        </p>
      </Section>

      <ContentCta
        title="Find a meet point"
        body="See verified public handover spots near you."
        actions={[
          { label: 'Safe meet points', href: '/safety', primary: true },
          { label: 'Help centre', href: '/help' },
        ]}
      />
    </ContentPage>
  );
}
