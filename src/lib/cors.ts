/** Parses a textarea of allowed sites into normalised origins ("https://shop.ma"). Returns invalid lines too. */
export function parseOrigins(input: string): { origins: string[]; invalid: string[] } {
  const origins: string[] = [];
  const invalid: string[] = [];
  for (const line of input.split(/[\s,]+/).filter(Boolean)) {
    try {
      const u = new URL(line);
      if ((u.protocol !== "https:" && u.protocol !== "http:") || !u.hostname) throw new Error();
      if (!origins.includes(u.origin)) origins.push(u.origin);
    } catch {
      invalid.push(line);
    }
  }
  return { origins, invalid };
}

/**
 * Decides the CORS answer for a browser request.
 * - empty allow-list: any site may embed the widget (fine for a public feedback box) -> "*"
 * - otherwise the request's Origin must be on the list; it is echoed back (with Vary: Origin)
 * Non-browser clients can fake Origin, so this stops other websites from embedding your key, not attackers.
 */
export function corsFor(stored: string, origin: string | null): Record<string, string> | null {
  const { origins } = parseOrigins(stored);
  const base = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "600",
  };
  if (origins.length === 0) return { ...base, "Access-Control-Allow-Origin": "*" };
  if (!origin || !origins.includes(origin)) return null;
  return { ...base, "Access-Control-Allow-Origin": origin, Vary: "Origin" };
}
