import { beforeEach, describe, expect, it } from "vitest";
import type { DatabaseSync } from "node:sqlite";
import { openDb } from "@/lib/db";
import { corsFor, parseOrigins } from "@/lib/cors";
import { cleanText, feedbackSchema, projectSchema, voteSchema } from "@/lib/validation";
import {
  addFeedback,
  addRoadmapItem,
  createProject,
  createUser,
  deleteRoadmapItem,
  getOwnedProject,
  listFeedback,
  listRoadmap,
  promoteFeedback,
  toggleVote,
  updateProject,
  updateRoadmapItem,
  votedItemIds,
  ConflictError,
} from "@/lib/repo";

describe("parseOrigins / corsFor", () => {
  it("normalises origins and reports invalid lines", () => {
    const r = parseOrigins("https://Shop.ma/path\nhttp://localhost:3000, ftp://x.com, nope");
    expect(r.origins).toEqual(["https://shop.ma", "http://localhost:3000"]);
    expect(r.invalid).toEqual(["ftp://x.com", "nope"]);
  });
  it("allows any origin when the list is empty", () => {
    expect(corsFor("", "https://a.com")?.["Access-Control-Allow-Origin"]).toBe("*");
    expect(corsFor("", null)?.["Access-Control-Allow-Origin"]).toBe("*");
  });
  it("echoes only listed origins and rejects the rest", () => {
    const stored = "https://shop.ma";
    expect(corsFor(stored, "https://shop.ma")?.["Access-Control-Allow-Origin"]).toBe(
      "https://shop.ma",
    );
    expect(corsFor(stored, "https://shop.ma")?.Vary).toBe("Origin");
    expect(corsFor(stored, "https://evil.com")).toBeNull();
    expect(corsFor(stored, "https://shop.ma.evil.com")).toBeNull();
    expect(corsFor(stored, null)).toBeNull();
  });
});

describe("validation", () => {
  it("strips control chars", () => {
    expect(cleanText("  a\u0000b\u0007c\nd ")).toBe("abc\nd");
  });
  it("accepts a normal feedback and defaults optional fields", () => {
    const r = feedbackSchema.parse({ kind: "idea", message: "Add dark mode" });
    expect(r).toMatchObject({ email: "", pageUrl: "" });
  });
  it.each([
    { kind: "hack", message: "hello" },
    { kind: "bug", message: "ab" },
    { kind: "bug", message: "x".repeat(2001) },
    { kind: "bug", message: "hello", email: "not-an-email" },
    {},
  ])("rejects bad feedback %j", (bad) => {
    expect(feedbackSchema.safeParse(bad).success).toBe(false);
  });
  it("keeps markup as inert text (escaping happens at render)", () => {
    const r = feedbackSchema.parse({ kind: "bug", message: "<img src=x onerror=alert(1)>" });
    expect(r.message).toBe("<img src=x onerror=alert(1)>");
  });
  it("validates votes and accent colours", () => {
    expect(voteSchema.safeParse({ itemId: 1, voter: "abcdefgh12" }).success).toBe(true);
    expect(voteSchema.safeParse({ itemId: 1, voter: "short" }).success).toBe(false);
    expect(voteSchema.safeParse({ itemId: "1", voter: "abcdefgh12" }).success).toBe(false);
    expect(projectSchema.safeParse({ name: "x", accent: "red;background:url(x)" }).success).toBe(
      false,
    );
    expect(projectSchema.parse({ name: "x", accent: "#ABCDEF" }).accent).toBe("#abcdef");
  });
});

let db: DatabaseSync;
let alice: { uid: number; pid: number; key: string };
let bob: { uid: number; pid: number; key: string };

beforeEach(() => {
  db = openDb(":memory:");
  const mk = (email: string) => {
    const uid = createUser(db, email, "h");
    const p = createProject(db, uid, "P");
    return { uid, pid: p.id, key: p.publicKey };
  };
  alice = mk("a@x.ma");
  bob = mk("b@x.ma");
});

