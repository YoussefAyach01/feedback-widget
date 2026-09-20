import { AuthForm } from "@/components/auth-form";
import { signup } from "../actions";

export const metadata = { title: "Créer mon compte" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return <AuthForm mode="signup" action={signup} error={error} />;
}
