import { AuthForm } from "@/components/auth-form";
import { login } from "../actions";

export const metadata = { title: "Connexion" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return <AuthForm mode="login" action={login} error={error} />;
}
