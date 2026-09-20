import { getDb } from "@/lib/db";
import { guard, preflight, reply } from "@/lib/publicApi";
import { listRoadmap, votedItemIds } from "@/lib/repo";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ key: string }> };

export const OPTIONS = (req: Request, ctx: Ctx) => preflight(req, ctx.params);

export async function GET(req: Request, ctx: Ctx) {
  const g = await guard(req, ctx.params, "read");
  if (g instanceof Response) return g;
  const voterParam = new URL(req.url).searchParams.get("voter") ?? "";
  const voter = /^[A-Za-z0-9_-]{8,64}$/.test(voterParam) ? voterParam : "";
  const db = getDb();
  const voted = voter ? votedItemIds(db, g.project.id, voter) : new Set<number>();
  return reply(
    {
      project: { name: g.project.name, accent: g.project.accent },
      items: listRoadmap(db, g.project.id, true).map((i) => ({
        id: i.id,
        title: i.title,
        description: i.description,
        status: i.status,
        votes: i.votes,
        voted: voted.has(i.id),
      })),
    },
    200,
    g.headers,
  );
}
