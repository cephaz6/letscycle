import { ImageResponse } from 'next/og';

/**
 * Favicon, generated rather than checked in as a binary — one source of truth
 * for the mark, and it stays in step with the brand colour.
 */
export const size = { width: 64, height: 64 };
export const contentType = 'image/png';

export default function Icon() {
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
        fontSize: 40,
        fontWeight: 700,
        borderRadius: 14,
      }}
    >
      ♻
    </div>,
    size,
  );
}
