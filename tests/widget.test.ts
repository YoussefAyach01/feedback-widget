// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

type Widget = {
  mount: (o: Record<string, unknown>) => {
    host: HTMLElement;
    root: ShadowRoot;
    open: () => void;
    close: () => void;
  };
  readableInk: (hex: string) => string;
};
const src = readFileSync(path.resolve(__dirname, "../public/widget.js"), "utf8");
let W: Widget;

const flush = () => new Promise((r) => setTimeout(r, 0));
const jsonRes = (data: unknown, status = 200) =>
  Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(data) });

beforeAll(() => {
  new Function(src)();
  W = (window as unknown as { RetourWidget: Widget }).RetourWidget;
});
beforeEach(() => {
  document.body.innerHTML = "";
});

const EVIL = '<img src=x onerror="window.__pwned=1">';
const ROADMAP = {
  project: { name: "Shop", accent: "#dfff4f" },
  items: [
    {
      id: 1,
      title: EVIL,
      description: "<script>window.__pwned=1</script>",
      status: "planned",
      votes: 3,
      voted: false,
    },
    { id: 2, title: "Dark mode", description: "", status: "in_progress", votes: 1, voted: true },
  ],
};

function setup(fetchImpl: (url: string, init?: RequestInit) => Promise<unknown>, extra = {}) {
  const fetchMock = vi.fn(fetchImpl);
  const w = W.mount({
    base: "https://retour.test",
    key: "pk_abc",
    fetch: fetchMock,
    lang: "en",
    ...extra,
  });
  return { w, fetchMock, $: (s: string) => w.root.querySelector(s) as HTMLElement };
}

describe("widget", () => {
  it("mounts a shadow-DOM host with a launcher button and a hidden panel", () => {
    const { w, $ } = setup(() => jsonRes(ROADMAP));
    expect(document.body.contains(w.host)).toBe(true);
    expect($(".fab").textContent).toBe("Feedback");
    expect($(".fab").getAttribute("aria-expanded")).toBe("false");
    expect(($(".panel") as HTMLElement).hidden).toBe(true);
  });

  it("applies the project's accent and picks readable ink", async () => {
    const { $ } = setup(() => jsonRes(ROADMAP));
    await flush();
    expect($(".wrap").style.getPropertyValue("--accent")).toBe("#dfff4f");
    expect($(".wrap").style.getPropertyValue("--ink")).toBe("#111827"); // lime is light -> dark text
    expect(W.readableInk("#5b3df5")).toBe("#ffffff");
    expect(W.readableInk("garbage")).toBe("#ffffff");
  });

  it("opens with click, reflects aria-expanded, closes on Escape", () => {
    const { $ } = setup(() => jsonRes(ROADMAP));
    $(".fab").click();
    expect(($(".panel") as HTMLElement).hidden).toBe(false);
    expect($(".fab").getAttribute("aria-expanded")).toBe("true");
    $(".panel").dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(($(".panel") as HTMLElement).hidden).toBe(true);
  });

  it("validates before sending, then posts JSON and shows a thank-you", async () => {
    const { $, fetchMock } = setup((url) =>
      url.endsWith("/feedback") ? jsonRes({ ok: true }, 201) : jsonRes(ROADMAP),
    );
    $(".fab").click();
    $("form").dispatchEvent(new Event("submit", { cancelable: true }));
    expect($(".msg.err").textContent).toContain("at least 3");
    ($("#m") as HTMLTextAreaElement).value = "Please add dark mode";
    $("form").dispatchEvent(new Event("submit", { cancelable: true }));
    await flush();
    const call = fetchMock.mock.calls.find(([u]) => (u as string).endsWith("/feedback"))!;
    expect(call[0]).toBe("https://retour.test/api/public/pk_abc/feedback");
    expect(JSON.parse((call[1] as RequestInit).body as string)).toMatchObject({
      kind: "idea",
      message: "Please add dark mode",
    });
    expect($("[role=status]").textContent).toContain("Thank you");
  });

  it("shows a friendly message on rate limiting", async () => {
    const { $ } = setup((url) =>
      url.endsWith("/feedback") ? jsonRes({ error: "rate_limited" }, 429) : jsonRes(ROADMAP),
    );
    $(".fab").click();
    ($("#m") as HTMLTextAreaElement).value = "hello there";
    $("form").dispatchEvent(new Event("submit", { cancelable: true }));
    await flush();
    expect($(".msg.err").textContent).toContain("Too many");
  });

  it("renders roadmap data as TEXT only: markup from the API never becomes elements (XSS)", async () => {
    const { w, $ } = setup(() => jsonRes(ROADMAP));
    $(".fab").click();
    ($(".tabs").children[1] as HTMLElement).click();
    await flush();
    const titles = [...w.root.querySelectorAll(".item b")].map((b) => b.textContent);
    expect(titles).toContain(EVIL);
    expect(w.root.querySelector("img")).toBeNull();
    expect(w.root.querySelector("script")).toBeNull();
    expect((window as unknown as { __pwned?: number }).__pwned).toBeUndefined();
  });

  it("groups by status and toggles a vote optimistically from the server answer", async () => {
    const { w, $, fetchMock } = setup((url) =>
      url.endsWith("/vote") ? jsonRes({ voted: true, votes: 4 }) : jsonRes(ROADMAP),
    );
    $(".fab").click();
    ($(".tabs").children[1] as HTMLElement).click();
    await flush();
    const headings = [...w.root.querySelectorAll("h3")].map((h) => h.textContent);
    expect(headings).toEqual(["In progress", "Planned"]);
    const btn = w.root.querySelectorAll<HTMLElement>(".vote")[1];
    expect(btn.getAttribute("aria-pressed")).toBe("false");
    btn.click();
    await flush();
    expect(btn.getAttribute("aria-pressed")).toBe("true");
    expect(btn.textContent).toContain("4");
    const call = fetchMock.mock.calls.find(([u]) => (u as string).endsWith("/vote"))!;
    expect(JSON.parse((call[1] as RequestInit).body as string)).toMatchObject({ itemId: 1 });
  });

  it("supports Arabic with RTL direction", () => {
    const { $ } = setup(() => jsonRes(ROADMAP), { lang: "ar" });
    expect($(".wrap").getAttribute("dir")).toBe("rtl");
    expect($(".fab").textContent).toBe("رأيك");
  });

  it("survives a failing network without throwing", async () => {
    const { $ } = setup(() => Promise.reject(new Error("offline")));
    await flush();
    $(".fab").click();
    ($(".tabs").children[1] as HTMLElement).click();
    await flush();
    expect($(".msg.err").textContent).toContain("Could not load");
  });
});
