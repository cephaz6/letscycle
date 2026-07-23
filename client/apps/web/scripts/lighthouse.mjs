/**
 * Performance/best-practices/SEO/accessibility pass against the production
 * build (docker compose up, same as the E2E suite) — not `next dev`, whose
 * unminified bundles and lack of caching headers would understate real
 * performance.
 *
 * Uses the Chromium Playwright already downloaded for the E2E suite rather
 * than requiring a separate system Chrome install.
 */
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as chromeLauncher from 'chrome-launcher';
import lighthouse from 'lighthouse';

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3001';
const OUT_DIR = 'lighthouse-reports';

/** Playwright's own downloaded Chromium — avoids requiring a separate system
 *  Chrome install just for this script. Cache location varies by OS; Windows
 *  is what this project develops on, macOS/Linux paths are Playwright's
 *  documented defaults for the others. */
function findChromePath() {
  const cacheRoot =
    process.platform === 'win32'
      ? path.join(process.env.LOCALAPPDATA ?? '', 'ms-playwright')
      : process.platform === 'darwin'
        ? path.join(os.homedir(), 'Library', 'Caches', 'ms-playwright')
        : path.join(os.homedir(), '.cache', 'ms-playwright');

  const dirs = readdirSync(cacheRoot).filter(
    (d) => d.startsWith('chromium-') && !d.includes('headless_shell'),
  );
  if (dirs.length === 0) {
    throw new Error(
      `No Playwright chromium build found in ${cacheRoot} — run \`npx playwright install chromium\`.`,
    );
  }
  const binary =
    process.platform === 'win32'
      ? path.join(cacheRoot, dirs[0], 'chrome-win64', 'chrome.exe')
      : process.platform === 'darwin'
        ? path.join(
            cacheRoot,
            dirs[0],
            'chrome-mac',
            'Chromium.app',
            'Contents',
            'MacOS',
            'Chromium',
          )
        : path.join(cacheRoot, dirs[0], 'chrome-linux', 'chrome');
  if (!existsSync(binary)) {
    throw new Error(`Expected a Chromium binary at ${binary} but found none.`);
  }
  return binary;
}

const ROUTES = ['/', '/search', '/how-it-works'];

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const chromePath = findChromePath();
  const chrome = await chromeLauncher.launch({
    chromePath,
    chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu'],
  });

  const results = [];
  try {
    for (const route of ROUTES) {
      const url = `${BASE_URL}${route}`;
      // eslint-disable-next-line no-console -- audit progress, not app logging
      console.log(`Auditing ${url} …`);
      const runnerResult = await lighthouse(url, {
        port: chrome.port,
        output: ['html', 'json'],
        logLevel: 'error',
      });

      const slug = route === '/' ? 'home' : route.replace(/\//g, '_');
      const [html, json] = runnerResult.report;
      writeFileSync(path.join(OUT_DIR, `${slug}.html`), html);
      writeFileSync(path.join(OUT_DIR, `${slug}.json`), json);

      const scores = Object.fromEntries(
        Object.entries(runnerResult.lhr.categories).map(([key, cat]) => [
          key,
          Math.round((cat.score ?? 0) * 100),
        ]),
      );
      results.push({ route, ...scores });
    }
  } finally {
    await chrome.kill();
  }

  // eslint-disable-next-line no-console -- audit output, not app logging
  console.table(results);
  writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify(results, null, 2));
}

main().catch((error) => {
  // eslint-disable-next-line no-console -- audit output, not app logging
  console.error(error);
  process.exitCode = 1;
});
