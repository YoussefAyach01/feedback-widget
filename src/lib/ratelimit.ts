/** Tiny fixed-window in-memory limiter. Fine for one process; use Redis if you scale out. */
export function createLimiter(max: number, windowMs: number, now: () => number = Date.now) {
  const hits = new Map<string, { count: number; reset: number }>();
  return function allow(key: string): boolean {
    const t = now();
    const entry = hits.get(key);
    if (!entry || entry.reset <= t) {
      hits.set(key, { count: 1, reset: t + windowMs });
      if (hits.size > 10_000) for (const [k, v] of hits) if (v.reset <= t) hits.delete(k);
      return true;
    }
    entry.count += 1;
    return entry.count <= max;
  };
}
