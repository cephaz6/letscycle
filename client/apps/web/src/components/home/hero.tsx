'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { buttonVariants, cn } from '@letscycle/ui';

interface HeroSlide {
  type: 'image' | 'video';
  src: string;
  title: string;
  subtitle: string;
  cta: string;
  /** Where the call to action takes you. */
  href: string;
}

const wide = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1600&q=60`;

// Three slides to start. Swap any `type` to 'video' and point `src` at an .mp4
// to play a muted, looping background video instead of an image.
const SLIDES: HeroSlide[] = [
  {
    type: 'image',
    src: wide('1555041469-a586c61ea9bc'),
    title: 'Give your things a second life',
    subtitle: 'Buy, sell and give away preloved items with people nearby.',
    cta: 'Browse nearby',
    href: '/search',
  },
  {
    type: 'image',
    src: wide('1485965120184-e220f721d03e'),
    title: 'Sell in minutes, meet locally',
    subtitle: 'List for free and match with buyers just around the corner.',
    cta: 'Start selling',
    href: '/sell',
  },
  {
    type: 'image',
    src: wide('1512820790803-83ca734da794'),
    title: 'Free to a good home',
    subtitle: 'Thousands of items given away by neighbours across Liverpool.',
    cta: 'See free stuff',
    href: '/search?type=giveaway',
  },
];

const INTERVAL_MS = 5000;

/** Auto-playing hero slider (crossfade, no controls). Images or video. */
export function Hero() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setActive((i) => (i + 1) % SLIDES.length), INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <section
      aria-label="Featured"
      className="relative h-80 w-full overflow-hidden border-b border-border sm:h-96 lg:h-112"
    >
      {SLIDES.map((slide, i) => (
        <div
          key={slide.title}
          aria-hidden={i !== active}
          className={cn(
            'absolute inset-0 transition-opacity duration-1000 ease-in-out',
            i === active ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}
        >
          <div className="hero-kenburns relative h-full w-full">
            {slide.type === 'video' ? (
              <video
                className="h-full w-full object-cover"
                src={slide.src}
                autoPlay
                muted
                loop
                playsInline
              />
            ) : (
              <Image
                src={slide.src}
                alt=""
                fill
                // Only the first slide paints before any interval fires, so it's
                // the one actually competing for LCP — the rest can lazy-load.
                priority={i === 0}
                sizes="100vw"
                className="object-cover"
              />
            )}
          </div>

          {/* Legibility scrim: dark from the left for the text, and a soft
              footer band so the mobile search pill and the dots stay readable
              over any photo. */}
          <div className="absolute inset-0 bg-linear-to-r from-black/70 via-black/35 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-black/50 to-transparent" />

          <div className="absolute inset-0">
            <div className="mx-auto flex h-full max-w-7xl items-center px-4 pb-16 sm:px-6 sm:pb-0 lg:px-8">
              <div className="max-w-lg text-white">
                <h2 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                  {slide.title}
                </h2>
                <p className="mt-3 max-w-md text-base text-white/90 sm:text-lg">
                  {slide.subtitle}
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Link
                    href={slide.href}
                    // Inactive slides are hidden: keep them out of the tab order.
                    tabIndex={i === active ? 0 : -1}
                    className={cn(buttonVariants({ size: 'lg' }), 'rounded-full shadow-lg')}
                  >
                    {slide.cta}
                  </Link>
                  <Link
                    href="/how-it-works"
                    tabIndex={i === active ? 0 : -1}
                    className={cn(
                      buttonVariants({ variant: 'outline', size: 'lg' }),
                      'hidden rounded-full border-white/40 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 hover:text-white sm:inline-flex',
                    )}
                  >
                    How it works
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Slide indicators: desktop only — mobile's bottom strip is already
          taken by the floating search below. */}
      <div className="absolute inset-x-0 bottom-5 z-20 hidden justify-center gap-2 sm:flex">
        {SLIDES.map((slide, i) => (
          <button
            key={slide.title}
            type="button"
            aria-label={`Show slide ${i + 1}: ${slide.title}`}
            aria-current={i === active}
            onClick={() => setActive(i)}
            className={cn(
              'h-1.5 rounded-full transition-all',
              i === active ? 'w-6 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/70',
            )}
          />
        ))}
      </div>

      {/* Mobile-only floating search over the hero */}
      <form
        role="search"
        action="/search"
        className="absolute inset-x-4 bottom-4 z-20 sm:hidden"
      >
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          name="q"
          placeholder="Search for anything"
          aria-label="Search listings"
          className="h-12 w-full rounded-full border border-border bg-background pl-11 pr-4 text-sm text-foreground shadow-lg placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        />
      </form>
    </section>
  );
}
