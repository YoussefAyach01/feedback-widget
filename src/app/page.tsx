import Link from "next/link";

const DEMO = [
  { t: "Mode sombre", d: "En cours", v: 48, on: true },
  { t: "Export PDF des factures", d: "Prévu", v: 31, on: false },
  { t: "Application en arabe", d: "Prévu", v: 22, on: false },
];

export default function Home() {
  return (
    <div>
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <span className="display text-2xl">Retour</span>
        <nav aria-label="Compte" className="flex items-center gap-3 text-sm font-semibold">
          <Link
            href="/login"
            className="flex min-h-11 items-center px-2 underline underline-offset-4"
          >
            Connexion
          </Link>
          <Link href="/signup" className="btn">
            Créer mon compte
          </Link>
        </nav>
      </header>

      <main className="mx-auto grid max-w-5xl gap-10 px-4 pb-16 pt-6 md:grid-cols-2 md:items-center">
        <section>
          <h1 className="display text-[3.2rem] sm:text-[4.6rem]">
            Tes utilisateurs ont des idées. <span className="mark">Écoute-les.</span>
          </h1>
          <p className="mt-6 max-w-md text-lg" style={{ color: "var(--muted)" }}>
            Un bouton d&apos;avis et une roadmap où l&apos;on vote, pour n&apos;importe quel site.
            Une ligne de code, aucune app à installer, en français, en arabe ou en anglais.
          </p>
          <pre className="mono card mt-6 overflow-x-auto text-xs" tabIndex={0}>
            {`<script src="https://retour.app/widget.js"\n  data-key="pk_votre_cle" defer></script>`}
          </pre>
          <Link href="/signup" className="btn mt-6 !min-h-12 !px-6 text-lg">
            Commencer gratuitement
          </Link>
          <p className="mono mt-3 text-xs" style={{ color: "var(--muted)" }}>
            1 projet gratuit · Pro 79 MAD/mois
          </p>
        </section>

        <section aria-label="Aperçu de la roadmap" className="card mx-auto w-full max-w-sm">
          <p className="label">Roadmap publique</p>
          <ul className="list-none p-0">
            {DEMO.map((i) => (
              <li
                key={i.t}
                className="flex items-start gap-3 border-t-2 py-3"
                style={{ borderColor: "var(--ink)" }}
              >
                <span
                  className="mono flex h-14 w-14 flex-none flex-col items-center justify-center rounded-lg border-2 text-sm font-bold"
                  style={{
                    borderColor: "var(--ink)",
                    background: i.on ? "var(--violet)" : "#fff",
                    color: i.on ? "#fff" : "var(--ink)",
                  }}
                >
                  <span aria-hidden="true">▲</span>
                  {i.v}
                </span>
                <span>
                  <b className="display block text-xl">{i.t}</b>
                  <span className="pill mt-1">{i.d}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
