import "server-only";

const WIKI_BASE = "https://prices.runescape.wiki/api/v1/osrs";

type CacheEntry<T> = { value: T; expiresAt: number };

// Best-effort in-memory cache (per serverless instance)
const memCache: Map<string, CacheEntry<any>> = new Map();

function getCache<T>(key: string): T | null {
  const entry = memCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memCache.delete(key);
    return null;
  }
  return entry.value as T;
}

function setCache<T>(key: string, value: T, ttlMs: number) {
  memCache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

async function wikiFetch<T>(path: string, ttlMs: number): Promise<T> {
  const key = `wiki:${path}`;
  const cached = getCache<T>(key);
  if (cached) return cached;

  const res = await fetch(`${WIKI_BASE}${path}`, {
    headers: {
      // OSRS Wiki requests a custom UA; avoid default blocked UAs.
      "User-Agent": "VaultTradingDesk/1.0 (contact: Kenny427)",
      "Accept": "application/json",
    },
    // Next.js fetch cache on server can help too, but we control TTL ourselves.
    cache: "no-store",
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Wiki API ${res.status} ${res.statusText}: ${txt.slice(0, 300)}`);
  }

  const json = (await res.json()) as T;
  setCache(key, json, ttlMs);
  return json;
}

export type WikiMappingItem = {
  id: number;
  name: string;
  members: boolean;
  limit: number | null;
  icon: string;
};

export async function getMapping(): Promise<WikiMappingItem[]> {
  // mapping changes rarely
  // NOTE: the OSRS Wiki `/mapping` endpoint may return either:
  // - an array of items (current behavior)
  // - or an object `{ data: [...] }` (older behavior / some clients)
  const raw = await wikiFetch<any>("/mapping", 1000 * 60 * 60);
  const items: any[] = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];

  return items.map((it) => ({
    id: Number(it.id),
    name: String(it.name),
    members: Boolean(it.members),
    limit: it.limit == null ? null : Number(it.limit),
    icon: String(it.icon || ""),
  }));
}

export type WikiLatestRecord = {
  high: number | null;
  highTime: number | null;
  low: number | null;
  lowTime: number | null;
};

export async function getLatest(): Promise<Record<string, WikiLatestRecord>> {
  // latest is pretty hot; keep short TTL
  const data = await wikiFetch<{ data: Record<string, WikiLatestRecord> }>("/latest", 1000 * 20);
  return data.data || {};
}

export type Wiki1hRecord = {
  avgHighPrice: number | null;
  avgLowPrice: number | null;
  highPriceVolume: number | null;
  lowPriceVolume: number | null;
};

export async function get1h(): Promise<Record<string, Wiki1hRecord>> {
  // 1h bucket changes each hour; but updates can be frequent; moderate TTL
  const data = await wikiFetch<{ data: Record<string, Wiki1hRecord> }>("/1h", 1000 * 60 * 5);
  return data.data || {};
}
