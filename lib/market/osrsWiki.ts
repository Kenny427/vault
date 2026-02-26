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

  // Wiki API is occasionally rate limited (429) or returns transient 5xx.
  // Retry a few times with small exponential backoff.
  const maxAttempts = 3;

  let lastStatus: number | null = null;
  let lastBody: string | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
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

    lastStatus = res.status;
    lastBody = await res.text().catch(() => null);

    const isRetryable = res.status === 429 || res.status >= 500;
    if (!isRetryable || attempt === maxAttempts) {
      break;
    }

    const retryAfterHeader = res.headers.get('retry-after');
    const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : NaN;
    const backoffMs = Number.isFinite(retryAfterMs)
      ? Math.max(250, retryAfterMs)
      : 250 * Math.pow(2, attempt - 1);

    await sleep(backoffMs);
  }

  const bodyPreview = lastBody ? ` Body: ${lastBody.slice(0, 200)}` : '';
  throw new Error(`OSRS Wiki request failed (${lastStatus ?? 'unknown'}) for ${path}.${bodyPreview}`);
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

type TimeSeriesPoint = {
  timestamp: number;
  avgHighPrice?: number | null;
  avgLowPrice?: number | null;
  highPriceVolume?: number | null;
  lowPriceVolume?: number | null;
};

export type TimeSeriesStep = '5m' | '1h' | '6h' | '24h';

export async function getTimeSeries(params: { id: number; timestep: TimeSeriesStep }) {
  const { id, timestep } = params;
  const payload = await cachedFetch(`/timeseries?timestep=${encodeURIComponent(timestep)}&id=${encodeURIComponent(String(id))}`, 60);
  return (payload?.data ?? []) as TimeSeriesPoint[];
}
