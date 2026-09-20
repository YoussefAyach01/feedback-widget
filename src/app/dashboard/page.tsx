import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { listProjects } from "@/lib/repo";
import { FREE_PROJECT_LIMIT } from "@/lib/validation";
import { logout, newProject } from "../actions";

export const metadata = { title: "Mes projets" };
export const dynamic = "force-dynamic";

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const projects = listProjects(getDb(), user.id);
  const { ok, err } = await searchParams;
  const full = user.plan !== "pro" && projects.length >= FREE_PROJECT_LIMIT;

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <header className="flex items-center justify-between">
        <span className="display text-3xl">Retour</span>
        <form action={logout}>
          <button className="btn btn-quiet" type="submit">
            Déconnexion
          </button>
        </form>
      </header>
      {ok ? (
        <p role="status" className="card font-semibold" style={{ color: "var(--ok)" }}>
          {ok}
        </p>
      ) : null}
      {err ? (
        <p role="alert" className="card font-semibold" style={{ color: "var(--danger)" }}>
          {err}
        </p>
      ) : null}

      <section aria-labelledby="p-h" className="space-y-4">
        <h1 id="p-h" className="display text-4xl">
          <span className="mark">Mes projets</span>
        </h1>
        {projects.length === 0 ? (
          <p>Crée ton premier projet pour obtenir ton code à coller.</p>
        ) : null}
        <ul className="list-none space-y-3 p-0">
          {projects.map((p) => (
            <li key={p.id}>
              <Link
                href={`/dashboard/${p.id}`}
                className="card flex min-h-14 items-center justify-between gap-3"
              >
                <span className="display text-2xl" style={{ overflowWrap: "anywhere" }}>
                  {p.name}
                </span>
                <span className="mono text-xs" style={{ color: "var(--muted)" }}>
                  {p.public_key}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <form action={newProject} className="card space-y-3">
        <h2 className="display text-2xl">Nouveau projet</h2>
        <div>
          <label htmlFor="name" className="label">
            Nom du site ou du produit
          </label>
          <input id="name" name="name" className="field" required maxLength={60} disabled={full} />
        </div>
        <button className="btn" type="submit" disabled={full}>
          Créer le projet
        </button>
        {full ? (
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Le plan gratuit inclut {FREE_PROJECT_LIMIT} projet. Le paiement Pro n&apos;est pas
            encore configuré.
          </p>
        ) : null}
      </form>
    </main>
  );
}
