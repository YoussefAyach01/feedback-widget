import { getDb } from "@/lib/db";
import { guard, preflight, readJson, reply } from "@/lib/publicApi";
import { toggleVote } from "@/lib/repo";
import { voteSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ key: string }> };

export const OPTIONS = (req: Request, ctx: Ctx) => preflight(req, ctx.params);

export async function POST(req: Request, ctx: Ctx) {
  const g = await guard(req, ctx.params, "vote");
  if (g instanceof Response) return g;
  const parsed = voteSchema.safeParse(await readJson(req));
  if (!parsed.success) return reply({ error: "invalid" }, 400, g.headers);
  const result = toggleVote(getDb(), g.project.id, parsed.data.itemId, parsed.data.voter);
  if (!result) return reply({ error: "not_found" }, 404, g.headers);
  return reply(result, 200, g.headers);
}
