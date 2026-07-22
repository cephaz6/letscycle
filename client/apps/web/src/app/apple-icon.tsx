import { ImageResponse } from 'next/og';

/**
 * Home-screen icon for iOS, which ignores the web manifest's icons and uses
 * this link instead. No transparency and no rounding — iOS masks it itself.
 */
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
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
        fontSize: 116,
        fontWeight: 700,
      }}
    >
      ♻
    </div>,
    size,
  );
}
