import { ImageResponse } from 'next/og';

/**
 * Manifest icons at stable paths (/icons/192, /icons/512).
 *
 * Next's generated `icon.tsx` lands on a hashed URL, which a manifest can't
 * reference reliably, so these are served from a route instead. Generated on
 * the fly, then cached hard — the mark only changes when the brand does.
 *
 * The glyph sits at ~55% of the canvas so the icon survives Android's maskable
 * crop without the edges being clipped.
 */
const SIZES = new Set([192, 512]);

export function generateStaticParams(): { size: string }[] {
  return [{ size: '192' }, { size: '512' }];
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ size: string }> },
): Promise<Response> {
  const { size: raw } = await params;
  const size = Number.parseInt(raw, 10);
  if (!SIZES.has(size)) {
    return new Response('Not found', { status: 404 });
  }

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#16a34a',
        color: '#ffffff',
        fontSize: Math.round(size * 0.55),
        fontWeight: 700,
      }}
    >
      ♻
    </div>,
    {
      width: size,
      height: size,
      headers: { 'Cache-Control': 'public, max-age=31536000, immutable' },
    },
  );
}
