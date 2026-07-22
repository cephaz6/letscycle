import type { Metadata } from 'next';
import {
  Bullets,
  ContentCta,
  ContentPage,
  Section,
} from '@/components/content/content-page';

export const metadata: Metadata = {
  title: 'About · LetsCycle',
  description:
    'LetsCycle is a local marketplace for reuse, starting in Liverpool — built around safe handovers and things staying out of landfill.',
};

export default function AboutPage() {
  return (
    <ContentPage
      title="About LetsCycle"
      lead="A local marketplace for reuse. We help people pass on what they no longer need to someone nearby who does."
    >
      <Section title="Why we built it">
        <p>
          Most of us have things sitting unused that someone a few streets away would
          gladly take. The barrier isn’t willingness — it’s friction. Listing feels like
          effort, meeting a stranger feels risky, and paying someone you’ve never met
          feels like a leap.
        </p>
        <p>
          LetsCycle exists to remove those three frictions: listing takes minutes,
          handovers happen at verified public places, and payment is held until you’ve
          both confirmed the item changed hands.
        </p>
      </Section>

      <Section title="What makes it different">
        <Bullets
          items={[
            <>
              <strong>Local by design.</strong> Everything is ranked by how close it is to
              you, because a sofa two miles away is useful and one two hundred miles away
              isn’t.
            </>,
            <>
              <strong>Giving away is first class.</strong> Free items aren’t an
              afterthought — they get the same matching and handover flow as sales.
            </>,
            <>
              <strong>Safety is built in.</strong> Verified meet points and safe transit
              are part of the product, not a help article.
            </>,
            <>
              <strong>Money moves last.</strong> Payment is captured only when both sides
              confirm the pickup.
            </>,
          ]}
        />
      </Section>

      <Section title="Starting in Liverpool">
        <p>
          Local marketplaces only work when there’s enough nearby to be worth the trip, so
          we’re starting in one city and building density before spreading out. If you’re
          in Liverpool, you’re early — and the more that gets listed, the better it works
          for everyone.
        </p>
      </Section>

      <Section title="Where we’re heading">
        <p>
          Next up: more delivery options for things too big to carry, richer trust signals
          so you know who you’re dealing with, and an installable app with push
          notifications for matches and messages.
        </p>
      </Section>

      <ContentCta
        title="Join in"
        body="List something you no longer need, or see what’s nearby."
        actions={[
          { label: 'Browse items', href: '/search', primary: true },
          { label: 'How it works', href: '/how-it-works' },
        ]}
      />
    </ContentPage>
  );
}
