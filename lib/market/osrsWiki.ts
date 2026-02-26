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

async function cachedFetch(path: string, revalidate: number) {
  const url = `${WIKI_API_ROOT}${path}`;
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': USER_AGENT,
        },
        next: { revalidate },
      });

      if (res.ok) {
        return res.json();
      }

      const retryable = res.status === 429 || res.status >= 500;
      if (!retryable || attempt === maxAttempts) {
        throw new Error(`OSRS Wiki request failed (${res.status}) for ${path}`);
      }

      const retryAfter = res.headers.get('retry-after');
      const backoffMs = retryAfter ? Math.max(0, Number(retryAfter) * 1000) : 300 * 2 ** (attempt - 1);
      await sleep(backoffMs);
    } catch (err) {
      if (attempt === maxAttempts) throw err;
      await sleep(300 * 2 ** (attempt - 1));
    }
  }

  throw new Error(`OSRS Wiki request failed (unknown) for ${path}`);
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
