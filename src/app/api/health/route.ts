import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  getDb().prepare("SELECT 1").get();
  return Response.json({ ok: true });
}
