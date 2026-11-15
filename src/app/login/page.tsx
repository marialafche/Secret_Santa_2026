import { redirect } from "next/navigation";
import { getUser, safeNext } from "@/lib/data";
import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const next = safeNext((await searchParams).next);
  if (await getUser()) redirect(next);
  return <LoginForm next={next} />;
}
