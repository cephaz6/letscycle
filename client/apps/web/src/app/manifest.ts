import type { MetadataRoute } from 'next';

/**
 * Web app manifest — makes LetsCycle installable to a home screen.
 *
 * `start_url` is the browse page rather than a deep link so a launch always
 * lands somewhere useful, and shortcuts cover the two things people open the
 * app to do: list something, or check messages.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'LetsCycle — local reuse marketplace',
    short_name: 'LetsCycle',
    description:
      'Buy, sell and give away preloved items with people nearby. Payment is held until you have both confirmed the handover.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#16a34a',
    categories: ['shopping', 'lifestyle'],
    icons: [
      { src: '/icons/192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/512', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/512', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Sell an item', url: '/sell' },
      { name: 'Messages', url: '/messages' },
      { name: 'Saved items', url: '/wishlist' },
    ],
  };
}
