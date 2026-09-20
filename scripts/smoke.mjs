// End-to-end smoke test against a RUNNING server: `npm run build && npm start`, then `npm run smoke`.
// BASE defaults to http://localhost:3410. Uses a fresh random account each run.
const BASE = process.env.BASE ?? "http://localhost:3410";
const jar = new Map();
let failures = 0;

function check(name, cond, extra = "") {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${cond ? "" : "  " + extra}`);
  if (!cond) failures++;
}

async function req(path, opts = {}) {
  const headers = { ...(opts.headers ?? {}) };
  if (jar.size) headers.cookie = [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
  const res = await fetch(BASE + path, { redirect: "manual", ...opts, headers });
  for (const c of res.headers.getSetCookie?.() ?? []) {
    const [pair] = c.split(";");
    const i = pair.indexOf("=");
    const v = pair.slice(i + 1);
    if (v) jar.set(pair.slice(0, i), v);
    else jar.delete(pair.slice(0, i));
  }
  return res;
}

// Next server actions need the action id, so we drive them through the real HTML forms.
async function actionIdFor(path, formMatch) {
  const html = await (await req(path)).text();
  const forms = [...html.matchAll(/<form[^>]*>[\s\S]*?<\/form>/g)].map((m) => m[0]);
  const form = forms.find((f) => formMatch.test(f));
  return { html, form };
}

async function submit(path, formMatch, fields) {
  const { form } = await actionIdFor(path, formMatch);
  if (!form) throw new Error(`form not found on ${path}`);
  const fd = new FormData();
  // Next encodes the action as hidden inputs named $ACTION_ID_<id> (progressive enhancement).
  for (const m of form.matchAll(/<input[^>]*type="hidden"[^>]*>/g)) {
    const name = /name="([^"]+)"/.exec(m[0])?.[1];
    const value = /value="([^"]*)"/.exec(m[0])?.[1] ?? "";
    if (name) fd.append(name, value.replace(/&quot;/g, '"').replace(/&amp;/g, "&"));
  }
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return req(path, { method: "POST", body: fd });
}

const rnd = Math.random().toString(36).slice(2, 8);
const email = `smoke-${rnd}@example.com`;

check("home 200", (await req("/")).status === 200);
check("health ok", (await (await req("/api/health")).json()).ok === true);
check("widget.js served as javascript", /javascript/.test((await req("/widget.js")).headers.get("content-type") ?? ""));
check("dashboard redirects when logged out", (await req("/dashboard")).status >= 300);

let r = await submit("/signup", /name="email"/, { email, password: "supersecret1" });
check("signup redirects", r.status >= 300 && r.status < 400, String(r.status));

r = await submit("/dashboard", /name="name"/, { name: "Smoke shop" });
const loc = r.headers.get("location") ?? "";
const pid = /\/dashboard\/(\d+)/.exec(loc)?.[1];
check("project created", !!pid, loc);

const page = await (await req(`/dashboard/${pid}`)).text();
const key = /data-key=(?:"|&quot;)(pk_[A-Za-z0-9_-]+)/.exec(page)?.[1];
check("embed snippet shows the public key", !!key);

// Roadmap item via the real form, then hit the public API like a browser on another site would.
r = await submit(`/dashboard/${pid}`, /name="title"[\s\S]*Ajouter/, { title: "Dark <b>mode</b>", visible: "on" });
check("roadmap item added", (r.headers.get("location") ?? "").includes("ok="), r.headers.get("location") ?? "");

const API = `/api/public/${key}`;
const pre = await req(`${API}/feedback`, { method: "OPTIONS", headers: { origin: "https://customer.example", "access-control-request-method": "POST" } });
check("preflight 204 with CORS", pre.status === 204 && !!pre.headers.get("access-control-allow-origin"), String(pre.status));

const savedJar = new Map(jar); jar.clear();
const rm = await (await req(`${API}/roadmap`, { headers: { origin: "https://customer.example" } })).json();
check("public roadmap lists the item as data", rm.items?.[0]?.title === "Dark <b>mode</b>", JSON.stringify(rm));
const fb = await req(`${API}/feedback`, { method: "POST", headers: { "content-type": "application/json", origin: "https://customer.example" }, body: JSON.stringify({ kind: "bug", message: "Button <script>x</script> broken", email: "u@x.co" }) });
check("feedback accepted (201)", fb.status === 201, String(fb.status));
const bad = await req(`${API}/feedback`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "bug", message: "a" }) });
check("invalid feedback rejected (400)", bad.status === 400);
const vote = await (await req(`${API}/vote`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ itemId: rm.items[0].id, voter: "smokevoter12345" }) })).json();
check("vote counted", vote.voted === true && vote.votes === 1, JSON.stringify(vote));
const nokey = await req(`/api/public/pk_doesnotexist/roadmap`);
check("unknown key 404", nokey.status === 404);
for (const [k, v] of savedJar) jar.set(k, v);

const dash = await (await req(`/dashboard/${pid}`)).text();
check("inbox shows the feedback, escaped", dash.includes("Button &lt;script&gt;x&lt;/script&gt; broken") && !dash.includes("<script>x</script>"));
check("hosted roadmap page shows the votes", (await (await req(`/roadmap/${key}`)).text()).includes("Dark &lt;b&gt;mode&lt;/b&gt;"));

console.log(failures ? `\n${failures} FAILED` : "\nall smoke checks passed");
process.exit(failures ? 1 : 0);
