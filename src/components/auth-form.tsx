import Link from "next/link";

export function AuthForm({
  mode,
  action,
  error,
}: {
  mode: "login" | "signup";
  action: (form: FormData) => Promise<void>;
  error?: string;
}) {
  const signup = mode === "signup";
  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <Link href="/" className="display text-2xl underline-offset-4 hover:underline">
        Retour
      </Link>
      <h1 className="display mt-6 text-5xl">{signup ? "Créer mon compte" : "Connexion"}</h1>
      <form action={action} className="card mt-6 space-y-4">
        {error ? (
          <p role="alert" className="border-2 p-2 text-sm font-semibold" style={{ color: "var(--danger)", borderColor: "var(--danger)" }}>
            {error}
          </p>
        ) : null}
        <div>
          <label htmlFor="email" className="label">
            Email
          </label>
          <input id="email" name="email" type="email" className="field" required autoComplete="email" />
        </div>
        <div>
          <label htmlFor="password" className="label">
            Mot de passe
          </label>
          <input id="password" name="password" type="password" className="field" required minLength={signup ? 8 : 1} autoComplete={signup ? "new-password" : "current-password"} />
        </div>
        <button type="submit" className="btn w-full">
          {signup ? "Créer mon compte" : "Me connecter"}
        </button>
      </form>
      <p className="mt-4 text-sm">
        {signup ? (
          <>
            Déjà un compte ? <Link href="/login" className="font-bold underline">Connexion</Link>
          </>
        ) : (
          <>
            Pas encore de compte ? <Link href="/signup" className="font-bold underline">Créer mon compte</Link>
          </>
        )}
      </p>
    </main>
  );
}
