'use client';

import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { Button, cn } from '@letscycle/ui';

interface HeroSlide {
  type: 'image' | 'video';
  src: string;
  title: string;
  subtitle: string;
  cta: string;
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
  },
  {
    type: 'image',
    src: wide('1485965120184-e220f721d03e'),
    title: 'Sell in minutes, meet locally',
    subtitle: 'List for free and match with buyers just around the corner.',
    cta: 'Start selling',
  },
  {
    type: 'image',
    src: wide('1512820790803-83ca734da794'),
    title: 'Free to a good home',
    subtitle: 'Thousands of items given away by neighbours across Liverpool.',
    cta: 'See free stuff',
  },
];

const INTERVAL_MS = 5000;

/** Auto-playing hero slider (crossfade, no controls). Images or video. */
export function Hero() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(
      () => setActive((i) => (i + 1) % SLIDES.length),
      INTERVAL_MS,
    );
    return () => clearInterval(id);
  }, []);

  return (
    <section
      aria-label="Featured"
      className="relative h-64 w-full overflow-hidden border-b border-border lg:h-80"
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
            // eslint-disable-next-line @next/next/no-img-element -- remote demo photos
            <img src={slide.src} alt="" className="h-full w-full object-cover" />
          )}

          {/* Legibility scrim */}
          <div className="absolute inset-0 bg-linear-to-r from-black/70 via-black/40 to-transparent" />

          <div className="absolute inset-0">
            <div className="mx-auto flex h-full max-w-7xl items-center px-4 pb-16 sm:px-6 sm:pb-0 lg:px-8">
              <div className="max-w-lg text-white">
                <h2 className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl lg:text-4xl">
                  {slide.title}
                </h2>
                <p className="mt-2 max-w-md text-sm text-white/90 sm:text-base">
                  {slide.subtitle}
                </p>
                <Button size="lg" className="mt-4 rounded-full">
                  {slide.cta}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Mobile-only floating search over the hero */}
      <form
        role="search"
        action="/"
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
