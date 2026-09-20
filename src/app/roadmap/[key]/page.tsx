import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { getProjectByKey, listRoadmap } from "@/lib/repo";

export const dynamic = "force-dynamic";

const GROUPS = [
  { id: "in_progress", label: "En cours" },
  { id: "planned", label: "Prévu" },
  { id: "done", label: "Terminé" },
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ key: string }>;
}): Promise<Metadata> {
  const p = getProjectByKey(getDb(), (await params).key);
  return { title: p ? `Roadmap de ${p.name}` : "Roadmap" };
}

export default async function PublicRoadmap({ params }: { params: Promise<{ key: string }> }) {
  const project = getProjectByKey(getDb(), (await params).key);
  if (!project) notFound();
  const items = listRoadmap(getDb(), project.id, true);
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="display text-5xl" style={{ overflowWrap: "anywhere" }}>
        <span className="mark">{project.name}</span>
      </h1>
      <p className="mt-2" style={{ color: "var(--muted)" }}>
        Ce qu&apos;on construit, et ce que vous avez demandé. Votez depuis le bouton d&apos;avis du
        site.
      </p>
      {items.length === 0 ? <p className="mt-6">Rien de publié pour l&apos;instant.</p> : null}
      {GROUPS.map((g) => {
        const list = items.filter((i) => i.status === g.id);
        if (!list.length) return null;
        return (
          <section key={g.id} aria-labelledby={`g-${g.id}`} className="mt-8">
            <h2 id={`g-${g.id}`} className="label">
              {g.label}
            </h2>
            <ul className="list-none space-y-3 p-0">
              {list.map((i) => (
                <li key={i.id} className="card flex items-start gap-3">
                  <span
                    className="mono flex h-14 w-14 flex-none flex-col items-center justify-center rounded-lg border-2 text-sm font-bold"
                    style={{ borderColor: "var(--ink)" }}
                  >
                    <span aria-hidden="true">▲</span>
                    <span>
                      <span className="sr-only">Votes : </span>
                      {i.votes}
                    </span>
                  </span>
                  <span style={{ overflowWrap: "anywhere" }}>
                    <b className="display block text-xl">{i.title}</b>
                    {i.description ? (
                      <span className="block" style={{ color: "var(--muted)" }}>
                        {i.description}
                      </span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </main>
  );
}