describe("repo: ownership", () => {
  it("does not let bob read or modify alice's project", () => {
    expect(getOwnedProject(db, bob.uid, alice.pid)).toBeUndefined();
    expect(
      updateProject(db, bob.uid, alice.pid, { name: "hax", accent: "#000000", origins: "" }),
    ).toBe(false);
    expect(getOwnedProject(db, alice.uid, alice.pid)?.name).toBe("P");
  });
  it("scopes roadmap writes to the project", () => {
    const id = addRoadmapItem(db, alice.pid, {
      title: "t",
      description: "",
      status: "planned",
      visible: true,
    });
    const data = { title: "hax", description: "", status: "done", visible: true };
    expect(updateRoadmapItem(db, bob.pid, id, data)).toBe(false);
    expect(deleteRoadmapItem(db, bob.pid, id)).toBe(false);
    expect(listRoadmap(db, alice.pid, false)[0].title).toBe("t");
  });
  it("rejects duplicate emails", () => {
    expect(() => createUser(db, "a@x.ma", "h")).toThrow(ConflictError);
  });
  it("generates unique, unguessable-looking keys", () => {
    expect(alice.key).toMatch(/^pk_[A-Za-z0-9_-]{16}$/);
    expect(alice.key).not.toBe(bob.key);
  });
});

describe("repo: votes", () => {
  it("toggles a vote on and off per voter", () => {
    const id = addRoadmapItem(db, alice.pid, {
      title: "t",
      description: "",
      status: "planned",
      visible: true,
    });
    expect(toggleVote(db, alice.pid, id, "voter-aaaa")).toEqual({ voted: true, votes: 1 });
    expect(toggleVote(db, alice.pid, id, "voter-bbbb")).toEqual({ voted: true, votes: 2 });
    expect(votedItemIds(db, alice.pid, "voter-aaaa").has(id)).toBe(true);
    expect(toggleVote(db, alice.pid, id, "voter-aaaa")).toEqual({ voted: false, votes: 1 });
    expect(votedItemIds(db, alice.pid, "voter-aaaa").has(id)).toBe(false);
  });
  it("cannot vote on another project's or a hidden item", () => {
    const id = addRoadmapItem(db, alice.pid, {
      title: "t",
      description: "",
      status: "planned",
      visible: true,
    });
    const hidden = addRoadmapItem(db, alice.pid, {
      title: "h",
      description: "",
      status: "planned",
      visible: false,
    });
    expect(toggleVote(db, bob.pid, id, "voter-aaaa")).toBeUndefined();
    expect(toggleVote(db, alice.pid, hidden, "voter-aaaa")).toBeUndefined();
    expect(toggleVote(db, alice.pid, 9999, "voter-aaaa")).toBeUndefined();
  });
  it("orders in-progress first, then by votes", () => {
    const a = addRoadmapItem(db, alice.pid, {
      title: "a",
      description: "",
      status: "planned",
      visible: true,
    });
    const b = addRoadmapItem(db, alice.pid, {
      title: "b",
      description: "",
      status: "planned",
      visible: true,
    });
    const c = addRoadmapItem(db, alice.pid, {
      title: "c",
      description: "",
      status: "in_progress",
      visible: true,
    });
    toggleVote(db, alice.pid, b, "voter-aaaa");
    expect(listRoadmap(db, alice.pid, true).map((i) => i.id)).toEqual([c, b, a]);
  });
});

describe("repo: feedback", () => {
  it("promotes a feedback message to a roadmap item and marks it read", () => {
    const f = addFeedback(db, alice.pid, {
      kind: "idea",
      message: "Dark mode please\nit hurts my eyes",
      email: "",
      pageUrl: "",
    });
    const item = promoteFeedback(db, alice.pid, f);
    expect(item).toBeGreaterThan(0);
    expect(listRoadmap(db, alice.pid, true)[0].title).toBe("Dark mode please");
    expect(listFeedback(db, alice.pid)[0].status).toBe("read");
  });
  it("cannot promote another project's feedback", () => {
    const f = addFeedback(db, alice.pid, {
      kind: "idea",
      message: "secret idea",
      email: "",
      pageUrl: "",
    });
    expect(promoteFeedback(db, bob.pid, f)).toBeUndefined();
  });
  it("hides archived feedback from the default list", () => {
    const f = addFeedback(db, alice.pid, {
      kind: "bug",
      message: "broken",
      email: "",
      pageUrl: "",
    });
    db.prepare("UPDATE feedback SET status = 'archived' WHERE id = ?").run(f);
    expect(listFeedback(db, alice.pid)).toHaveLength(0);
    expect(listFeedback(db, alice.pid, true)).toHaveLength(1);
  });
});
