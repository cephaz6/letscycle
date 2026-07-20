'use client';

// Catches errors in the root layout itself. It replaces the whole document,
// so it can't rely on the app's CSS — keep it minimal and self-contained.
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          fontFamily: 'system-ui, sans-serif',
          background: '#fff',
          color: '#0f172a',
          padding: '2rem',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: 420 }}>
          <p style={{ fontSize: 48, fontWeight: 800, color: '#2f8f57', margin: 0 }}>
            LetsCycle
          </p>
          <h1 style={{ marginTop: 16, fontSize: 22 }}>Something went wrong</h1>
          <p style={{ color: '#64748b' }}>
            An unexpected error occurred. Please try again.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: 20,
              padding: '10px 22px',
              borderRadius: 9999,
              border: 'none',
              background: '#2f8f57',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
