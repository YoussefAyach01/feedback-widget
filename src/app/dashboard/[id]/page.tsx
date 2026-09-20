import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { getOwnedProject, listFeedback, listRoadmap } from "@/lib/repo";
import { ROADMAP_STATUSES } from "@/lib/validation";
import { addItem, markFeedback, promote, removeItem, saveItem, saveProject } from "../../actions";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  planned: "Prévu",
  in_progress: "En cours",
  done: "Terminé",
};
const KIND_LABEL: Record<string, string> = { idea: "Idée", bug: "Problème", other: "Autre" };

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const { id } = await params;
  const db = getDb();
  const project = getOwnedProject(db, user.id, Number(id));
  if (!project) notFound();
  const { ok, err } = await searchParams;
  const feedback = listFeedback(db, project.id);
  const items = listRoadmap(db, project.id, false);
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3410";
  const snippet = `<script src="${site}/widget.js" data-key="${project.public_key}" defer></script>`;

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <nav aria-label="Fil d'Ariane">
        <Link href="/dashboard" className="font-semibold underline underline-offset-4">
          Mes projets
        </Link>
      </nav>
      <h1 className="display text-4xl" style={{ overflowWrap: "anywhere" }}>
        <span className="mark">{project.name}</span>
      </h1>
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

      <section aria-labelledby="embed-h" className="card space-y-2">
        <h2 id="embed-h" className="display text-2xl">
          Code à coller
        </h2>
        <p className="text-sm">
          Colle cette ligne avant la balise de fermeture du body de ton site.
        </p>
        <pre
          className="mono overflow-x-auto border-2 p-3 text-xs"
          style={{ borderColor: "var(--ink)" }}
          tabIndex={0}
        >
          {snippet}
        </pre>
        <p className="text-sm">
          Roadmap publique :{" "}
          <Link href={`/roadmap/${project.public_key}`} className="mono font-semibold underline">
            /roadmap/{project.public_key}
          </Link>
        </p>
      </section>

      <section aria-labelledby="inbox-h" className="card space-y-3">
        <h2 id="inbox-h" className="display text-2xl">
          Boîte de réception ({feedback.length})
        </h2>
        {feedback.length === 0 ? (
          <p>Aucun message pour l&apos;instant. Ouvre ton site et envoie le premier pour tester.</p>
        ) : null}
        <ul className="list-none space-y-3 p-0">
          {feedback.map((f) => (
            <li key={f.id} className="border-2 p-3" style={{ borderColor: "var(--ink)" }}>
              <p className="flex flex-wrap items-center gap-2">
                <span className="pill">{KIND_LABEL[f.kind] ?? f.kind}</span>
                {f.status === "new" ? (
                  <span className="pill" style={{ background: "var(--lime)" }}>
                    Nouveau
                  </span>
                ) : null}
                <time className="mono text-xs" dateTime={new Date(f.created_at).toISOString()}>
                  {new Date(f.created_at).toISOString().slice(0, 16).replace("T", " ")}
                </time>
              </p>
              <p className="mt-2 whitespace-pre-wrap" style={{ overflowWrap: "anywhere" }}>
                {f.message}
              </p>
              {f.email ? <p className="mono mt-1 text-xs">{f.email}</p> : null}
              {f.page_url ? (
                <p
                  className="mono mt-1 text-xs"
                  style={{ overflowWrap: "anywhere", color: "var(--muted)" }}
                >
                  {f.page_url}
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <form action={promote}>
                  <input type="hidden" name="projectId" value={project.id} />
                  <input type="hidden" name="id" value={f.id} />
                  <button className="btn" type="submit">
                    Ajouter à la roadmap
                  </button>
                </form>
                {f.status === "new" ? (
                  <form action={markFeedback}>
                    <input type="hidden" name="projectId" value={project.id} />
                    <input type="hidden" name="id" value={f.id} />
                    <input type="hidden" name="status" value="read" />
                    <button className="btn btn-quiet" type="submit">
                      Marquer comme lu
                    </button>
                  </form>
                ) : null}
                <form action={markFeedback}>
                  <input type="hidden" name="projectId" value={project.id} />
                  <input type="hidden" name="id" value={f.id} />
                  <input type="hidden" name="status" value="archived" />
                  <button className="btn btn-quiet" type="submit">
                    Archiver
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="road-h" className="card space-y-4">
        <h2 id="road-h" className="display text-2xl">
          Roadmap
        </h2>
        <ul className="list-none space-y-4 p-0">
          {items.map((i) => (
            <li key={i.id} className="border-2 p-3" style={{ borderColor: "var(--ink)" }}>
              <form action={saveItem} className="space-y-3">
                <input type="hidden" name="projectId" value={project.id} />
                <input type="hidden" name="id" value={i.id} />
                <div>
                  <label className="label" htmlFor={`t${i.id}`}>
                    Titre
                  </label>
                  <input
                    id={`t${i.id}`}
                    name="title"
                    defaultValue={i.title}
                    className="field"
                    required
                    maxLength={120}
                  />
                </div>
                <div>
                  <label className="label" htmlFor={`d${i.id}`}>
                    Description
                  </label>
                  <textarea
                    id={`d${i.id}`}
                    name="description"
                    defaultValue={i.description}
                    className="field"
                    rows={2}
                    maxLength={500}
                  />
                </div>
                <div className="flex flex-wrap items-end gap-4">
                  <div>
                    <label className="label" htmlFor={`s${i.id}`}>
                      Statut
                    </label>
                    <select id={`s${i.id}`} name="status" defaultValue={i.status} className="field">
                      {ROADMAP_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABEL[s]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <label className="flex min-h-11 items-center gap-2">
                    <input
                      type="checkbox"
                      name="visible"
                      defaultChecked={!!i.visible}
                      className="h-5 w-5"
                    />{" "}
                    Visible
                  </label>
                  <span className="mono text-sm">▲ {i.votes}</span>
                </div>
                <button className="btn" type="submit">
                  Enregistrer
                </button>
              </form>
              <form action={removeItem} className="mt-2">
                <input type="hidden" name="projectId" value={project.id} />
                <input type="hidden" name="id" value={i.id} />
                <button
                  className="btn btn-danger"
                  type="submit"
                  aria-label={`Supprimer ${i.title}`}
                >
                  Supprimer
                </button>
              </form>
            </li>
          ))}
        </ul>
        <form
          action={addItem}
          className="space-y-3 border-t-2 pt-4"
          style={{ borderColor: "var(--ink)" }}
        >
          <h3 className="display text-xl">Ajouter un élément</h3>
          <input type="hidden" name="projectId" value={project.id} />
          <input type="hidden" name="status" value="planned" />
          <input type="hidden" name="description" value="" />
          <div>
            <label className="label" htmlFor="new-title">
              Titre
            </label>
            <input id="new-title" name="title" className="field" required maxLength={120} />
          </div>
          <label className="flex min-h-11 items-center gap-2">
            <input type="checkbox" name="visible" defaultChecked className="h-5 w-5" /> Visible dans
            le widget
          </label>
          <button className="btn" type="submit">
            Ajouter
          </button>
        </form>
      </section>

      <section aria-labelledby="set-h" className="card">
        <h2 id="set-h" className="display text-2xl">
          Réglages
        </h2>
        <form action={saveProject} className="mt-3 space-y-3">
          <input type="hidden" name="projectId" value={project.id} />
          <div>
            <label className="label" htmlFor="pname">
              Nom
            </label>
            <input
              id="pname"
              name="name"
              defaultValue={project.name}
              className="field"
              required
              maxLength={60}
            />
          </div>
          <div>
            <label className="label" htmlFor="accent">
              Couleur du bouton
            </label>
            <input
              id="accent"
              name="accent"
              type="text"
              defaultValue={project.accent}
              className="field mono"
              pattern="#[0-9a-fA-F]{6}"
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="origins">
              Sites autorisés (un par ligne, vide = tous)
            </label>
            <textarea
              id="origins"
              name="origins"
              defaultValue={project.origins}
              className="field mono"
              rows={3}
              placeholder="https://monsite.ma"
              aria-describedby="origins-help"
            />
            <p id="origins-help" className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
              Empêche d&apos;autres sites d&apos;utiliser ta clé depuis un navigateur.
            </p>
          </div>
          <button className="btn" type="submit">
            Enregistrer les réglages
          </button>
        </form>
      </section>
    </main>
  );
}
