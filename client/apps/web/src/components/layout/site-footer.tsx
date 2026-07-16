import Link from 'next/link';
import { Facebook, Instagram, Twitter, Youtube } from 'lucide-react';
import { Icon } from '@letscycle/ui';

const columns: { heading: string; links: string[] }[] = [
  { heading: 'Marketplace', links: ['Browse', 'Sell an item', 'Wishlists', 'How it works'] },
  { heading: 'Company', links: ['About', 'Careers', 'Blog', 'Press'] },
  { heading: 'Support', links: ['Help centre', 'Safety', 'Contact us', 'Community'] },
  { heading: 'Legal', links: ['Terms', 'Privacy', 'Cookies', 'Accessibility'] },
];

const socials = [
  { label: 'Instagram', Icon: Instagram },
  { label: 'Twitter', Icon: Twitter },
  { label: 'Facebook', Icon: Facebook },
  { label: 'YouTube', Icon: Youtube },
];

/** Full-width site footer: brand blurb, link columns, legal bar. */
export function SiteFooter() {
  return (
    <footer className="w-full border-t border-border bg-muted/40">
      <div className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.5fr_repeat(4,1fr)]">
          {/* Brand */}
          <div className="max-w-xs">
            <Link href="/" className="flex items-center gap-1.5 text-primary">
              <Icon name="Recycle" className="size-7" />
              <span className="text-xl font-bold tracking-tight">LetsCycle</span>
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">
              Give your things a second life. A local marketplace for buying, selling
              and giving away — matched to people near you.
            </p>
            <div className="mt-5 flex gap-2">
              {socials.map(({ label, Icon: SocialIcon }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="grid size-9 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  <SocialIcon className="size-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <div key={col.heading}>
              <h3 className="text-sm font-semibold text-foreground">{col.heading}</h3>
              <ul className="mt-3 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link}>
                    <Link
                      href="/"
                      className="text-sm text-muted-foreground transition-colors hover:text-primary"
                    >
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Legal bar */}
        <div className="mt-10 flex flex-col gap-3 border-t border-border pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 LetsCycle · Liverpool, UK</p>
          <p>Made for reuse ♻️</p>
        </div>
      </div>
    </footer>
  );
}
