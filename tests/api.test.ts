import { beforeEach, describe, expect, it } from "vitest";
import { openDb } from "@/lib/db";
import { addRoadmapItem, createProject, createUser, updateProject } from "@/lib/repo";
import { GET as roadmapGET, OPTIONS as roadmapOPTIONS } from "@/app/api/public/[key]/roadmap/route";
import { POST as feedbackPOST } from "@/app/api/public/[key]/feedback/route";
import { POST as votePOST } from "@/app/api/public/[key]/vote/route";

type G = { __db?: ReturnType<typeof openDb>; __limiters?: unknown };
let key: string;
let pid: number;
let uid: number;
let itemId: number;

const ctx = (k: string) => ({ params: Promise.resolve({ key: k }) });
const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request(`http://x/api/public/${key}/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

beforeEach(() => {
  const g = globalThis as unknown as G;
  g.__db = openDb(":memory:");
  uid = createUser(g.__db, "o@x.ma", "h");
  const p = createProject(g.__db, uid, "Shop");
  key = p.publicKey;
  pid = p.id;
  itemId = addRoadmapItem(g.__db, pid, {
    title: "<script>alert(1)</script>",
    description: "d",
    status: "planned",
    visible: true,
  });
});

describe("public API", () => {
  it("404s on an unknown key", async () => {
    const res = await roadmapGET(new Request("http://x/api/public/nope/roadmap"), ctx("pk_nope"));
    expect(res.status).toBe(404);
  });

  it("accepts feedback and answers with CORS headers", async () => {
    const res = await feedbackPOST(
      post(
        "feedback",
        { kind: "idea", message: "Nice product", email: "" },
        { origin: "https://any.com" },
      ),
      ctx(key),
    );
    expect(res.status).toBe(201);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
  });

  it("rejects invalid feedback with 400", async () => {
    const res = await feedbackPOST(post("feedback", { kind: "idea", message: "x" }), ctx(key));
    expect(res.status).toBe(400);
    expect((await feedbackPOST(post("feedback", "{not json"), ctx(key))).status).toBe(400);
    expect((await feedbackPOST(post("feedback", "x".repeat(20_000)), ctx(key))).status).toBe(400);
  });

  it("enforces the origin allow-list on every endpoint", async () => {
    const g = globalThis as unknown as G;
    updateProject(g.__db!, uid, pid, {
      name: "Shop",
      accent: "#5b3df5",
      origins: "https://shop.ma",
    });
    const bad = await feedbackPOST(
      post("feedback", { kind: "idea", message: "hello there" }, { origin: "https://evil.com" }),
      ctx(key),
    );
    expect(bad.status).toBe(403);
    const none = await roadmapGET(new Request(`http://x/api/public/${key}/roadmap`), ctx(key));
    expect(none.status).toBe(403);
    const ok = await roadmapGET(
      new Request(`http://x/api/public/${key}/roadmap`, { headers: { origin: "https://shop.ma" } }),
      ctx(key),
    );
    expect(ok.status).toBe(200);
    expect(ok.headers.get("access-control-allow-origin")).toBe("https://shop.ma");
    const pre = await roadmapOPTIONS(
      new Request("http://x", { method: "OPTIONS", headers: { origin: "https://evil.com" } }),
      ctx(key),
    );
    expect(pre.status).toBe(403);
    const preOk = await roadmapOPTIONS(
      new Request("http://x", { method: "OPTIONS", headers: { origin: "https://shop.ma" } }),
      ctx(key),
    );
    expect(preOk.status).toBe(204);
  });

  it("returns roadmap items as JSON data (markup is never interpreted server-side)", async () => {
    const res = await roadmapGET(
      new Request(`http://x/api/public/${key}/roadmap?voter=abcdefgh12`),
      ctx(key),
    );
    const body = await res.json();
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(body.items[0].title).toBe("<script>alert(1)</script>");
    expect(body.project).toEqual({ name: "Shop", accent: "#5b3df5" });
  });

  it("votes, reflects the vote in the next read, and toggles off", async () => {
    const v1 = await (
      await votePOST(post("vote", { itemId, voter: "abcdefgh12" }), ctx(key))
    ).json();
    expect(v1).toEqual({ voted: true, votes: 1 });
    const read = await (
      await roadmapGET(new Request(`http://x/api/public/${key}/roadmap?voter=abcdefgh12`), ctx(key))
    ).json();
    expect(read.items[0]).toMatchObject({ voted: true, votes: 1 });
    const v2 = await (
      await votePOST(post("vote", { itemId, voter: "abcdefgh12" }), ctx(key))
    ).json();
    expect(v2).toEqual({ voted: false, votes: 0 });
    expect(
      (await votePOST(post("vote", { itemId: 999, voter: "abcdefgh12" }), ctx(key))).status,
    ).toBe(404);
    expect((await votePOST(post("vote", { itemId, voter: "x" }), ctx(key))).status).toBe(400);
  });

  it("rate limits feedback spam per IP (429 after 5)", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 7; i++) {
      const r = await feedbackPOST(
        post(
          "feedback",
          { kind: "idea", message: `message ${i}` },
          { "x-forwarded-for": "9.9.9.9" },
        ),
        ctx(key),
      );
      statuses.push(r.status);
    }
    expect(statuses.filter((s) => s === 201)).toHaveLength(5);
    expect(statuses.slice(5)).toEqual([429, 429]);
  });
});
