// Shared fetch helper for third-party data sources. These are all best-effort enrichment
// calls (weather, odds, advanced stats) — a slow/broken upstream should degrade a single
// sync job, not take down the whole cron run, so callers should catch and continue.

const DEFAULT_TIMEOUT_MS = 10_000;

export async function fetchWithTimeout(
  url: string,
  init?: RequestInit,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchText(url: string, init?: RequestInit): Promise<string> {
  const res = await fetchWithTimeout(url, init);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${url}`);
  }
  return res.text();
}

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetchWithTimeout(url, init);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${url}`);
  }
  return res.json() as Promise<T>;
}
