import { getDb } from "@/lib/db";
import { guard, preflight, readJson, reply } from "@/lib/publicApi";
import { addFeedback } from "@/lib/repo";
import { feedbackSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ key: string }> };

export const OPTIONS = (req: Request, ctx: Ctx) => preflight(req, ctx.params);

export async function POST(req: Request, ctx: Ctx) {
  const g = await guard(req, ctx.params, "feedback");
  if (g instanceof Response) return g;
  const parsed = feedbackSchema.safeParse(await readJson(req));
  if (!parsed.success)
    return reply(
      { error: "invalid", issues: parsed.error.issues.map((i) => i.path.join(".")) },
      400,
      g.headers,
    );
  const id = addFeedback(getDb(), g.project.id, parsed.data);
  return reply({ ok: true, id }, 201, g.headers);
}
