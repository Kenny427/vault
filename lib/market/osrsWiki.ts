const WIKI_API_ROOT = 'https://prices.runescape.wiki/api/v1/osrs';
const USER_AGENT = process.env.OSRS_WIKI_USER_AGENT ?? 'passive-copilot/1.0';

type LatestEntry = {
  high?: number | null;
  low?: number | null;
  highTime?: number | null;
  lowTime?: number | null;
};

type TimeframeEntry = {
  avgHighPrice?: number | null;
  avgLowPrice?: number | null;
  highPriceVolume?: number | null;
  lowPriceVolume?: number | null;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfterMs(res: Response): number | null {
  const v = res.headers.get('retry-after');
  if (!v) return null;

  // Retry-After can be seconds or an HTTP-date.
  const seconds = Number(v);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);

  const at = Date.parse(v);
  if (!Number.isFinite(at)) return null;

  return Math.max(0, at - Date.now());
}

async function cachedFetch(path: string, revalidate: number) {
  const url = `${WIKI_API_ROOT}${path}`;
  const maxAttempts = 4;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT,
      },
      next: { revalidate },
    });

    if (res.ok) return res.json();

    const retryable =
      res.status === 429 ||
      res.status === 502 ||
      res.status === 503 ||
      res.status === 504;

    if (!retryable || attempt === maxAttempts) {
      throw new Error(`OSRS Wiki request failed (${res.status}) for ${path}`);
    }

    const retryAfterMs = parseRetryAfterMs(res);
    const backoffMs = 250 * 2 ** (attempt - 1);
    await sleep(retryAfterMs ?? backoffMs);
  }

  // Should be unreachable
  throw new Error(`OSRS Wiki request failed (exhausted retries) for ${path}`);
}

export async function getMapping() {
  const payload = await cachedFetch('/mapping', 86400);
  return Array.isArray(payload) ? payload : [];
}

export async function getLatest() {
  const payload = await cachedFetch('/latest', 60);
  return (payload?.data ?? {}) as Record<string, LatestEntry>;
}

export async function getFiveMinute() {
  const payload = await cachedFetch('/5m', 60);
  return (payload?.data ?? {}) as Record<string, TimeframeEntry>;
}

export async function getOneHour() {
  const payload = await cachedFetch('/1h', 300);
  return (payload?.data ?? {}) as Record<string, TimeframeEntry>;
}
