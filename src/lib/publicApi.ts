import { getDb } from "./db";
import { corsFor } from "./cors";
import { createLimiter } from "./ratelimit";
import { getProjectByKey, type Project } from "./repo";

const g = globalThis as unknown as {
  __limiters?: Record<string, ReturnType<typeof createLimiter>>;
};
const limiters = (g.__limiters ??= {
  feedback: createLimiter(5, 10 * 60 * 1000),
  vote: createLimiter(40, 10 * 60 * 1000),
  read: createLimiter(300, 60 * 1000),
});

export function reply(data: unknown, status: number, headers: Record<string, string> = {}) {
  return Response.json(data, {
    status,
    headers: { ...headers, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

/** Common front door for every public endpoint: project lookup, CORS, rate limit. */
export async function guard(
  req: Request,
  params: Promise<{ key: string }>,
  bucket: keyof typeof limiters,
): Promise<{ project: Project; headers: Record<string, string> } | Response> {
  const { key } = await params;
  const project = getProjectByKey(getDb(), key);
  if (!project) return reply({ error: "unknown_key" }, 404, { "Access-Control-Allow-Origin": "*" });
  const headers = corsFor(project.origins, req.headers.get("origin"));
  if (!headers) return reply({ error: "origin_not_allowed" }, 403);
  if (!limiters[bucket](`${bucket}:${project.id}:${clientIp(req)}`))
    return reply({ error: "rate_limited" }, 429, headers);
  return { project, headers };
}

export async function preflight(req: Request, params: Promise<{ key: string }>) {
  const { key } = await params;
  const project = getProjectByKey(getDb(), key);
  const headers = project ? corsFor(project.origins, req.headers.get("origin")) : null;
  return new Response(null, { status: headers ? 204 : 403, headers: headers ?? {} });
}

export async function readJson(req: Request): Promise<unknown> {
  const text = await req.text();
  if (text.length > 10_000) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
